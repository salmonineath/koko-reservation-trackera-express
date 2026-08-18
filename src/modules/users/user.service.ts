import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/shared/errors";
import type { CreateUserDto, ListUsersDto, UpdateUserDto, UserDto } from "./user.dto";
import { toUserDto } from "./user.dto";

// Matches src/script/seed.ts's own SALT_ROUNDS - this is the only other place
// a password is ever hashed.
const SALT_ROUNDS = 10;

// Never select passwordHash - reused across every read/write below so a new
// column added to schema.prisma can't silently leak into a response just
// because a query forgot to narrow it.
const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  username: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Which column(s) tripped the unique constraint. Normally at `meta.target`,
// but this project's Postgres driver adapter instead nests it inside a raw
// driver error - so both shapes are checked before giving up on naming it.
const conflictingFields = (
  meta: Prisma.PrismaClientKnownRequestError["meta"],
): string | undefined => {
  if (!meta) return undefined;
  if (Array.isArray(meta.target)) return meta.target.join(", ");

  const driverError = meta.driverAdapterError as Record<string, unknown> | undefined;
  const cause = driverError?.cause as Record<string, unknown> | undefined;
  const constraint = cause?.constraint as Record<string, unknown> | undefined;
  return Array.isArray(constraint?.fields) ? constraint.fields.join(", ") : undefined;
};

// email and username both carry a DB-level unique constraint - rather than
// pre-checking (which races against a concurrent request), let Postgres
// enforce it and translate the resulting P2002 into a clean 409.
const withUniqueConstraintMapping = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError(`${conflictingFields(error.meta) ?? "field"} already in use`);
    }
    throw error;
  }
};

export const getCurrentUser = async (userId: number): Promise<UserDto> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return toUserDto(user);
};

export const createUser = async (dto: CreateUserDto): Promise<UserDto> => {
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await withUniqueConstraintMapping(() =>
    prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        username: dto.username,
        role: dto.role,
      },
      select: USER_SELECT,
    }),
  );

  return toUserDto(user);
};

const buildUserWhere = (search?: string): Prisma.UserWhereInput => ({
  ...(search && {
    OR: [
      { email: { contains: search, mode: "insensitive" as const } },
      { username: { contains: search, mode: "insensitive" as const } },
      { fullName: { contains: search, mode: "insensitive" as const } },
    ],
  }),
});

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const listUsers = async (dto: ListUsersDto) => {
  const { page, limit, search } = dto;
  const where = buildUserWhere(search);

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data.map(toUserDto),
    pagination: buildPagination(page, limit, total),
  };
};

const getUserOrThrow = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export const getUserById = async (id: number): Promise<UserDto> => {
  return toUserDto(await getUserOrThrow(id));
};

export const updateUser = async (dto: UpdateUserDto): Promise<UserDto> => {
  await getUserOrThrow(dto.id);

  const { password, ...rest } = dto.changes;
  const data: Prisma.UserUpdateInput = {
    ...rest,
    ...(password && { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) }),
  };

  const user = await withUniqueConstraintMapping(() =>
    prisma.user.update({ where: { id: dto.id }, data, select: USER_SELECT }),
  );

  return toUserDto(user);
};

// Also clears the user's refresh token (see RefreshToken's userId FK, which
// is ON DELETE RESTRICT) so deleting an account can't fail with a foreign-key
// violation just because that account happened to be logged in - and so an
// account that no longer exists can't still have a live session.
export const deleteUser = async (id: number): Promise<void> => {
  await getUserOrThrow(id);
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
};
