import { z } from "zod";
import { dateOnlyQueryParam } from "@/shared/date-query.schema";

// Dashboard KPI cards/donuts (see doc/DASHBOARD_SCOPE_REVIEW.md) - deliberately
// NOT the "Reservations Trend" chart or anything social-media/content-related;
// those are out of scope for this release regardless of data availability.
//
// Two ways to pick a period, mutually exclusive:
//  - `month` - quick calendar-month select, defaults to the current month.
//  - `from` + `to` - a custom range (e.g. a date-range picker), both
//    required together so a like-for-like "previous period" of the same
//    length can be computed (see dashboard.service.ts's customRangeBounds).
export const dashboardQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
      .optional(),
    from: dateOnlyQueryParam("from").optional(),
    to: dateOnlyQueryParam("to").optional(),
  })
  .refine((query) => !(query.month && (query.from || query.to)), {
    message: "month cannot be combined with from/to",
    path: ["month"],
  })
  .refine((query) => !query.from === !query.to, {
    message: "from and to must be provided together",
    path: ["from"],
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must be on or before to",
    path: ["from"],
  });
