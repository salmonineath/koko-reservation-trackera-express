import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError, ValidationError } from "@/shared/errors";
import type { UpdateUserDto } from "./user.dto";
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "./user.schema";
import {
  createUser,
  deleteUser,
  getCurrentUser,
  getUserById,
  listUsers,
  updateUser,
} from "./user.service";

const parseUserId = (raw: string | string[] | undefined): number => {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid user id");
  }
  return id;
};

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

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = createUserSchema.parse(req.body);
    const user = await createUser(dto);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const listUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(dto);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseUserId(req.params.id);
    const user = await getUserById(id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseUserId(req.params.id);
    const changes = updateUserSchema.parse(req.body);
    const dto: UpdateUserDto = { id, changes };
    const user = await updateUser(dto);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseUserId(req.params.id);
    // Deleting your own account out from under your own session would lock
    // you out (no self-service registration - see doc/FRONTEND_API_SCOPE.md),
    // so that one case is rejected up front rather than left to accidentally
    // succeed.
    if (req.user?.sub === id) {
      throw new ValidationError("You cannot delete your own account");
    }
    await deleteUser(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
