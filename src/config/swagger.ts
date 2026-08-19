import swaggerJsdoc from "swagger-jsdoc";

// Spec is generated from @openapi JSDoc blocks in each module's *.routes.ts,
// not hand-maintained separately — add a block next to each new route and it
// shows up here automatically, so the docs can't silently drift from the code.
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "KOKO Reservation Tracker API",
      version: "1.0.0",
      description: "Internal API for tracking KOKO Steakhouse reservations and marketing data.",
    },
    servers: [{ url: "/api", description: "Current server" }],
    // Applies to every operation by default; auth-routes.ts overrides it back to
    // [] (no auth) on /login, /refresh, and /logout since those must be reachable pre-login.
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Paste the token returned from POST /auth/login (no 'Bearer ' prefix needed here).",
        },
      },
      schemas: {
        AuthCredentials: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "you@example.com" },
            password: { type: "string", format: "password", example: "at-least-8-chars" },
          },
        },
        AuthUser: {
          type: "object",
          description:
            "fullName/username/role are display-only - null until set (see " +
            "src/script/seed.ts) - and don't grant or restrict anything; there's " +
            "still no permission model.",
          properties: {
            id: { type: "integer", example: 1 },
            email: { type: "string", example: "you@example.com" },
            fullName: { type: "string", nullable: true, example: "Jane Doe" },
            username: { type: "string", nullable: true, example: "jane" },
            role: {
              type: "string",
              nullable: true,
              enum: ["ADMIN", "STAFF", null],
              example: "ADMIN",
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        UserInput: {
          type: "object",
          description:
            "Used for both create (password required) and update (all fields " +
            "optional - only what's provided is changed; a provided password " +
            "replaces the existing one, an omitted one leaves it untouched).",
          properties: {
            email: { type: "string", format: "email", example: "you@example.com" },
            password: { type: "string", format: "password", example: "at-least-8-chars" },
            fullName: { type: "string", example: "Jane Doe" },
            username: { type: "string", example: "jane" },
            role: { type: "string", nullable: true, example: "ADMIN" },
          },
        },
        AuthResponse: {
          type: "object",
          description:
            "The refresh token is NOT in this body - it's set via an HttpOnly " +
            "Set-Cookie (path=/api/auth), unreadable by frontend JS.",
          properties: {
            accessToken: {
              type: "string",
              description:
                "Short-lived JWT (see ACCESS_TOKEN_EXPIRES_IN). Send as 'Authorization: Bearer <accessToken>'.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: { $ref: "#/components/schemas/AuthUser" },
          },
        },
        Reservation: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            customerName: { type: "string", example: "John Doe" },
            phone: { type: "string", example: "(555) 123-4567" },
            date: { type: "string", format: "date-time", example: "2026-08-15T19:00:00.000Z" },
            guests: { type: "integer", example: 4 },
            source: { $ref: "#/components/schemas/ReservationSource" },
            status: { $ref: "#/components/schemas/ReservationStatus" },
            notes: { type: "string", nullable: true, example: "Window seat if possible" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ReservationSource: {
          type: "string",
          enum: ["FACEBOOK", "INSTAGRAM", "TIKTOK", "TELEGRAM"],
        },
        ReservationStatus: {
          type: "string",
          enum: ["PENDING", "CONFIRMED", "CANCELLED"],
        },
        ReservationInput: {
          type: "object",
          required: ["customerName", "phone", "date", "guests", "source"],
          properties: {
            customerName: { type: "string" },
            phone: { type: "string" },
            date: { type: "string", format: "date-time" },
            guests: { type: "integer", minimum: 1 },
            source: { $ref: "#/components/schemas/ReservationSource" },
            status: { $ref: "#/components/schemas/ReservationStatus", default: "PENDING" },
            notes: { type: "string", maxLength: 500 },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 12 },
            total: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
          },
        },
        DashboardStatCard: {
          type: "object",
          description:
            "null deltaPercent means there's no previous-period baseline to compare against.",
          properties: {
            current: { type: "integer", example: 128 },
            previous: { type: "integer", example: 156 },
            deltaPercent: { type: "integer", nullable: true, example: -18 },
          },
        },
        DashboardStats: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                month: {
                  type: "string",
                  nullable: true,
                  example: "2026-08",
                  description: "Null when a custom from/to range was requested instead of a month.",
                },
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" },
              },
            },
            totals: {
              type: "object",
              properties: {
                reservations: { $ref: "#/components/schemas/DashboardStatCard" },
                confirmed: { $ref: "#/components/schemas/DashboardStatCard" },
                pending: { $ref: "#/components/schemas/DashboardStatCard" },
                cancelled: { $ref: "#/components/schemas/DashboardStatCard" },
                guests: { $ref: "#/components/schemas/DashboardStatCard" },
              },
            },
            bySource: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { $ref: "#/components/schemas/ReservationSource" },
                  count: { type: "integer", example: 45 },
                  percent: {
                    type: "integer",
                    example: 35,
                    description: "Rounded share of the current period's total reservations.",
                  },
                },
              },
            },
            byStatus: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  status: { $ref: "#/components/schemas/ReservationStatus" },
                  count: { type: "integer", example: 96 },
                  percent: {
                    type: "integer",
                    example: 75,
                    description: "Rounded share of the current period's total reservations.",
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            error: { type: "string", example: "Validation failed" },
            details: {
              type: "object",
              additionalProperties: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
