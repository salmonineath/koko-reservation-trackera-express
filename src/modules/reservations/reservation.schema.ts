import { z } from "zod";
import { ReservationSource, ReservationStatus } from "@/generated/prisma/enums";

// source/status accept exactly the values Prisma's generated enums define -
// z.enum() reads them directly, so a new value added to
// prisma/schema.prisma's enum is accepted here automatically instead of
// needing to be re-typed in a second place.
export const createReservationSchema = z.object({
  customerName: z.string().trim().min(1, "customerName is required"),
  phone: z.string().trim().min(1, "phone is required"),
  // Accepts an ISO 8601 string (e.g. "2026-05-15T19:00:00Z") combining date + time.
  date: z.coerce.date(),
  guests: z.coerce.number().int().positive(),
  source: z.enum(ReservationSource),
  status: z.enum(ReservationStatus).default(ReservationStatus.PENDING),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const updateReservationSchema = createReservationSchema.partial();

export const listReservationsQuerySchema = z.object({
  // Matches customer name or phone (doc 5.1: "Search by customer name or phone number").
  search: z.string().trim().min(1).optional(),
  source: z.enum(ReservationSource).optional(),
  status: z.enum(ReservationStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  // Design's "12 per page" default on the Reservations list screen.
  limit: z.coerce.number().int().positive().max(100).default(12),
});

// Dashboard KPI cards/donuts (see doc/DASHBOARD_SCOPE_REVIEW.md) - deliberately
// NOT the "Reservations Trend" chart or anything social-media/content-related;
// those are out of scope for this release regardless of data availability.
export const dashboardStatsQuerySchema = z.object({
  // Defaults to the current calendar month if omitted.
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
    .optional(),
});
