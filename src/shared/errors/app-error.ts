// Base class for every application error. Throw this (or, more usually, one of
// its subclasses below) from services/middleware when you know the exact HTTP
// status code the client should see. src/middleware/error.middleware.ts maps
// any AppError straight to a response instead of falling through to a generic
// 500 - so callers can just `throw` and never write `res.status(...).json(...)`
// themselves.
export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}
