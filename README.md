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

   - API: `http://localhost:3000`
   - Swagger docs: `http://localhost:3000/api-docs`

## Scripts

| Command              | Description                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Start the API with hot reload (`tsx watch`)                     |
| `npm run build`       | Type-check and compile to `dist/`                                |
| `npm start`           | Run the compiled build (`dist/server.js`)                       |
| `npm run type-check`  | Type-check without emitting output                                |
| `npm run db:seed`     | Create/reset an account (`ADMIN_EMAIL`/`ADMIN_PASSWORD`)         |

## Environment variables

| Variable                  | Description                                                        | Default        |
| -------------------------- | ------------------------------------------------------------------- | -------------- |
| `NODE_ENV`                 | `development` \| `test` \| `production`                            | `development`  |
| `PORT`                     | HTTP port the API listens on                                        | `3000`         |
| `DATABASE_URL`             | Postgres connection string used by Prisma                           | —              |
| `POSTGRES_USER`            | Postgres user (docker-compose only)                                 | —              |
| `POSTGRES_PASSWORD`        | Postgres password (docker-compose only)                             | —              |
| `POSTGRES_DB`              | Postgres database name (docker-compose only)                        | —              |
| `POSTGRES_PORT`            | Host port mapped to Postgres' `5432`                                | `5432`         |
| `JWT_SECRET`                | Signing secret for access tokens (min 16 chars)                     | —              |
| `ACCESS_TOKEN_EXPIRES_IN`  | Access token lifetime (e.g. `15m`)                                   | `15m`          |
| `REFRESH_TOKEN_TTL_DAYS`   | Refresh token lifetime, in days                                     | `30`           |
| `ADMIN_EMAIL`              | Used only by `npm run db:seed` to create an account                 | —              |
| `ADMIN_PASSWORD`           | Used only by `npm run db:seed` to create an account (8+ chars)      | —              |

`DATABASE_URL`'s database name must match `POSTGRES_DB` — see the
[docker-compose troubleshooting note](doc) if the app can't find the database.

## API overview

Full request/response schemas are on the Swagger UI (`/api-docs`) once the
server is running. Summary:

### Auth — `/api/auth` (no token required)

| Method | Path       | Description                                                |
| ------ | ---------- | ------------------------------------------------------------ |
| POST   | `/login`   | Log in, returns an access + refresh token pair               |
| POST   | `/refresh` | Rotate a refresh token for a new token pair                  |
| POST   | `/logout`  | Revoke a refresh token (idempotent)                           |

There is no self-service registration — accounts are only created via
`npm run db:seed` (any number of accounts can exist). There is no
role/permission model; every account can access every endpoint.

### Reservations — `/api/reservations` (requires `Authorization: Bearer <accessToken>`)

| Method | Path              | Description                                              |
| ------ | ----------------- | ----------------------------------------------------------- |
| POST   | `/`                | Create a reservation                                        |
| GET    | `/`                | List reservations — search, filter, paginate                |
| GET    | `/:id`             | Get a reservation by id                                     |
| PATCH  | `/:id`             | Update a reservation                                         |
| DELETE | `/:id`             | Delete a reservation                                         |

`GET /` supports `search` (matches customer name or phone), `source`,
`status`, `dateFrom`/`dateTo`, and `page`/`limit` (default 12/page) query
params.

**Reservation source:** `FACEBOOK`, `INSTAGRAM`, `TIKTOK`, `PHONE_CALL`,
`WALK_IN`, `INFLUENCER`, `RETURNING_CUSTOMER`, `UNKNOWN`

**Reservation status:** `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`

## Project structure

```
src/
  config/       env parsing, database (Prisma client), Swagger setup
  controllers/  request handlers (auth, reservations)
  middleware/   requireAuth (JWT), centralized error handler
  routes/       Express routers + OpenAPI annotations
  schemas/      Zod input/query validation
  services/     business logic (auth token issuance/rotation, reservation CRUD)
  lib/          shared helpers (HttpError)
  script/       one-off scripts (seed.ts - creates an admin account)
  generated/    Prisma client (generated, do not edit)
prisma/
  schema.prisma, migrations/
doc/            product scope & planning docs
```

## Database

Schema is managed with Prisma (`prisma/schema.prisma`), currently modeling:

- **Reservation** — customer name, phone, date, guests, source, status, notes
- **User** — single account for login (email + bcrypt password hash)
- **RefreshToken** — hashed, rotated refresh tokens with reuse detection

Run `npx prisma studio` to browse data, or `npx prisma migrate dev` to apply
schema changes.
