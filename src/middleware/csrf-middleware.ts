import type { NextFunction, Request, Response } from "express";
import { HttpError } from "@/lib/http-error";

// Cross-site requests (forged forms, <img> tags, etc.) cannot set custom
// headers - only your own frontend's fetch/axios calls can. Requiring this
// header on state-changing routes blocks CSRF without needing a token.
const CSRF_HEADER = "x-requested-with";
const CSRF_HEADER_VALUE = "XMLHttpRequest";

export const requireCsrfHeader = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
    next(new HttpError(403, "Missing or invalid CSRF header"));
    return;
  }

  next();
};
