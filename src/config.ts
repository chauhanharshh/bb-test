import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  adminUsername: "admin",
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || "Babybloom@2026",
  adminAuthSalt: process.env.ADMIN_AUTH_SALT || "babybloom-admin-salt-2026-v1",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || "babybloom-session-secret-key-2026",
  adminCookieName: "babybloom_admin_session",
  sessionTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  frontendUrl: process.env.FRONTEND_URL || "https://www.babyybloom.com",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "https://www.babyybloom.com,http://localhost:3000,http://localhost:3001,https://api.babyybloom.com")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  smtp: {
    user: process.env.SMTP_USER || "babybloom.bb2024@gmail.com",
    pass: process.env.SMTP_PASS || "ukcabhahdjmvsbqv",
  },
};

