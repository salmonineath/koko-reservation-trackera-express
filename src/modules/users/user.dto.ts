import type { z } from "zod";
import type { createUserSchema, listUsersQuerySchema, updateUserSchema } from "./user.schema";

// --- Input DTOs: what each service operation needs -------------------------
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersQuerySchema>;

// Updating is different: the id comes from the route param, not the request
// body, so the schema alone can't describe what the service needs - the DTO
// has to combine both (mirrors reservation.dto.ts's UpdateReservationDto).
export interface UpdateUserDto {
  id: number;
  changes: z.infer<typeof updateUserSchema>;
}

// Output DTO - explicit response shape for a User. Listed field-by-field so
// it's obvious at a glance what leaves the API - most importantly, that
// passwordHash never does. Adding a column to schema.prisma never silently
// exposes it here.
//
// fullName/username/role are display-only profile fields - null until
// someone sets them (see src/script/seed.ts's optional ADMIN_FULLNAME/
// ADMIN_USERNAME/ADMIN_ROLE). role is a free-form string (not an enum) and
// doesn't gate anything; there's still no permission model (see
// doc/FRONTEND_API_SCOPE.md).
export type UserDto = {
  id: number;
  email: string;
  fullName: string | null;
  username: string | null;
  role: string | null;
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
