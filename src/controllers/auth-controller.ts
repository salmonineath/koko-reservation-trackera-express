import type { CookieOptions, NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http-error";
import { loginSchema } from "@/schemas/auth-schema";
import * as authService from "@/services/auth-service";

// Refresh token lives in an HttpOnly cookie - never in a JSON body - so
// frontend JS can never read it (mitigates XSS stealing it). Scoped to the
// /api/auth path so it isn't sent on every /api/reservations request too.
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  // Cross-site (frontend/backend on different domains) requires Secure +
  // SameSite=None. Locally (http://localhost, same-site across ports)
  // Secure would silently drop the cookie, so dev uses Lax instead.
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  path: REFRESH_COOKIE_PATH,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(input);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new HttpError(401, "Missing refresh token");
    }

    const { accessToken, refreshToken, user } = await authService.refresh(rawRefreshToken);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (error) {
    // Any rejected refresh (missing/invalid/expired/reused) leaves the client
    // holding a cookie that will never work again - clear it so the browser
    // stops sending a dead token on every subsequent request.
    if (error instanceof HttpError && error.statusCode === 401) {
      clearRefreshCookie(res);
    }
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
