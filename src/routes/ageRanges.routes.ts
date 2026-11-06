import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const ageRangesRouter = Router();

// GET /api/age-ranges
ageRangesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const ranges = await prisma.ageRange.findMany({
      orderBy: { order: "asc" },
    });

    const products = await prisma.product.findMany({
      select: { ageGroup: true, ageGroups: true },
    });

    const countMap: Record<string, number> = {};
    for (const p of products) {
      if (p.ageGroup) countMap[p.ageGroup] = (countMap[p.ageGroup] || 0) + 1;
      if (Array.isArray(p.ageGroups)) {
        for (const ag of p.ageGroups) {
          countMap[ag] = (countMap[ag] || 0) + 1;
        }
      }
    }

    const enriched = ranges.map((r) => ({
      ...r,
      productCount: countMap[r.name] || 0,
    }));

    return res.json(enriched);
  } catch (error) {
    console.error("GET /api/age-ranges error:", error);
    return res.status(500).json({ error: "Failed to fetch age ranges" });
  }
});

// POST /api/age-ranges (Admin only)
ageRangesRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Age range name is required" });
    }

    const trimmed = name.trim();
    const existing = await prisma.ageRange.findUnique({
      where: { name: trimmed },
    });

    if (existing) {
      return res.status(409).json({ error: `Age range "${trimmed}" already exists` });
    }

    const maxOrder = await prisma.ageRange.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    const created = await prisma.ageRange.create({
      data: {
        name: trimmed,
        order: nextOrder,
      },
    });

    return res.status(201).json({
      ...created,
      productCount: 0,
    });
  } catch (error: any) {
    console.error("POST /api/age-ranges error:", error);
    return res.status(500).json({ error: error.message || "Failed to create age range" });
  }
});

// DELETE /api/age-ranges/:id (Admin only)
ageRangesRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await prisma.ageRange.delete({ where: { id } });
    return res.json({ success: true, message: "Age range deleted" });
  } catch (error: any) {
    console.error("DELETE /api/age-ranges error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete age range" });
  }
});

