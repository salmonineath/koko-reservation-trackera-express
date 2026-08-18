import { AppError } from "./app-error";

// The request is well-formed but collides with existing data - most commonly
// a unique constraint (e.g. email/username already in use).
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}
