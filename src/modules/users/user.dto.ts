import type { UserRole } from "@/generated/prisma/enums";

// Output DTO - explicit response shape for a User. Listed field-by-field so
// it's obvious at a glance what leaves the API - most importantly, that
// passwordHash never does. Adding a column to schema.prisma never silently
// exposes it here.
//
// fullName/username/role are display-only profile fields - null until
// someone sets them (see src/script/seed.ts's optional ADMIN_FULLNAME/
// ADMIN_USERNAME/ADMIN_ROLE). role doesn't gate anything; there's still no
// permission model (see doc/FRONTEND_API_SCOPE.md).
export type UserDto = {
  id: number;
  email: string;
  fullName: string | null;
  username: string | null;
  role: UserRole | null;
  createdAt: Date;
};

// Accepts anything with at least these fields (e.g. a Prisma `select` result
// that already omits passwordHash) rather than requiring the full User model.
export const toUserDto = (user: UserDto): UserDto => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
});
