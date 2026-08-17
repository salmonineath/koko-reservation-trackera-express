import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "@/shared/errors";
import type { UpdateReservationDto } from "./reservation.dto";
import {
  createReservationSchema,
  dashboardStatsQuerySchema,
  listReservationsQuerySchema,
  updateReservationSchema,
} from "./reservation.schema";
import {
  createReservation,
  deleteReservation,
  getDashboardStats,
  getReservationById,
  listReservations,
  updateReservation,
} from "./reservation.service";

const parseReservationId = (raw: string | string[] | undefined): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid reservation id");
  }
  return id;
};

export const createReservationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dto = createReservationSchema.parse(req.body);
    const reservation = await createReservation(dto);
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

export const listReservationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dto = listReservationsQuerySchema.parse(req.query);
    const result = await listReservations(dto);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getReservationByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseReservationId(req.params.id);
    const reservation = await getReservationById(id);
    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

export const updateReservationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseReservationId(req.params.id);
    const changes = updateReservationSchema.parse(req.body);
    const dto: UpdateReservationDto = { id, changes };
    const reservation = await updateReservation(dto);
    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

export const deleteReservationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseReservationId(req.params.id);
    await deleteReservation(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getReservationStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dto = dashboardStatsQuerySchema.parse(req.query);
    const stats = await getDashboardStats(dto);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
