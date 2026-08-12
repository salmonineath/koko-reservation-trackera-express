import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient};

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
    globalForPrisma.prisma =  prisma;
}

export const connectDB = async (): Promise<void> => {
    try {
        // $connect() alone doesn't necessarily open a real pool connection with
        // driver adapters - run a trivial query so a cold/suspended database (and
        // its wake-up latency) is dealt with at boot, not on the first request.
        await prisma.$queryRaw`SELECT 1`;
        console.log("Connected to the database");
    } catch (error: unknown) {
        console.error("Error connection to the database:", error);
        process.exit(1);
    }
}

export const disconnectDB = async (): Promise<void> => {
    await prisma.$disconnect();
}