import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse a single PrismaClient (and its underlying pg pool) across hot reloads
// (tsx watch), otherwise every file save opens a new connection pool against Postgres.
// This caches the *base* client (pre-$extends below) so re-evaluating this
// module on every hot reload wraps it fresh each time instead of stacking
// another retry layer on top of the previous reload's.
const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

const adapter = new PrismaPg(
  {
    connectionString: env.DATABASE_URL,
    // connectionTimeoutMillis needs headroom above pg's ~0/unset default: serverless
    // Postgres (e.g. Neon) suspends when idle, and waking it up on the first
    // connection in the pool can take a few seconds. Without this, that cold-start
    // occasionally loses the race and the very first query after idle fails.
    connectionTimeoutMillis: 15_000,
    // Neon's pooled endpoint can silently close a connection that's sat idle
    // in our pool for a while - the client-side pool doesn't find out until
    // the next query tries to use it and fails instantly. Closing idle
    // connections ourselves well before that happens means the pool always
    // hands out one it knows is still alive, instead of one that's already
    // dead on arrival. (The retry wrapper below is the backstop for whatever
    // this doesn't catch.)
    idleTimeoutMillis: 10_000,
    // TCP keepalive helps the OS/pg notice a silently-dropped connection
    // instead of only finding out when a query is attempted on it.
    keepAlive: true,
  },
  {
    onPoolError: (error) => console.error("Postgres pool error:", error),
    onConnectionError: (error) => console.error("Postgres connection error:", error),
  },
);

const basePrisma = globalForPrisma.prismaBase ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = basePrisma;
}

// Pulls the error code out of both a top-level Prisma/pg error and the
// nested driver error this project's adapter wraps it in (see the P2002
// handling in user.service.ts for the same nested shape).
const errorCode = (error: unknown): string | undefined =>
  error && typeof error === "object" ? (error as { code?: string }).code : undefined;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Codes/messages that mean "the connection itself is dead" rather than
// "the query is wrong" or "the data conflicts" - safe to retry because a
// connection that's already dead when a query is attempted on it fails
// before anything reaches Postgres, so nothing was partially executed.
const TRANSIENT_CONNECTION_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "08006", // connection_failure
  "08003", // connection_does_not_exist
  "P1001", // Prisma: can't reach database server
  "P1008", // Prisma: operation timed out
  "P1017", // Prisma: server closed the connection
  "P2024", // Prisma: timed out fetching a connection from the pool
]);

const isTransientConnectionError = (error: unknown): boolean => {
  const driverCause = (error as { meta?: { driverAdapterError?: { cause?: unknown } } } | undefined)
    ?.meta?.driverAdapterError?.cause;

  if (TRANSIENT_CONNECTION_CODES.has(errorCode(error) ?? "")) return true;
  if (TRANSIENT_CONNECTION_CODES.has(errorCode(driverCause) ?? "")) return true;

  const message = `${errorMessage(error)} ${driverCause ? errorMessage(driverCause) : ""}`;
  return /connection.*(terminat|clos|reset)|timed out fetching a connection/i.test(message);
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Two different failure modes look identical from here but need different
// handling: (1) a pooled connection Neon silently closed while idle - dead
// on arrival, but a fresh connection is available immediately, so an instant
// retry fixes it; (2) the whole database suspended itself (e.g. the user sat
// on a form for a few minutes before submitting, or it's been a while since
// the last request) - waking it back up can take several seconds. A single
// 2s delayed retry isn't always enough for case 2 in practice (observed a
// real login exhaust 3 attempts - 0ms, 0ms, 2000ms - and still fail); this
// mirrors connectDB's boot-time budget (5 attempts, 2s apart) more closely:
// 2 instant attempts (fixes case 1 immediately), then 2 more with growing
// delays (fixes slower case-2 wake-ups) before finally giving up.
const RETRY_DELAYS_MS = [0, 0, 2_000, 4_000];

// Retries a query if (and only if) it failed because the connection itself
// was dead. Anything else (validation, not-found, unique-constraint
// conflicts, a genuinely bad query) is rethrown immediately and handled the
// normal way. This is what turns the intermittent "works, then 500s, then
// works again" pattern into just... working, at the cost of a short delay
// every once in a while instead of a user-visible error.
export const prisma = basePrisma.$extends({
  name: "retry-on-transient-connection-error",
  query: {
    async $allOperations({ query, args }) {
      for (const [attempt, delayMs] of RETRY_DELAYS_MS.entries()) {
        try {
          if (delayMs > 0) await wait(delayMs);
          return await query(args);
        } catch (error) {
          if (!isTransientConnectionError(error) || attempt === RETRY_DELAYS_MS.length - 1)
            throw error;
          console.warn(
            `Retrying query after transient connection error (attempt ${attempt + 2}/${RETRY_DELAYS_MS.length}):`,
            error,
          );
        }
      }
      // Unreachable - the loop above always either returns or throws - but
      // satisfies the compiler that this async function always resolves/rejects.
      throw new Error("unreachable");
    },
  },
});
