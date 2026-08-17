import { AppError } from "./app-error";

// The requested resource (by id, by unique field, ...) doesn't exist.
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}
