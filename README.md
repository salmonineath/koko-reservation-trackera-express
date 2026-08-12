# KOKO Reservation Tracker

Backend API for tracking KOKO Steakhouse reservations — built to replace manual
spreadsheet tracking with a single system that records where a reservation came
from, how many there were, and their status. See
[`doc/`](doc) for the full product scope; the status of what's actually built
vs. planned is tracked at the top of that doc.

## Tech stack

- **Runtime:** Node.js + TypeScript, Express 5
- **Database:** PostgreSQL, via [Prisma ORM 7](https://www.prisma.io/) (`@prisma/adapter-pg` driver adapter)
- **Auth:** JWT access tokens + rotating refresh tokens (bcrypt password hashing)
- **Validation:** Zod
- **API docs:** Swagger / OpenAPI (`swagger-jsdoc` + `swagger-ui-express`)
- **Local infra:** Docker Compose (Postgres + a periodic `pg_dump` backup sidecar)

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local Postgres) — or your own Postgres instance

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `.env` — see [Environment variables](#environment-variables) below.
   At minimum, set a real `POSTGRES_PASSWORD` and a long random `JWT_SECRET`.

3. **Start Postgres**

   ```bash
   docker compose up -d db
   ```

   This creates the `db` container (`koko_db`) using `POSTGRES_USER` /
   `POSTGRES_PASSWORD` / `POSTGRES_DB` from `.env`, plus a `db_backup` sidecar
   that dumps the database hourly to `./backups` (kept 7 days).

4. **Run database migrations**

   ```bash
   npx prisma migrate dev
   ```

5. **Seed an admin account**

   There is no self-service registration — accounts are only created via this
   script. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then:

   ```bash
   npm run db:seed
   ```

   If `ADMIN_EMAIL` already has an account, this **resets its password** to
   `ADMIN_PASSWORD` instead of creating a duplicate — handy if you don't know
   the current password. Use a different `ADMIN_EMAIL` to provision an
   additional account instead — there's no limit on how many can exist.

6. **Start the dev server**

   ```bash
   npm run dev
   ```
