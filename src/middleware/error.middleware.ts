import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/shared/errors";

// Central error handler so controllers can just `throw`/`next(error)` instead of
// each one re-implementing status-code mapping for validation and Prisma errors.
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: error.flatten().fieldErrors });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};
