# Architecture

This document explains how the backend is organized, why it's organized that
way, and — most importantly — **where to open a file when you need to change
something**. It's written for someone maintaining this codebase, not for
someone who already has it memorized.

If you only read one section, read [Where do I add / change...?](#where-do-i-add--change).

## The request flow

Every endpoint in this app follows the same five-step path:

```text
Route
  ↓
Schema validation
  ↓
Controller
  ↓
Service
  ↓
Prisma → Database
```

Concretely, for `PATCH /api/reservations/:id`:

1. **Route** (`reservation.routes.ts`) says "a PATCH to `/:id` goes to
   `updateReservationController`" — and nothing else. No logic lives here.
2. **Schema** (`reservation.schema.ts`) is a Zod schema that checks the
   request body is shaped correctly (right fields, right types). If it isn't,
   `.parse()` throws a `ZodError`, which the central error handler turns into
   a `400` automatically — the controller never has to handle that itself.
3. **Controller** (`reservation.controller.ts`) does three things and nothing
   more: reads/validates input from the `Request`, calls one service
   function, and writes the HTTP response.
4. **Service** (`reservation.service.ts`) is where the business logic lives —
   "does this reservation exist?", "what fields are changing?" — expressed as
   small, named steps.
5. **Prisma** (`@/lib/prisma`) is the only thing that talks to Postgres. There
   is no repository layer in between (see [Why no repositories?](#why-no-repositories)).

Each layer only knows about the layer directly below it. A route never
imports Prisma. A service never sees an Express `Request`.

## Folder-by-folder

```text
src/
├── app.ts                    # builds and configures the Express app (no listen())
├── server.ts                 # boots the DB connection, then starts app.listen()
│
├── config/                   # things read once at startup
│   ├── env.ts                 # validates process.env with Zod, exports `env`
│   ├── database.ts            # connectDB() / disconnectDB() lifecycle
│   └── swagger.ts             # builds the OpenAPI spec from *.routes.ts JSDoc
│
├── lib/
│   └── prisma.ts              # the one PrismaClient instance - import { prisma } from here
│
├── middleware/                # cross-cutting Express middleware, not tied to one feature
│   ├── auth.middleware.ts     # requireAuth - verifies the JWT
│   ├── csrf.middleware.ts     # requireCsrfHeader / requireCsrfForMutations
│   ├── error.middleware.ts    # the central error handler (last app.use())
│   └── rate-limit.middleware.ts
│
├── modules/                   # one folder per feature - see below
│   ├── auth/
│   ├── users/
│   └── reservations/
│
├── routes/
│   └── index.ts               # mounts each module's router under /api/...
│
├── shared/
│   └── errors/                # AppError and its subclasses (see Error handling)
│
├── types/
│   └── express.d.ts           # augments Express's Request with `req.user`
│
└── script/
    └── seed.ts                # one-off admin-account seeding script
```

### Inside a module

Every module in `src/modules/` follows the same six-file shape (a module only
gets the files it actually needs — see [When should something go into shared/?](#when-should-something-go-into-shared)):

```text
src/modules/reservations/
├── reservation.routes.ts      # HTTP method + path + middleware → controller
├── reservation.controller.ts  # Request in, Response out - no business logic
├── reservation.service.ts     # business logic + Prisma calls
├── reservation.schema.ts      # Zod: "is this HTTP input valid?"
├── reservation.dto.ts         # "what does the service/response need?"
└── reservation.types.ts       # feature-only types that aren't a schema or a DTO
```

`auth/` and `users/` follow the same pattern, minus whichever files they don't
need yet (`users/` has no `*.types.ts` because there's no extra domain type
beyond its DTO; `auth/` has no `*.types.ts`... actually it does, for
`AuthTokenPayload`/`AuthResult` — the point is: **don't create an empty file
just to match the pattern**. Add `*.types.ts` the day you actually have a type
that belongs there.)

## Where do I add / change...?

| I want to add/change                        | Start here                                    |
| -------------------------------------------- | ---------------------------------------------- |
| A new database field or model                | `prisma/schema.prisma`                         |
| A new database-backed enum                   | `prisma/schema.prisma`                         |
| A new reservation endpoint                   | `src/modules/reservations/`                    |
| A new auth endpoint                          | `src/modules/auth/`                            |
| A new user-profile endpoint                  | `src/modules/users/`                           |
| A brand-new feature/domain                   | `src/modules/<feature>/` (copy the 6-file shape) |
| Request validation (body/query shape)        | `<module>/*.schema.ts`                         |
| What a service function needs as input       | `<module>/*.dto.ts`                            |
| What an endpoint returns (response shape)    | `<module>/*.dto.ts`                            |
| Business logic / rules                       | `<module>/*.service.ts`                        |
| HTTP request/response handling               | `<module>/*.controller.ts`                     |
| Registering a URL + method                   | `<module>/*.routes.ts`                         |
| Mounting a module under `/api/...`           | `src/routes/index.ts`                          |
| A feature-only type (not a schema, not a DTO)| `<module>/*.types.ts`                          |
| A type genuinely shared by 2+ modules        | `src/shared/types/` (doesn't exist yet - create it the day you need it) |
| Cross-cutting Express middleware             | `src/middleware/`                              |
| A new application error (e.g. a 409 conflict)| `src/shared/errors/`                           |
| Environment variables                        | `src/config/env.ts`                            |
| The Prisma client itself                     | `src/lib/prisma.ts`                            |

## Core concepts

### What is a Prisma model?

The database's source of truth, defined once in `prisma/schema.prisma`. A
model becomes a TypeScript type automatically (via `prisma generate`, into
`src/generated/prisma/`) — you never hand-write a type that mirrors a table.

### What is a Prisma enum?

Same idea, for a fixed set of database values (`ReservationStatus`,
`ReservationSource`). Defined once in `schema.prisma`, imported everywhere
else that needs those exact values — see
`reservation.schema.ts`, which does `z.enum(ReservationStatus)` instead of
retyping `["PENDING", "CONFIRMED", ...]` by hand. **Never re-declare a
database enum's values in a second TypeScript file** — if you add a value to
the Prisma enum, every place that imports it (validation, types) picks it up
automatically instead of silently drifting out of sync.

### What is a schema (`*.schema.ts`)?

A Zod object that answers one question: **"is this HTTP request valid?"** It
validates `req.body` / `req.query` — types, required fields, string formats,
number ranges. It knows nothing about Prisma or business rules. If validation
fails, `.parse()` throws a `ZodError`, and `error.middleware.ts` turns that
into a `400` with field-level details — controllers never check this by hand.

### What is a DTO (`*.dto.ts`)?

A DTO answers a different question: **"what shape does this service
operation need, or return?"** In this codebase `*.dto.ts` holds two kinds of
types:

- **Input DTOs** — what a service function's parameter looks like. When the
  service needs exactly what the schema already validated, the DTO is a
  one-line alias (`export type CreateReservationDto = z.infer<typeof createReservationSchema>`)
  — no point retyping the same fields twice. When the service needs *more*
  than the validated body (e.g. an id from the route param, or the logged-in
  user's id from `req.user`), the DTO is its own interface that combines
  them, e.g.:

  ```ts
  export interface UpdateReservationDto {
    id: number; // from the route param - the schema never sees this
    changes: z.infer<typeof updateReservationSchema>;
  }
  ```

  This is the tell for **"do I need a real DTO or can I alias the schema
  type?"** — if the controller has to assemble the input from more than one
  HTTP source (body + params + auth), write a real DTO.

- **Output DTOs** — the explicit response shape for an entity, e.g.
  `ReservationDto`, `UserDto`, plus a `toXDto()` mapper from the Prisma model.
  These exist so the API's response shape is a decision you make on purpose:
  adding a column to `schema.prisma` never silently exposes it (or silently
  changes the response) until you update the DTO too. `UserDto` is the clearest
  example — it's *why* `passwordHash` never leaves the API.

Either way, a DTO never depends on Express. Controllers translate `Request` →
DTO; services only ever see the DTO.

### What is a Prisma model, again vs. a DTO?

A Prisma model is what's *in the database*. A DTO is what's *on the wire* (in
or out of a service call). They often look similar, but they change for
different reasons — a DTO should only change when the API contract should
change, not automatically every time the schema does.

### What belongs in a controller?

Three things, in order: read already-validated input off `req`, call **one**
service function, write the response (`res.json(...)`, status code). If
you're writing an `if` statement that encodes a business rule ("can this
reservation be cancelled?"), that line belongs in the service, not here.

### What belongs in a service?

The business logic, expressed as a short sequence of named steps — see
[How to add a feature](#how-to-add-a-feature-worked-example) below for a
concrete example. Services are the only thing that call Prisma. A service
function never receives an Express `Request` or `Response` — only a DTO (or
plain primitives like an `id: number`).

### When should I create a helper function?

When a step in a service function is doing more than one logical thing, or
when the same step is needed by more than one exported function. Name it for
what it does (`getReservationOrThrow`, `buildReservationWhere`), keep it
un-exported (`const foo = ...`, not `export const foo = ...`) unless another
file genuinely needs to call it, and don't extract a helper for a single line
that's already clear inline — that just adds a name to remember for no
benefit. See `reservation.service.ts` for several examples of both.

### When should something go into `shared/`?

Only once **two or more modules** genuinely need it — not because it feels
reusable in theory. `shared/errors/` qualifies today because every module
throws `NotFoundError`/`ValidationError`/etc. There's no `shared/types/`,
`shared/constants/`, or `shared/utils/` yet, because nothing in this codebase
needs to share a type, constant, or utility function across modules right
now. When something does, create the specific subfolder for it then — don't
pre-create empty ones "just in case."

One exception worth knowing: modules *can* import from each other's `dto.ts`
or `service.ts` directly when there's a real domain relationship — e.g.
`auth.service.ts` imports `UserDto`/`toUserDto` from
`modules/users/user.dto.ts`, because a successful login legitimately returns
a user. That's not a `shared/` concern; it's one module depending on
another's public output.

### Why no repositories?

A repository layer only earns its place when it removes real duplication or
complexity (e.g. the same 5-table join built in three different services). At
the moment, every service's Prisma calls are already a single, readable
`prisma.<model>.<method>(...)` — wrapping that in
`reservationRepository.findById(id)` that does nothing but
`return prisma.reservation.findUnique(...)` would add a layer with no
behavior of its own, just a name to look through to find the actual query.
If a genuinely complex, repeated query pattern shows up later, that's the
signal to introduce a repository for *that* piece — not a blanket rule.

## Error handling

```text
src/shared/errors/
├── app-error.ts          # base class: statusCode + message
├── not-found-error.ts    # 404
├── unauthorized-error.ts # 401 - not logged in / bad credentials / bad token
├── forbidden-error.ts    # 403 - CORS / CSRF rejections
├── validation-error.ts   # 400 - hand-parsed input (e.g. a route param)
└── index.ts              # re-exports all of the above
```

Services and middleware `throw` one of these instead of touching `res`
directly:

```ts
throw new NotFoundError("Reservation not found");
```

`src/middleware/error.middleware.ts` is the **only** place that turns an
error into an HTTP response. It checks, in order: is this a `ZodError`
(→ 400 with field details), an `AppError` (→ its own `statusCode` + message),
a Prisma "record not found" error (→ 404 fallback), or anything else
(→ 500, logged). Adding a new error type is just adding a new file next to
`not-found-error.ts` that extends `AppError` — the error handler doesn't need
to change, since it already checks `instanceof AppError` generically.

## How to add a feature (worked example)

Say you want to add:

```text
PATCH /api/reservations/:id/cancel
```

which sets a reservation's status to `CANCELLED`, but only if it isn't
already `COMPLETED` or `CANCELLED`.

**Step 1 — Prisma.** Nothing to change: `status` already exists on
`Reservation`, and `CANCELLED` already exists on `ReservationStatus`. If this
were a genuinely new field or enum value, it'd start in
`prisma/schema.prisma`, then `npx prisma migrate dev`.

**Step 2 — Schema.** This endpoint takes no body, so no new schema is
needed. If it did (say, a required cancellation reason), it'd go in
`reservation.schema.ts`:

```ts
export const cancelReservationSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
```

**Step 3 — DTO.** The service needs the id from the route param — that's not
something a body schema produces, so it gets a small, explicit DTO in
`reservation.dto.ts`:

```ts
export interface CancelReservationDto {
  id: number;
}
```

**Step 4 — Service.** In `reservation.service.ts`, written as a short list of
named steps, reusing the existing `getReservationOrThrow` helper:

```ts
const CANCELLABLE_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED"];

const ensureReservationCanBeCancelled = (reservation: { status: ReservationStatus }) => {
  if (!CANCELLABLE_STATUSES.includes(reservation.status)) {
    throw new ValidationError(`Cannot cancel a reservation that is already ${reservation.status}`);
  }
};

export const cancelReservation = async (dto: CancelReservationDto): Promise<ReservationDto> => {
  const reservation = await getReservationOrThrow(dto.id);
  ensureReservationCanBeCancelled(reservation);

  const updated = await prisma.reservation.update({
    where: { id: dto.id },
    data: { status: "CANCELLED" },
  });
  return toReservationDto(updated);
};
```

**Step 5 — Controller.** In `reservation.controller.ts`:

```ts
export const cancelReservationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseReservationId(req.params.id);
    const reservation = await cancelReservation({ id });
    res.json(reservation);
  } catch (error) {
    next(error);
  }
};
```

**Step 6 — Route.** In `reservation.routes.ts`:

```ts
reservationRoutes.patch("/:id/cancel", cancelReservationController);
```

**Step 7 — Test.** Hit it: `curl -X PATCH .../api/reservations/1/cancel`. Try
it twice in a row — the second call should now 400 instead of silently
re-cancelling, because `ensureReservationCanBeCancelled` catches it.

Notice the pattern: **schema → dto → service → controller → route**, in that
order, is also the order you *implement* a new endpoint in, top to bottom.

## Current modules

- **`auth/`** — login, refresh, logout. Owns JWT signing, refresh-token
  rotation/reuse-detection, and the auth cookies. No self-service
  registration; accounts are provisioned by `src/script/seed.ts`.
- **`users/`** — currently just `GET /api/me` (the logged-in user's own
  profile). Mounted at `/api/me`, not `/api/users`, because that's the actual
  route this app exposes today — see [Do not change API contracts
  unnecessarily](#a-note-on-api-contracts). Add real user management here
  (list/create/deactivate users, etc.) if that's ever needed.
- **`reservations/`** — CRUD + the `/stats` dashboard endpoint (KPI
  cards/donuts for the current vs. previous month).

## A note on API contracts

This refactor is architectural only — every route, status code, request
body, and response shape is unchanged from before it. The one deliberately
observable difference: reservation lookups by id (`GET`/`PATCH`/`DELETE
/api/reservations/:id`) now consistently 404 through the same
`NotFoundError` path instead of one of them (`GET`) hand-writing
`res.status(404)` while the others fell through to a generic Prisma-error
branch. The response body and status code are identical either way.
