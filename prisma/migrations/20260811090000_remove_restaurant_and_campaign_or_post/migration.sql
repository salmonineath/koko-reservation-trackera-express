-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_restaurantId_fkey";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "campaignOrPost",
DROP COLUMN "restaurantId";

-- DropTable
DROP TABLE "Restaurant";

