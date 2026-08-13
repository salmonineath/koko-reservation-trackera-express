import { Router } from "express";
import * as authController from "@/controllers/auth-controller";
import { loginRateLimiter, refreshRateLimiter } from "@/middleware/rate-limit";

export const authRoutes = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive an access token (refresh token is set as an HttpOnly cookie)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthCredentials'
 *     responses:
 *       200:
 *         description: >
 *           Logged in. Response body has accessToken + user; the refresh token
 *           is sent via `Set-Cookie` (HttpOnly, path=/api/auth) - never in the body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Too many login attempts
 */
authRoutes.post("/login", loginRateLimiter, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange the refresh-token cookie for a new access + refresh token pair
 *     description: >
 *       Rotation: the refresh token read from the HttpOnly cookie is revoked as part
 *       of this call and a new one is set via `Set-Cookie`. Presenting an
 *       already-revoked token is treated as token reuse/theft and revokes every
 *       active refresh token for the account.
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: true
 *         schema: { type: string }
 *         description: HttpOnly refresh-token cookie set by /auth/login or a previous /auth/refresh.
 *     responses:
 *       200:
 *         description: New token pair issued (accessToken in body, refreshToken via Set-Cookie)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Missing, invalid, expired, or reused refresh token
 *       429:
 *         description: Too many refresh attempts
 */
authRoutes.post("/refresh", refreshRateLimiter, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the refresh-token cookie (idempotent)
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: false
 *         schema: { type: string }
 *         description: HttpOnly refresh-token cookie. Missing/already-invalid still succeeds.
 *     responses:
 *       204:
 *         description: Token revoked and cookie cleared (or was already invalid/absent - still succeeds)
 */
authRoutes.post("/logout", authController.logout);
