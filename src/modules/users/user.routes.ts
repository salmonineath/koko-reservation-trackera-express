import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  getMeController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from "./user.controller";

// GET /me only - the authenticated caller's own profile. Kept as its own
// router (mounted at /me in src/routes/index.ts) since it takes no id and
// isn't part of the id-based CRUD below.
export const meRoutes = Router();

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
meRoutes.get("/", getMeController);

// Full CRUD over user accounts (mounted at /users in src/routes/index.ts).
// Every logged-in account can manage every other account - there's still no
// permission model (see doc/FRONTEND_API_SCOPE.md).
export const userRoutes = Router();

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUser'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email or username already in use
 */
userRoutes.post("/", createUserController);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List user accounts (search, paginate)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches email, username, or full name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Paginated list of user accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AuthUser' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
userRoutes.get("/", listUsersController);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user account by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUser'
 *       404:
 *         description: User not found
 */
userRoutes.get("/:id", getUserByIdController);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user account
 *     description: >
 *       Only the fields provided are changed. Omitting password leaves the
 *       existing one untouched; providing one re-hashes and replaces it.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/UserInput'
 *           example: { fullName: "Jane Doe" }
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUser'
 *       404:
 *         description: User not found
 *       409:
 *         description: Email or username already in use
 */
userRoutes.patch("/:id", updateUserController);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user account
 *     description: >
 *       Also clears that account's refresh token, ending its active session.
 *       Deleting your own account is rejected (would lock you out - there's
 *       no self-service registration, see doc/FRONTEND_API_SCOPE.md).
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: User deleted
 *       400:
 *         description: Cannot delete your own account
 *       404:
 *         description: User not found
 */
userRoutes.delete("/:id", deleteUserController);
