import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/shared/errors";
import type {
  CreateReservationDto,
  ListReservationsDto,
  ReservationDto,
  UpdateReservationDto,
} from "./reservation.dto";
import { toReservationDto, toReservationDtoList } from "./reservation.dto";

export const createReservation = async (dto: CreateReservationDto): Promise<ReservationDto> => {
  const reservation = await prisma.reservation.create({ data: dto });
  return toReservationDto(reservation);
};

// `from`/`to` (and dateFrom/dateTo) are plain calendar-day strings
// (YYYY-MM-DD, validated in reservation.schema.ts) but the DB columns they
// filter are full timestamps, so they're expanded here to the first/last
// instant of that UTC calendar day - entirely from the caller's own values,
// never a hardcoded date. Shared by both pairs so dateTo doesn't cut off at
// midnight while to correctly reaches end-of-day.
const buildDayRange = (
  from?: string,
  to?: string,
): Prisma.DateTimeFilter<"Reservation"> | undefined => {
  if (!from && !to) return undefined;

  return {
    ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
    ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
  };
};

const buildReservationWhere = (dto: ListReservationsDto): Prisma.ReservationWhereInput => {
  const { search, source, status, dateFrom, dateTo, from, to } = dto;
  const date = buildDayRange(dateFrom, dateTo);
  const createdAt = buildDayRange(from, to);

  return {
    ...(source && { source }),
    ...(status && { status }),
    ...(date && { date }),
    ...(createdAt && { createdAt }),
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
