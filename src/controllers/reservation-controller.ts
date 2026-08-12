import type { NextFunction, Request, Response } from "express";
import { HttpError } from "@/lib/http-error";
import {
  createReservationSchema,
  listReservationsQuerySchema,
  updateReservationSchema,
} from "@/schemas/reservation-schema";
import * as reservationService from "@/services/reservation-service";

const parseId = (raw: string | string[] | undefined): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid reservation id");
  }
  return id;
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createReservationSchema.parse(req.body);
    const reservation = await reservationService.createReservation(input);
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listReservationsQuerySchema.parse(req.query);
    const result = await reservationService.listReservations(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const reservation = await reservationService.getReservationById(id);

    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const input = updateReservationSchema.parse(req.body);
    const reservation = await reservationService.updateReservation(id, input);
    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    await reservationService.deleteReservation(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
