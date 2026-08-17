import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http-error";
import type { AuthTokenPayload } from "@/services/auth-service";

// Basic auth: any request without a valid JWT is rejected. There is no
// role/permission model - this is "logged in or not," not "allowed to do X
// or not." Tighten further as needed.
//
// The access token is accepted from either the Authorization header (API
// clients) or the accessToken cookie set by src/controllers/auth-controller.ts
// (browser clients that don't want to hold it in memory). Because the cookie
// path lets a browser send it automatically on a cross-site request, routes
// mounted behind this middleware pair it with requireCsrfHeader (see
// src/server.ts) so a forged request still can't ride the cookie.
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : req.cookies?.accessToken;

  if (!token) {
    next(new HttpError(401, "Missing or malformed Authorization header"));
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as unknown as AuthTokenPayload;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
};
