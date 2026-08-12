import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http-error";
import type { AuthTokenPayload } from "@/services/auth-service";

// Basic bearer-token auth: any request without a valid JWT is rejected. There is
// no role/permission model - this is "logged in or not," not "allowed to do X
// or not." Tighten further as needed.
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthTokenPayload;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
};
