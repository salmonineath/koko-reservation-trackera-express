import { AppError } from "./app-error";

// The caller is identified but not allowed to do this (or, for CORS/CSRF, the
// request itself doesn't look like it came from a place we trust).
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}
