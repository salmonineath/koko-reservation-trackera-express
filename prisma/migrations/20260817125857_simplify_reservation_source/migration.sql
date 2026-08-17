-- AlterEnum
-- Drop PHONE_CALL, WALK_IN, INFLUENCER, RETURNING_CUSTOMER, UNKNOWN; add TELEGRAM.
-- Safe as of this migration: staging has a single Reservation row (source =
-- FACEBOOK), and no removed value is in use. If a removed value were still
-- referenced, the ALTER TABLE ... USING cast below would fail loudly rather
-- than silently truncating data.
BEGIN;
CREATE TYPE "ReservationSource_new" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TELEGRAM');
ALTER TABLE "Reservation" ALTER COLUMN "source" TYPE "ReservationSource_new" USING ("source"::text::"ReservationSource_new");
ALTER TYPE "ReservationSource" RENAME TO "ReservationSource_old";
ALTER TYPE "ReservationSource_new" RENAME TO "ReservationSource";
DROP TYPE "public"."ReservationSource_old";
COMMIT;
