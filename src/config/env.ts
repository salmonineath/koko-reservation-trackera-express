import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    DATABASE_URL,
};