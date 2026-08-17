import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "@/shared/errors";

// Cross-site requests (forged forms, <img> tags, etc.) cannot set custom
// headers - only your own frontend's fetch/axios calls can. Requiring this
// header on state-changing routes blocks CSRF without needing a token.
const CSRF_HEADER = "x-requested-with";
const CSRF_HEADER_VALUE = "XMLHttpRequest";

export const requireCsrfHeader = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
    next(new ForbiddenError("Missing or invalid CSRF header"));
    return;
  }

  next();
};

// requireAuth accepts the accessToken cookie as well as the Authorization
// header (see auth.middleware.ts). That cookie rides along on any cross-site
// request automatically, so state-changing requests are guarded by
// requireCsrfHeader first, to block forged requests that can't set our
// custom header. GETs are read-only, so they're left unguarded.
export const requireCsrfForMutations = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === "GET") {
    next();
    return;
  }
  requireCsrfHeader(req, res, next);
};
