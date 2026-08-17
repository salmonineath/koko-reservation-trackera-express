import { AppError } from "./app-error";

// Request data that Zod never got a chance to reject - most commonly a route
// param that has to be parsed by hand (e.g. `:id` needing to be a positive
// integer). Body/query validation should go through a Zod schema instead;
// see reservation.schema.ts and src/middleware/error.middleware.ts's
// dedicated ZodError handling.
export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(400, message);
  }
}
