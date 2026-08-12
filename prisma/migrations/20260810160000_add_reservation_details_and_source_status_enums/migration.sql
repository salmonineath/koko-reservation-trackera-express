-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'PHONE_CALL', 'WALK_IN', 'INFLUENCER', 'RETURNING_CUSTOMER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "campaignOrPost" TEXT,
ADD COLUMN     "guests" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "source" "ReservationSource" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Reservation_date_idx" ON "Reservation"("date");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_source_idx" ON "Reservation"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_name_key" ON "Restaurant"("name");

