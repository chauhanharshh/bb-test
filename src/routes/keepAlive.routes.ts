import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const keepAliveRouter = Router();

keepAliveRouter.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", message: "Database is awake and active", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Keep-alive error:", error);
    return res.status(500).json({ status: "error", message: "Failed to connect to database" });
  }
});

