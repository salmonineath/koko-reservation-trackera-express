import { z } from "zod";

// Keep these in sync with prisma/schema.prisma's ReservationSource/ReservationStatus enums.
export const reservationSourceValues = [
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "PHONE_CALL",
  "WALK_IN",
  "INFLUENCER",
  "RETURNING_CUSTOMER",
  "UNKNOWN",
] as const;

export const reservationStatusValues = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export const createReservationSchema = z.object({
  customerName: z.string().trim().min(1, "customerName is required"),
  phone: z.string().trim().min(1, "phone is required"),
  // Accepts an ISO 8601 string (e.g. "2026-05-15T19:00:00Z") combining date + time.
  date: z.coerce.date(),
  guests: z.coerce.number().int().positive(),
  source: z.enum(reservationSourceValues),
  status: z.enum(reservationStatusValues).default("PENDING"),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const updateReservationSchema = createReservationSchema.partial();

export const listReservationsQuerySchema = z.object({
  // Matches customer name or phone (doc 5.1: "Search by customer name or phone number").
  search: z.string().trim().min(1).optional(),
  source: z.enum(reservationSourceValues).optional(),
  status: z.enum(reservationStatusValues).optional(),
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

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
export type DashboardStatsQuery = z.infer<typeof dashboardStatsQuerySchema>;
