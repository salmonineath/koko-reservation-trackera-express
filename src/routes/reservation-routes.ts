import { Router } from "express";
import * as reservationController from "@/controllers/reservation-controller";

export const reservationRoutes = Router();

/**
 * @openapi
 * /reservations:
 *   post:
 *     summary: Create a reservation
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       201:
 *         description: Reservation created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
reservationRoutes.post("/", reservationController.create);

/**
 * @openapi
 * /reservations:
 *   get:
 *     summary: List reservations (search, filter, paginate)
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches customer name or phone number
 *       - in: query
 *         name: source
 *         schema: { $ref: '#/components/schemas/ReservationSource' }
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/ReservationStatus' }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Paginated list of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Reservation' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
reservationRoutes.get("/", reservationController.list);

/**
 * @openapi
 * /reservations/stats:
 *   get:
 *     summary: Dashboard KPI cards + donuts (reservation counts/guests, this month vs last)
 *     description: >
 *       Reservation-derived stats only - deliberately excludes trend/time-series
 *       data and anything social-media/content related (out of scope this
 *       release, see doc/DASHBOARD_SCOPE_REVIEW.md).
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-05" }
 *         description: YYYY-MM. Defaults to the current calendar month.
 *     responses:
 *       200:
 *         description: Dashboard stats for the requested month vs the previous month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       400:
 *         description: Validation failed (bad month format)
 */
reservationRoutes.get("/stats", reservationController.getStats);

/**
 * @openapi
 * /reservations/{id}:
 *   get:
 *     summary: Get a reservation by id
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reservation found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       404:
 *         description: Reservation not found
 */
reservationRoutes.get("/:id", reservationController.getById);

/**
 * @openapi
 * /reservations/{id}:
 *   patch:
 *     summary: Update a reservation
 *     tags: [Reservations]
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
 *               - $ref: '#/components/schemas/ReservationInput'
 *           example: { status: CONFIRMED }
 *     responses:
 *       200:
 *         description: Reservation updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       404:
 *         description: Reservation not found
 */
reservationRoutes.patch("/:id", reservationController.update);

/**
 * @openapi
 * /reservations/{id}:
 *   delete:
 *     summary: Delete a reservation
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Reservation deleted
 *       404:
 *         description: Reservation not found
 */
reservationRoutes.delete("/:id", reservationController.remove);
