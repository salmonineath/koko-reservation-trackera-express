import type { z } from "zod";
import type { dashboardQuerySchema } from "./dashboard.schema";

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
