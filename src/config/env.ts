import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Access token: short-lived JWT, verified statelessly on every request.
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  // Refresh token: long-lived opaque value, stored (hashed) in the DB and rotated
  // on every use - see the RefreshToken model.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Single browser origin allowed to call this API with credentials (cookies).
  // Required in every environment (not just production) so CORS/cookie
  // behavior is identical between dev and prod - set to your local frontend
  // dev URL (e.g. http://localhost:5173) locally.
  FRONTEND_ORIGIN: z
    .string()
    .url("FRONTEND_ORIGIN must be a valid URL, e.g. http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid enviroment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalied enviroment configration - check your .env file.");
}

export const env = parsed.data;
