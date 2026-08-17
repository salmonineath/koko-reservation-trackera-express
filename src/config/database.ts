import { prisma } from "@/lib/prisma";

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
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
