import swaggerJsdoc from "swagger-jsdoc";

// Spec is generated from @openapi JSDoc blocks in src/routes/**, not hand-maintained
// separately — add a block next to each new route (Social Media, Content, ...) and it
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
          description: "Paste the token returned from POST /auth/login (no 'Bearer ' prefix needed here).",
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
        AuthResponse: {
          type: "object",
          description:
            "The refresh token is NOT in this body - it's set via an HttpOnly " +
            "Set-Cookie (path=/api/auth), unreadable by frontend JS.",
          properties: {
            accessToken: {
              type: "string",
              description: "Short-lived JWT (see ACCESS_TOKEN_EXPIRES_IN). Send as 'Authorization: Bearer <accessToken>'.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                email: { type: "string", example: "you@example.com" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
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
          enum: [
            "FACEBOOK",
            "INSTAGRAM",
            "TIKTOK",
            "PHONE_CALL",
            "WALK_IN",
            "INFLUENCER",
            "RETURNING_CUSTOMER",
            "UNKNOWN",
          ],
        },
        ReservationStatus: {
          type: "string",
          enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
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
        ValidationError: {
          type: "object",
          properties: {
            error: { type: "string", example: "Validation failed" },
            details: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
