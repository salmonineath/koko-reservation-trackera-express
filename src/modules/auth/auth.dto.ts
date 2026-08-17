import type { z } from "zod";
import type { loginSchema } from "./auth.schema";

// What the login service operation needs is exactly what loginSchema already
// validates, so this is a plain alias rather than a hand-retyped interface.
// It still lives in its own file because its job is different from
// auth.schema.ts: that file asks "is this HTTP input valid?", this one asks
// "what does the service need?" - see docs/ARCHITECTURE.md for a case
// (reservation.dto.ts's UpdateReservationDto) where those two answers diverge.
export type LoginDto = z.infer<typeof loginSchema>;
