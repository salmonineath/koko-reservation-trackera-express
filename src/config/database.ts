import { prisma } from "@/lib/prisma";

// Serverless Postgres (e.g. Neon) suspends when idle - waking it up can take
// long enough that the very first connection attempt at boot times out even
// though the database is fine and a second attempt moments later succeeds.
// Retrying a few times before giving up avoids treating that cold-start
// latency as a real outage.
const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_RETRY_DELAY_MS = 2_000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (): Promise<void> => {
  for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      // $connect() alone doesn't necessarily open a real pool connection with
      // driver adapters - run a trivial query so a cold/suspended database (and
      // its wake-up latency) is dealt with at boot, not on the first request.
      await prisma.$queryRaw`SELECT 1`;
      console.log("Connected to the database");
      return;
    } catch (error: unknown) {
      const isLastAttempt = attempt === CONNECT_MAX_ATTEMPTS;
      console.error(
        `Database connection attempt ${attempt}/${CONNECT_MAX_ATTEMPTS} failed` +
          (isLastAttempt ? "" : ", retrying..."),
        error,
      );

      if (isLastAttempt) {
        throw new Error("Database connection failed please try again.");
      }
      await wait(CONNECT_RETRY_DELAY_MS);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
