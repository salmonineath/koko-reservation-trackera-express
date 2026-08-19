import { z } from "zod";
import { ReservationSource, ReservationStatus } from "@/generated/prisma/enums";
import { dateOnlyQueryParam } from "@/shared/date-query.schema";

// source/status accept exactly the values Prisma's generated enums define -
// z.enum() reads them directly, so a new value added to
// prisma/schema.prisma's enum is accepted here automatically instead of
// needing to be re-typed in a second place.
//
// `status` has no default here - the default only belongs on create (see
// createReservationSchema below). Zod still runs a field's `.default()` for
// an absent key even after `.partial()`, so putting the default directly on
// this shared object would make every PATCH that omits `status` silently
// reset it to PENDING instead of leaving it untouched.
const reservationFields = z.object({
  customerName: z.string().trim().min(1, "customerName is required"),
  phone: z.string().trim().min(1, "phone is required"),
  // Accepts an ISO 8601 string (e.g. "2026-05-15T19:00:00Z") combining date + time.
  date: z.coerce.date(),
  guests: z.coerce.number().int().positive(),
  source: z.enum(ReservationSource),
  status: z.enum(ReservationStatus),
  notes: z.string().trim().min(1).max(500).optional(),
});

export const createReservationSchema = reservationFields.extend({
  status: z.enum(ReservationStatus).default(ReservationStatus.PENDING),
});

export const updateReservationSchema = reservationFields.partial();

export const listReservationsQuerySchema = z
  .object({
    // Matches customer name or phone (doc 5.1: "Search by customer name or phone number").
    search: z.string().trim().min(1).optional(),
    source: z.enum(ReservationSource).optional(),
    status: z.enum(ReservationStatus).optional(),
    // Plain calendar-day strings (YYYY-MM-DD), like from/to below - filters
    // the reservation's own `date`, not createdAt (see from/to for that).
    // Expanded to the first/last instant of that UTC calendar day in
    // reservation.service.ts's buildDateRange, so dateTo is inclusive of the
    // whole day rather than cutting off at midnight.
    dateFrom: dateOnlyQueryParam("dateFrom").optional(),
    dateTo: dateOnlyQueryParam("dateTo").optional(),
    // User-selected date range filter (filters by createdAt, not the
    // reservation's own `date` - see dateFrom/dateTo above for that).
    from: dateOnlyQueryParam("from").optional(),
    to: dateOnlyQueryParam("to").optional(),
    page: z.coerce.number().int().positive().default(1),
    // Design's "12 per page" default on the Reservations list screen.
    limit: z.coerce.number().int().positive().max(100).default(12),
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: "dateFrom must be on or before dateTo",
    path: ["dateFrom"],
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must be on or before to",
    path: ["from"],
  });
