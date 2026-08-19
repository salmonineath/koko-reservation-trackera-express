import { Router } from "express";
import { getDashboardController } from "./dashboard.controller";

export const dashboardRoutes = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Dashboard KPI cards + donuts (reservation counts/guests, current period vs. previous)
 *     description: >
 *       Reservation-derived stats only - deliberately excludes trend/time-series
 *       data and anything social-media/content related (out of scope this
 *       release, see doc/DASHBOARD_SCOPE_REVIEW.md). Accepts either a quick
 *       `month` select or a custom `from`/`to` range - not both.
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-08" }
 *         description: >
 *           YYYY-MM. Defaults to the current calendar month if neither this
 *           nor from/to is given. Mutually exclusive with from/to.
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date, example: "2026-08-11" }
 *         description: >
 *           Custom range start (YYYY-MM-DD, inclusive). Must be provided
 *           together with `to`. Mutually exclusive with `month`.
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date, example: "2026-08-18" }
 *         description: >
 *           Custom range end (YYYY-MM-DD, inclusive). Must be provided
 *           together with `from`. The comparison "previous" period is the
 *           immediately preceding range of the same length (e.g. Aug 11-18
 *           compares against Aug 3-10).
 *     responses:
 *       200:
 *         description: Dashboard stats for the requested period vs. the immediately preceding period of the same length
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       400:
 *         description: >
 *           Validation failed - bad month/from/to format, from after to,
 *           from/to given without the other, or month combined with from/to
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
dashboardRoutes.get("/", getDashboardController);
