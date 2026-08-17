import type { NextFunction, Request, Response } from "express";
import { HttpError } from "@/lib/http-error";
import * as meService from "@/services/me-service";

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "User not authenticated");
    }

    const user = await meService.getCurrentUser(req.user.sub);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
