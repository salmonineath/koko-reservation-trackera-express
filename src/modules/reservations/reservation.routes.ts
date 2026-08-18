import { Router } from "express";
import {
  createReservationController,
  deleteReservationController,
  getReservationByIdController,
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
 *         schema: { type: string, format: date, example: "2026-08-12" }
 *         description: >
 *           Filters by the reservation's own date, not createdAt - see from
 *           below for that. YYYY-MM-DD, inclusive, expanded to the start of
 *           that UTC calendar day.
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date, example: "2026-08-18" }
 *         description: >
 *           Filters by the reservation's own date, not createdAt - see to
 *           below for that. YYYY-MM-DD, inclusive, expanded to the end of
 *           that UTC calendar day.
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
