-- Refresh tokens are now delete-then-create on every rotation (see
-- src/modules/auth/auth.service.ts), so there is always exactly one row per
-- user. The revocation-trail columns are no longer written to, and userId is
-- made unique so the database itself enforces the one-row-per-user invariant.

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "revokedAt",
DROP COLUMN "replacedByTokenHash";

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_userId_key" ON "RefreshToken"("userId");
