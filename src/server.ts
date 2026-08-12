import express from "express";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "@/config/database";
import { env } from "@/config/env";
import { swaggerSpec } from "@/config/swagger";
import { requireAuth } from "@/middleware/auth-middleware";
import { errorHandler } from "@/middleware/error-handler";
import { authRoutes } from "@/routes/auth-routes";
import { reservationRoutes } from "@/routes/reservation-routes";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API is running",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/reservations", requireAuth, reservationRoutes);

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`API docs on http://localhost:${env.PORT}/api-docs`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});