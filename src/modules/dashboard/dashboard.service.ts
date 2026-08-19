import { prisma } from "@/lib/prisma";
import type { DashboardQueryDto } from "./dashboard.dto";
import type { DashboardStatsResult, StatCard } from "./dashboard.types";

// Dashboard KPI cards/donuts only (see doc/DASHBOARD_SCOPE_REVIEW.md) -
// deliberately excludes trend/time-series and anything social-media/content
// related, since those are out of scope for this release regardless of
// whether the data existed.

interface PeriodBounds {
  from: Date;
  to: Date; // exclusive
}

const monthBounds = (
  month?: string,
): { current: PeriodBounds; previous: PeriodBounds; monthLabel: string } => {
  const now = new Date();
  const [year, monthNum] = month
    ? (month.split("-").map(Number) as [number, number])
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  return {
    current: {
      from: new Date(Date.UTC(year, monthNum - 1, 1)),
      to: new Date(Date.UTC(year, monthNum, 1)),
    },
    previous: {
      from: new Date(Date.UTC(year, monthNum - 2, 1)),
      to: new Date(Date.UTC(year, monthNum - 1, 1)),
    },
    monthLabel: `${year}-${String(monthNum).padStart(2, "0")}`,
  };
};

// `from`/`to` are calendar-day strings (YYYY-MM-DD, inclusive - validated in
// dashboard.schema.ts). The "previous" period is the immediately preceding
// range of the *same length*, not a fixed calendar month - so a week
// selected Aug 11-18 compares against Aug 3-10, matching a date-range picker
// rather than a month stepper.
const customRangeBounds = (
  from: string,
  to: string,
): { current: PeriodBounds; previous: PeriodBounds } => {
  const currentFrom = new Date(`${from}T00:00:00.000Z`);
  // Exclusive upper bound - the instant right after the requested `to` day ends.
  const currentTo = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);
  const lengthMs = currentTo.getTime() - currentFrom.getTime();

  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: new Date(currentFrom.getTime() - lengthMs), to: currentFrom },
  };
};

const resolvePeriod = (
  dto: DashboardQueryDto,
): { current: PeriodBounds; previous: PeriodBounds; month: string | null } => {
  if (dto.from && dto.to) {
    return { ...customRangeBounds(dto.from, dto.to), month: null };
  }
  const { current, previous, monthLabel } = monthBounds(dto.month);
  return { current, previous, month: monthLabel };
};

const getPeriodAggregates = async (from: Date, to: Date) => {
  const where = { date: { gte: from, lt: to } };

  const [total, statusGroups, guestSum] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.groupBy({ by: ["status"], where, _count: true }),
    prisma.reservation.aggregate({ where, _sum: { guests: true } }),
  ]);

  return {
    total,
    guests: guestSum._sum.guests ?? 0,
    statusCounts: statusGroups.map((row) => ({ status: row.status, count: row._count })),
  };
};

const countForStatus = (
  statusCounts: { status: string; count: number }[],
  status: string,
): number => statusCounts.find((row) => row.status === status)?.count ?? 0;

// null (not 0%) when there's no previous-period baseline to compare against -
// "0 -> 5" isn't a "500% increase," it's "not comparable."
const percentDelta = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 100);
};

const buildStatCard = (current: number, previous: number): StatCard => ({
  current,
  previous,
  deltaPercent: percentDelta(current, previous),
});

export const getDashboardStats = async (dto: DashboardQueryDto): Promise<DashboardStatsResult> => {
  const { current: currentRange, previous: previousRange, month } = resolvePeriod(dto);

  const [current, previous, sourceGroups] = await Promise.all([
    getPeriodAggregates(currentRange.from, currentRange.to),
    getPeriodAggregates(previousRange.from, previousRange.to),
    prisma.reservation.groupBy({
      by: ["source"],
      where: { date: { gte: currentRange.from, lt: currentRange.to } },
      _count: true,
    }),
  ]);

  const currentConfirmed = countForStatus(current.statusCounts, "CONFIRMED");
  const previousConfirmed = countForStatus(previous.statusCounts, "CONFIRMED");
  const currentPending = countForStatus(current.statusCounts, "PENDING");
  const previousPending = countForStatus(previous.statusCounts, "PENDING");
  const currentCancelled = countForStatus(current.statusCounts, "CANCELLED");
  const previousCancelled = countForStatus(previous.statusCounts, "CANCELLED");

  // Share of the *current* period's total - 0 (not NaN) when that total is 0.
  const percentOfTotal = (count: number): number =>
    current.total > 0 ? Math.round((count / current.total) * 100) : 0;

  return {
    period: { month, from: currentRange.from, to: currentRange.to },
    totals: {
      reservations: buildStatCard(current.total, previous.total),
      confirmed: buildStatCard(currentConfirmed, previousConfirmed),
      pending: buildStatCard(currentPending, previousPending),
      cancelled: buildStatCard(currentCancelled, previousCancelled),
      guests: buildStatCard(current.guests, previous.guests),
    },
    bySource: sourceGroups.map((row) => ({
      source: row.source,
      count: row._count,
      percent: percentOfTotal(row._count),
    })),
    byStatus: current.statusCounts.map((row) => ({
      ...row,
      percent: percentOfTotal(row.count),
    })),
  };
};
