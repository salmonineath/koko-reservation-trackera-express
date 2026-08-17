import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "@/shared/errors";
import { getCurrentUser } from "./user.service";

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // requireAuth always runs before this controller (see src/routes/index.ts)
    // and rejects the request before it gets here otherwise - this check only
    // narrows req.user's type, which is optional because not every route
    // requires auth.
    if (!req.user) {
      throw new UnauthorizedError("User not authenticated");
    }

    const user = await getCurrentUser(req.user.sub);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
