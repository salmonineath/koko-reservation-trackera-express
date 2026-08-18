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

// Rejects e.g. "2026-02-30" - the regex alone lets it through, but `Date`
// silently rolls it over to March 2nd instead of treating it as invalid, so
// the calendar fields have to be checked back against the parsed date.
const isValidCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

// Plain calendar-day string (YYYY-MM-DD), not a full timestamp - the
// from/end-of-day expansion into an actual createdAt range happens in
// reservation.service.ts's buildReservationWhere.
const dateOnlyQueryParam = (fieldName: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName} must be in YYYY-MM-DD format`)
    .refine(isValidCalendarDate, `${fieldName} is not a valid calendar date`);

export const listReservationsQuerySchema = z
  .object({
    // Matches customer name or phone (doc 5.1: "Search by customer name or phone number").
    search: z.string().trim().min(1).optional(),
    source: z.enum(ReservationSource).optional(),
    status: z.enum(ReservationStatus).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    // User-selected date range filter (filters by createdAt, not the
    // reservation's own `date` - see dateFrom/dateTo above for that).
    from: dateOnlyQueryParam("from").optional(),
    to: dateOnlyQueryParam("to").optional(),
    page: z.coerce.number().int().positive().default(1),
    // Design's "12 per page" default on the Reservations list screen.
    limit: z.coerce.number().int().positive().max(100).default(12),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must be on or before to",
    path: ["from"],
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
