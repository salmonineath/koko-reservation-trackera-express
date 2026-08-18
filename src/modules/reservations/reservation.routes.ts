import { Router } from "express";
import {
  createReservationController,
  deleteReservationController,
  getReservationByIdController,
  getReservationStatsController,
  listReservationsController,
  updateReservationController,
} from "./reservation.controller";

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
reservationRoutes.post("/", createReservationController);

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
 *         name: from
 *         schema: { type: string, format: date, example: "2026-08-12" }
 *         description: >
 *           Filters by createdAt (record creation date), not the reservation's
 *           own date - see dateFrom above for that. YYYY-MM-DD, inclusive,
 *           expanded to the start of that UTC calendar day.
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date, example: "2026-08-18" }
 *         description: >
 *           Filters by createdAt (record creation date), not the reservation's
 *           own date - see dateTo above for that. YYYY-MM-DD, inclusive,
 *           expanded to the end of that UTC calendar day.
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
 *       400:
 *         description: Validation failed (e.g. bad from/to format, or from after to)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
reservationRoutes.get("/", listReservationsController);

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
reservationRoutes.get("/stats", getReservationStatsController);

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
reservationRoutes.get("/:id", getReservationByIdController);

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
reservationRoutes.patch("/:id", updateReservationController);

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
reservationRoutes.delete("/:id", deleteReservationController);
