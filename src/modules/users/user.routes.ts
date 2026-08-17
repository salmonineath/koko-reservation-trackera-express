import { Router } from "express";
import { getMeController } from "./user.controller";

export const userRoutes = Router();

/**
 * @openapi
 * /me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     email: { type: string, example: "you@example.com" }
 *                     createdAt: { type: string, format: date-time }
 *       401:
 *         description: Missing or invalid access token
 *       404:
 *         description: Token valid but the user no longer exists
 */
userRoutes.get("/", getMeController);
