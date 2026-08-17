import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse a single PrismaClient (and its underlying pg pool) across hot reloads
// (tsx watch), otherwise every file save opens a new connection pool against Postgres.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// connectionTimeoutMillis needs headroom above pg's ~0/unset default: serverless
// Postgres (e.g. Neon) suspends when idle, and waking it up on the first
// connection in the pool can take a few seconds. Without this, that cold-start
// occasionally loses the race and the very first query after idle fails.
const adapter = new PrismaPg(
  { connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15_000 },
  {
    onPoolError: (error) => console.error("Postgres pool error:", error),
    onConnectionError: (error) => console.error("Postgres connection error:", error),
  },
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
