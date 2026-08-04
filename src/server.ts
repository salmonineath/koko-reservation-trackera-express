import express from "express";
import { connectDB } from "@/config/database";
import { env } from "@/config/env";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API is running",
  });
});

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});