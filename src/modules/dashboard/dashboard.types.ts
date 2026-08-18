import type { ReservationSource, ReservationStatus } from "@/generated/prisma/enums";

// Application-only types for the dashboard-stats feature - not a Prisma
// model, not a request/response body copied from a schema, just the shape
// of a computed read-model. This is what belongs in *.types.ts: it's neither
// validation (dashboard.schema.ts) nor a direct DTO of one row.

// null (not 0%) means there's no previous-period baseline to compare against.
export interface StatCard {
  current: number;
  previous: number;
  deltaPercent: number | null;
}

export interface DashboardStatsResult {
  period: {
    // Null when a custom from/to range was requested instead of a single
    // calendar month - a multi-week custom range doesn't reduce to one
    // "YYYY-MM" label.
    month: string | null;
    from: Date;
    to: Date;
  };
  totals: {
    reservations: StatCard;
    completed: StatCard;
    cancelled: StatCard;
    guests: StatCard;
  };
  // count out of the *current* period's total reservations; percent is
  // rounded and 0 (not NaN) when that total is 0.
  bySource: Array<{ source: ReservationSource; count: number; percent: number }>;
  byStatus: Array<{ status: ReservationStatus; count: number; percent: number }>;
}
