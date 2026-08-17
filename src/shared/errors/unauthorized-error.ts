import { AppError } from "./app-error";

// The caller isn't authenticated, or presented credentials/tokens that don't
// prove who they claim to be (bad password, missing/invalid/expired/reused
// token, ...).
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}
