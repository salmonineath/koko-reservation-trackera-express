import type { NextFunction, Request, Response } from "express";
import { dashboardQuerySchema } from "./dashboard.schema";
import { getDashboardStats } from "./dashboard.service";

export const getDashboardController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = dashboardQuerySchema.parse(req.query);
    const stats = await getDashboardStats(dto);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
