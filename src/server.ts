import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { apiRouter } from "./routes/index.js";
import prisma from "./lib/prisma.js";

const app = express();

// Trust reverse proxy (Nginx on VPS)
app.set("trust proxy", 1);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        config.allowedOrigins.includes(origin) ||
        origin.endsWith("babyybloom.com") ||
        origin.endsWith("vercel.app") ||
        origin.includes("localhost");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive fallback with credentials enabled
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Health check endpoints
app.get(["/health", "/api/health"], (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "BabyBloom Backend API",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount all API routes under /api
app.use("/api", apiRouter);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.url}`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Start Server
const server = app.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(`🚀 BabyBloom Dedicated Backend API is RUNNING!`);
  console.log(`📡 Port: ${config.port}`);
  console.log(`🌐 Base URL: http://localhost:${config.port}`);
  console.log(`🔒 Allowed Origins: ${config.allowedOrigins.join(", ")}`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;

