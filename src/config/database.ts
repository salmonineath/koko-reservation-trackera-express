import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
});

export  const prisma = new PrismaClient({ adapter });

export const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("Connected to the database");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
}