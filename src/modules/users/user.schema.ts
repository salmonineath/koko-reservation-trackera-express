import { z } from "zod";

// Matches src/script/seed.ts's own ADMIN_PASSWORD rule ("must be at least 8
// characters") and is the only other place a plaintext password is ever
// accepted (see auth.service.ts's login for the bcrypt comparison side).
const passwordSchema = z.string().min(8, "password must be at least 8 characters");

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email address"),
  password: passwordSchema,
  fullName: z.string().trim().min(1).optional(),
  username: z.string().trim().min(1).optional(),
  // Free-form display label, not an enum - see user.dto.ts. Doesn't gate anything.
  role: z.string().trim().min(1).optional(),
});

// Same fields, all optional - update only touches what's provided. A missing
// password leaves the existing passwordHash untouched (see user.service.ts).
export const updateUserSchema = createUserSchema.partial();

export const listUsersQuerySchema = z.object({
  // Matches email, username, or full name.
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});
