-- ReservationStatus lost its COMPLETED value in an earlier migration, but
-- the dashboard (Total Reservations / Completed / Total Guests / Cancelled
-- KPI cards + the Reservation Status donut) genuinely needs it - see
-- doc/DASHBOARD_SCOPE_REVIEW.md and doc/FRONTEND_MOCK_DATA_SCHEMA.md, both
-- of which document COMPLETED as a real status. Restoring it.

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'COMPLETED';
