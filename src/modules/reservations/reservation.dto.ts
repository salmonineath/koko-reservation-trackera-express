import type { z } from "zod";
import type { ReservationModel } from "@/generated/prisma/models";
import type {
  createReservationSchema,
  dashboardStatsQuerySchema,
  listReservationsQuerySchema,
  updateReservationSchema,
} from "./reservation.schema";

// --- Input DTOs: what each service operation needs -------------------------
//
// create/list/dashboard-stats need exactly what their schema already
// validated, so their DTOs are plain aliases of the schema's inferred type.
export type CreateReservationDto = z.infer<typeof createReservationSchema>;
export type ListReservationsDto = z.infer<typeof listReservationsQuerySchema>;
export type DashboardStatsDto = z.infer<typeof dashboardStatsQuerySchema>;

// Updating is different: the id comes from the route param, not the request
// body, so the schema alone can't describe what the service needs - the DTO
// has to combine both.
export interface UpdateReservationDto {
  id: number;
  changes: z.infer<typeof updateReservationSchema>;
}

// --- Output DTO: what a reservation looks like in an API response ----------
//
// Listed field-by-field (rather than re-exporting the Prisma model) so the
// API contract is something we own and can evolve on purpose - adding a
// column to schema.prisma never silently changes what a client receives
// until this file is updated too.
export type ReservationDto = {
  id: number;
  customerName: string;
  phone: string;
  date: Date;
  guests: number;
  source: ReservationModel["source"];
  status: ReservationModel["status"];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toReservationDto = (reservation: ReservationModel): ReservationDto => ({
  id: reservation.id,
  customerName: reservation.customerName,
  phone: reservation.phone,
  date: reservation.date,
  guests: reservation.guests,
  source: reservation.source,
  status: reservation.status,
  notes: reservation.notes,
  createdAt: reservation.createdAt,
  updatedAt: reservation.updatedAt,
});

export const toReservationDtoList = (reservations: ReservationModel[]): ReservationDto[] =>
  reservations.map(toReservationDto);
