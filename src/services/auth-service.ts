import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http-error";
import type { LoginInput } from "@/schemas/auth-schema";

const REFRESH_TOKEN_BYTES = 40;

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string; createdAt: Date };
}

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

const issueTokenPair = async (user: {
  id: number;
  email: string;
  createdAt: Date;
}): Promise<AuthResult> => {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email }),
    issueRefreshToken(user.id),
  ]);

  return { accessToken, refreshToken, user };
};

// There is no self-service registration - accounts are provisioned only via
// `npm run db:seed` (see src/script/seed.ts). Any number of accounts can exist;
// this just authenticates whichever ones already do.
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid email or password");
  }

  return issueTokenPair({ id: user.id, email: user.email, createdAt: user.createdAt });
};

// Rotation: every refresh consumes the presented token (revokes it) and issues a
// brand-new one. A presented token that is *already* revoked means it was used
// twice - the first legitimate use already rotated it away, so this second
// presentation is either a replay/theft or a buggy client. Either way, the
// correct response is to burn every active token for that user and force a
// fresh login, not just reject the one request.
export const refresh = async (rawRefreshToken: string): Promise<AuthResult> => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new HttpError(401, "Invalid refresh token");
  }

  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(
      401,
      "Refresh token reuse detected - all sessions revoked, please log in again",
    );
  }

  if (existing.expiresAt < new Date()) {
    throw new HttpError(401, "Refresh token expired, please log in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) {
    throw new HttpError(401, "Invalid refresh token");
  }

  const newRawToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const newExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenHash: hashRefreshToken(newRawToken) },
    }),
    prisma.refreshToken.create({
      data: { tokenHash: hashRefreshToken(newRawToken), userId: user.id, expiresAt: newExpiresAt },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return { accessToken, refreshToken: newRawToken, user };
};

// Idempotent on purpose - logging out with an already-revoked/unknown token
// still just succeeds, so callers never need to special-case "already logged out".
export const logout = async (rawRefreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
