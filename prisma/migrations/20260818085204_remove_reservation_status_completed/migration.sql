-- There is no COMPLETED status - reverting the earlier restore. Postgres
-- has no DROP VALUE for enums, so narrowing one means rebuilding the type:
-- create the new (smaller) type, repoint the column at it, then swap names.
-- Safe here since no existing row uses COMPLETED (verified before writing
-- this migration).
BEGIN;
CREATE TYPE "ReservationStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus_new" USING ("status"::text::"ReservationStatus_new");
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "ReservationStatus_old";
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
