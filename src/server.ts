import { app } from "@/app";
import { connectDB } from "@/config/database";
import { env } from "@/config/env";

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    if (env.NODE_ENV !== "production") {
      console.log(`API docs on http://localhost:${env.PORT}/api-docs`);
    }
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
