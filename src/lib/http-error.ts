// Throw this from services/middleware when you know the exact status code the
// client should see (401 bad credentials, 409 conflict, ...). errorHandler maps
// it straight to a response instead of falling through to a generic 500.
export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
}
