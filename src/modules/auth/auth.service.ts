import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { toUserDto, type UserDto } from "@/modules/users/user.dto";
import { UnauthorizedError } from "@/shared/errors";
import type { LoginDto } from "./auth.dto";
import type { AuthResult, AuthTokenPayload } from "./auth.types";

const REFRESH_TOKEN_BYTES = 40;

const signAccessToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

// Refresh tokens are opaque random values, NOT JWTs - only their hash is ever
// persisted, so a DB dump alone can't be replayed as a working token.
const hashRefreshToken = (raw: string): string => createHash("sha256").update(raw).digest("hex");

const issueRefreshToken = async (userId: number): Promise<string> => {
  const raw = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { tokenHash: hashRefreshToken(raw), userId, expiresAt },
  });

  return raw;
};

const issueTokenPair = async (user: UserDto): Promise<AuthResult> => {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email }),
    issueRefreshToken(user.id),
  ]);

  return { accessToken, refreshToken, user };
};

// There is no self-service registration - accounts are provisioned only via
// `npm run db:seed` (see src/script/seed.ts). Any number of accounts can exist;
// this just authenticates whichever ones already do.
//
// Self-healing: any refresh tokens already on file for this user are cleared
// before issuing a fresh one, so exactly one row per user always survives even
// if a previous session was never cleanly logged out.
export const login = async (dto: LoginDto): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  return issueTokenPair(toUserDto(user));
};

// Rotation: every refresh consumes the presented token (deletes its row) and
// issues a brand-new one in its place, so there is always exactly one
// refresh-token row per user - never an accumulating history.
export const refresh = async (rawRefreshToken: string): Promise<AuthResult> => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (existing.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: existing.id } });
    throw new UnauthorizedError("Refresh token expired, please log in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, email: true, fullName: true, username: true, role: true, createdAt: true },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const userDto = toUserDto(user);
  const newRawToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const newExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: existing.id } }),
    prisma.refreshToken.create({
      data: { tokenHash: hashRefreshToken(newRawToken), userId: user.id, expiresAt: newExpiresAt },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return { accessToken, refreshToken: newRawToken, user: userDto };
};

// Idempotent on purpose - logging out with an already-removed/unknown token
// still just succeeds, so callers never need to special-case "already logged out".
export const logout = async (rawRefreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
};
