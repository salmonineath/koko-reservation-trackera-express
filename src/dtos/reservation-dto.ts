import type { ReservationModel } from "@/generated/prisma/models";

// Explicit response shape for a Reservation. Listed field-by-field (rather
// than re-exporting the Prisma model) so the API contract is something we
// own and can evolve on purpose - adding a column to schema.prisma never
// silently changes what a client receives until this file is updated too.
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
