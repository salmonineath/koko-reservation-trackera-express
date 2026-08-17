import type { CookieOptions, NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { HttpError } from "@/lib/http-error";
import { loginSchema } from "@/schemas/auth-schema";
import * as authService from "@/services/auth-service";

// Refresh token lives in an HttpOnly cookie - never in a JSON body - so
// frontend JS can never read it (mitigates XSS stealing it). Scoped to the
// /api/auth path so it isn't sent on every /api/reservations request too.
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

// Access token also lives in an HttpOnly cookie so requireAuth can read it
// without the frontend having to hold it in memory and attach it manually
// (see src/middleware/auth-middleware.ts). Still returned in the JSON body
// too, for API clients that prefer the Authorization header. Scoped to "/"
// since, unlike the refresh token, it's needed on every /api/* route.
const ACCESS_COOKIE_NAME = "accessToken";

const baseCookieOptions = {
  httpOnly: true,
  // Cross-site (frontend/backend on different domains) requires Secure +
  // SameSite=None. Locally (http://localhost, same-site across ports)
  // Secure would silently drop the cookie, so dev uses Lax instead.
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
} satisfies CookieOptions;

const refreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: REFRESH_COOKIE_PATH,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
};

// Derives the cookie's maxAge from the token's own `exp` claim instead of
// re-parsing env.ACCESS_TOKEN_EXPIRES_IN, so the cookie can never outlive (or
// undershoot) the JWT it holds.
const accessTokenMaxAge = (token: string): number => {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded === "object" && typeof decoded.exp === "number") {
    return Math.max(decoded.exp * 1000 - Date.now(), 0);
  }
  // Should be unreachable - signAccessToken always sets `exp` - but fall back
  // to a safe short lifetime rather than an undefined (session) cookie.
  return 15 * 60 * 1000;
};

const setAccessCookie = (res: Response, token: string): void => {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...baseCookieOptions,
    path: "/",
    maxAge: accessTokenMaxAge(token),
  });
};

const clearAccessCookie = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(input);
    setRefreshCookie(res, refreshToken);
    setAccessCookie(res, accessToken);
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
    setAccessCookie(res, accessToken);
    res.json({ accessToken, user });
  } catch (error) {
    // Any rejected refresh (missing/invalid/expired/reused) leaves the client
    // holding a cookie that will never work again - clear it so the browser
    // stops sending a dead token on every subsequent request.
    if (error instanceof HttpError && error.statusCode === 401) {
      clearRefreshCookie(res);
      clearAccessCookie(res);
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
    clearAccessCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
