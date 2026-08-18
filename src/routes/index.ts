import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireCsrfForMutations } from "@/middleware/csrf.middleware";
import { authRoutes } from "@/modules/auth/auth.routes";
import { reservationRoutes } from "@/modules/reservations/reservation.routes";
import { meRoutes, userRoutes } from "@/modules/users/user.routes";

// Single place that answers "where is this endpoint mounted?" - each
// module's own *.routes.ts only knows about paths relative to itself
// (e.g. "/:id"), this file is what puts them under "/api/...".
export const apiRouter = Router();

// /auth has to be reachable while logged out by definition, so it skips both
// requireCsrfForMutations and requireAuth. Login/refresh are still
// rate-limited individually - see auth.routes.ts.
apiRouter.use("/auth", authRoutes);

// Every other route requires a valid access token, and CSRF-protects any
// request that isn't a GET (state-changing requests can otherwise ride the
// accessToken cookie on a forged cross-site request).
apiRouter.use("/me", requireCsrfForMutations, requireAuth, meRoutes);
apiRouter.use("/users", requireCsrfForMutations, requireAuth, userRoutes);
apiRouter.use("/reservations", requireCsrfForMutations, requireAuth, reservationRoutes);
