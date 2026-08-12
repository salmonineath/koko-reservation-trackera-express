import type { AuthTokenPayload } from "@/services/auth-service";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
