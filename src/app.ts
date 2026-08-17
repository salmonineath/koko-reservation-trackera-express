import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "@/config/env";
import { swaggerSpec } from "@/config/swagger";
import { errorHandler } from "@/middleware/error.middleware";
import { apiRouter } from "@/routes";
import { ForbiddenError } from "@/shared/errors";

// This file only builds and configures the Express app. It doesn't listen on
// a port or touch the database - see server.ts for that. Keeping them apart
// means the app can be imported (e.g. by a future test suite) without
// booting a real server.
export const app = express();

// Needed so express-rate-limit and req.ip see the real client IP when deployed
// behind a reverse proxy (nginx, Render, Railway, ...) instead of the proxy's
// own address. Only trusted in production - trusting it in local dev would let
// a client spoof its own IP via X-Forwarded-For.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());

// Only the configured frontend origin may call this API, and only with
// credentials enabled (the refresh-token cookie requires it) - never "*".
// A validator function (rather than a static origin string) means the
// Access-Control-Allow-Origin header is only ever emitted when the request's
// origin actually matches - a mismatched origin gets no such header at all,
// instead of a header reflecting a value that doesn't match its own request.
app.use(
  cors({
    origin: (origin, callback) => {
      // `origin` is undefined for non-browser requests (curl, server-to-server
      // calls, health checks) - CORS is a browser-only mechanism, so those
      // aren't meaningfully restricted by it either way.
      if (!origin || origin === env.FRONTEND_ORIGIN) {
        callback(null, true);
        return;
      }
      callback(new ForbiddenError("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    message: "API is running",
  });
});

// Swagger exposes route/schema details - keep it out of production. CSP is
// disabled for this route only (not globally) because helmet's default CSP
// blocks the inline scripts swagger-ui-express relies on to render.
if (env.NODE_ENV !== "production") {
  app.use(
    "/api-docs",
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec),
  );
}

app.use("/api", apiRouter);

app.use(errorHandler);
