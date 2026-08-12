import { prisma } from "@/config/database";
import type {
  CreateReservationInput,
  ListReservationsQuery,
  UpdateReservationInput,
} from "@/schemas/reservation-schema";

export const createReservation = async (input: CreateReservationInput) => {
  return prisma.reservation.create({
    data: input,
  });
};

export const listReservations = async (query: ListReservationsQuery) => {
  const { search, source, status, dateFrom, dateTo, page, limit } = query;

  const where = {
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
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getReservationById = async (id: number) => {
  return prisma.reservation.findUnique({ where: { id } });
};

export const updateReservation = async (id: number, input: UpdateReservationInput) => {
  return prisma.reservation.update({
    where: { id },
    data: input,
  });
};

export const deleteReservation = async (id: number) => {
  return prisma.reservation.delete({ where: { id } });
};
