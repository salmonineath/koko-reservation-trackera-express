import { z } from "zod";

// Rejects e.g. "2026-02-30" - the regex alone lets it through, but `Date`
// silently rolls it over to March 2nd instead of treating it as invalid, so
// the calendar fields have to be checked back against the parsed date.
const isValidCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

// Plain calendar-day string (YYYY-MM-DD) for a query param - callers expand
// it into an actual timestamp range themselves (see
// reservation.service.ts's buildCreatedAtRange and
// dashboard.service.ts's customRangeBounds). Shared so both modules validate
// `from`/`to` identically instead of drifting apart.
export const dateOnlyQueryParam = (fieldName: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName} must be in YYYY-MM-DD format`)
    .refine(isValidCalendarDate, `${fieldName} is not a valid calendar date`);
