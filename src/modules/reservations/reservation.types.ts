import type { ReservationSource, ReservationStatus } from "@/generated/prisma/enums";

// Application-only types for the dashboard-stats feature - not a Prisma model,
// not a request/response body copied from a schema, just the shape of a
// computed read-model. This is what belongs in *.types.ts: it's neither
// validation (reservation.schema.ts) nor a direct DTO of one row
// (reservation.dto.ts).

// null (not 0%) means there's no previous-period baseline to compare against.
export interface StatCard {
  current: number;
  previous: number;
  deltaPercent: number | null;
}

export interface DashboardStatsResult {
  period: { month: string; from: Date; to: Date };
  totals: {
    reservations: StatCard;
    cancelled: StatCard;
    guests: StatCard;
  };
  bySource: Array<{ source: ReservationSource; count: number }>;
  byStatus: Array<{ status: ReservationStatus; count: number }>;
}
