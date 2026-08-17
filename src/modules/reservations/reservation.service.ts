import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/shared/errors";
import type {
  CreateReservationDto,
  DashboardStatsDto,
  ListReservationsDto,
  ReservationDto,
  UpdateReservationDto,
} from "./reservation.dto";
import { toReservationDto, toReservationDtoList } from "./reservation.dto";
import type { DashboardStatsResult, StatCard } from "./reservation.types";

export const createReservation = async (dto: CreateReservationDto): Promise<ReservationDto> => {
  const reservation = await prisma.reservation.create({ data: dto });
  return toReservationDto(reservation);
};

const buildReservationWhere = (dto: ListReservationsDto) => {
  const { search, source, status, dateFrom, dateTo } = dto;

  return {
    ...(source && { source }),
    ...(status && { status }),
    ...((dateFrom || dateTo) && {
      date: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
    ...(search && {
      OR: [
        { customerName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };
};

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const listReservations = async (dto: ListReservationsDto) => {
  const { page, limit } = dto;
  const where = buildReservationWhere(dto);

  const [data, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { date: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return {
    data: toReservationDtoList(data),
    pagination: buildPagination(page, limit, total),
  };
};

const getReservationOrThrow = async (id: number) => {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    throw new NotFoundError("Reservation not found");
  }
  return reservation;
};

export const getReservationById = async (id: number): Promise<ReservationDto> => {
  return toReservationDto(await getReservationOrThrow(id));
};

export const updateReservation = async (dto: UpdateReservationDto): Promise<ReservationDto> => {
  await getReservationOrThrow(dto.id);

  const reservation = await prisma.reservation.update({
    where: { id: dto.id },
    data: dto.changes,
  });
  return toReservationDto(reservation);
};

export const deleteReservation = async (id: number): Promise<void> => {
  await getReservationOrThrow(id);
  await prisma.reservation.delete({ where: { id } });
};

// --- Dashboard stats ---------------------------------------------------
//
// Dashboard KPI cards/donuts only (see doc/DASHBOARD_SCOPE_REVIEW.md) -
// deliberately excludes trend/time-series and anything social-media/content
// related, since those are out of scope for this release regardless of
// whether the data existed.

const monthBounds = (month?: string) => {
  const now = new Date();
  const [year, monthNum] = month
    ? (month.split("-").map(Number) as [number, number])
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  return {
    from: new Date(Date.UTC(year, monthNum - 1, 1)),
    to: new Date(Date.UTC(year, monthNum, 1)),
    prevFrom: new Date(Date.UTC(year, monthNum - 2, 1)),
    prevTo: new Date(Date.UTC(year, monthNum - 1, 1)),
  };
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

export const getDashboardStats = async (dto: DashboardStatsDto): Promise<DashboardStatsResult> => {
  const { from, to, prevFrom, prevTo } = monthBounds(dto.month);

  const [current, previous, sourceGroups] = await Promise.all([
    getPeriodAggregates(from, to),
    getPeriodAggregates(prevFrom, prevTo),
    prisma.reservation.groupBy({
      by: ["source"],
      where: { date: { gte: from, lt: to } },
      _count: true,
    }),
  ]);

  const currentCancelled = countForStatus(current.statusCounts, "CANCELLED");
  const previousCancelled = countForStatus(previous.statusCounts, "CANCELLED");

  return {
    period: {
      month: `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`,
      from,
      to,
    },
    totals: {
      reservations: buildStatCard(current.total, previous.total),
      cancelled: buildStatCard(currentCancelled, previousCancelled),
      guests: buildStatCard(current.guests, previous.guests),
    },
    bySource: sourceGroups.map((row) => ({ source: row.source, count: row._count })),
    byStatus: current.statusCounts,
  };
};
