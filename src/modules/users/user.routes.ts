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
 *                 user: { $ref: '#/components/schemas/AuthUser' }
 *       401:
 *         description: Missing or invalid access token
 *       404:
 *         description: Token valid but the user no longer exists
 */
userRoutes.get("/", getMeController);
