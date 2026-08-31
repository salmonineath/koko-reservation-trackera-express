/*
  Warnings:

  - The values [TELEGRAM] on the enum `ReservationSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReservationSource_new" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');
ALTER TABLE "Reservation" ALTER COLUMN "source" TYPE "ReservationSource_new" USING ("source"::text::"ReservationSource_new");
ALTER TYPE "ReservationSource" RENAME TO "ReservationSource_old";
ALTER TYPE "ReservationSource_new" RENAME TO "ReservationSource";
DROP TYPE "public"."ReservationSource_old";
COMMIT;

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "username";
