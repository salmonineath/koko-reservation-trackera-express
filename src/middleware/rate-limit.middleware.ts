import rateLimit from "express-rate-limit";

// IP-based, not account-based - deliberately simple for a small internal app.
// The response never reveals whether an email/account exists; it's the exact
// same generic message regardless of what was being attempted.
const rateLimitHandler: import("express-rate-limit").Options["handler"] = (_req, res) => {
  res.status(429).json({ error: "Too many requests, please try again later." });
};

// Login: the endpoint attackers would brute-force credentials against.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Refresh: looser than login since a legitimate frontend calls this
// automatically (e.g. on every 401), but still capped against a stolen/guessed
// token being hammered.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
