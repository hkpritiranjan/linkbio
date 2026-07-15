import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import linksRouter from "./routes/links";
import publicRouter from "./routes/public";
import analyticsRouter from "./routes/analytics";
import billingRouter from "./routes/billing";
import { startAnalyticsWorker } from "./workers/analyticsWorker";

const app = express();
const PORT = parseInt(process.env.API_PORT ?? "3001", 10);

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.WEB_BASE_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

// ─── Stripe webhook — MUST be raw body, before json() ────────
app.use(
  "/api/v1/billing/webhook",
  express.raw({ type: "application/json" })
);

// ─── General middleware ───────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Global rate limit ───────────────────────────────────────
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Stricter limit for auth endpoints
app.use(
  "/api/v1/auth/signup",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 })
);

// Rate limit for analytics ingestion
app.use(
  "/api/v1/p/",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 60 })
);

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/links", linksRouter);
app.use("/api/v1/p", publicRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/billing", billingRouter);

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── 404 fallback ────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ─── Global error handler ────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[API] running on port ${PORT}`);
  startAnalyticsWorker();
});

export default app;
