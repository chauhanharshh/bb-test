import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const labelSizesRouter = Router();

const DEFAULT_LABEL_SIZES = [
  "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32"
];

// Helper to ensure table and columns exist in database
async function ensureTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LabelSize" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "order" INT DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);
  } catch (e) {
    // ignore
  }
}

// GET /api/label-sizes
labelSizesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    await ensureTable();

    let sizes: any[] = [];
    try {
      sizes = await (prisma as any).labelSize.findMany({
        orderBy: [{ order: "asc" }, { id: "asc" }],
      });
    } catch {
      sizes = await prisma.$queryRawUnsafe(
        'SELECT id, name, "order", "createdAt", "updatedAt" FROM "LabelSize" ORDER BY "order" ASC, id ASC'
      );
    }

    // Auto-seed if empty
    if (!sizes || sizes.length === 0) {
      for (let i = 0; i < DEFAULT_LABEL_SIZES.length; i++) {
        try {
          await prisma.$executeRawUnsafe(
            'INSERT INTO "LabelSize" (name, "order", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (name) DO NOTHING',
            DEFAULT_LABEL_SIZES[i],
            i + 1
          );
        } catch {
          // ignore
        }
      }
      try {
        sizes = await (prisma as any).labelSize.findMany({
          orderBy: [{ order: "asc" }, { id: "asc" }],
        });
      } catch {
        sizes = await prisma.$queryRawUnsafe(
          'SELECT id, name, "order", "createdAt", "updatedAt" FROM "LabelSize" ORDER BY "order" ASC, id ASC'
        );
      }
    }

    // Product count per label size
    const products = await prisma.product.findMany({
      select: { sizes: true },
    });

    const countMap: Record<string, number> = {};
    for (const p of products) {
      if (Array.isArray(p.sizes)) {
        for (const s of p.sizes) {
          if (s) {
            const key = s.trim().toLowerCase();
            countMap[key] = (countMap[key] || 0) + 1;
          }
        }
      }
    }

    const enriched = (sizes || []).map((s: any) => ({
      ...s,
      productCount: countMap[s.name.trim().toLowerCase()] || 0,
    })).sort((a: any, b: any) => {
      const numA = parseInt(a.name, 10);
      const numB = parseInt(b.name, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });

    return res.json(enriched);
  } catch (error) {
    console.error("GET /api/label-sizes error:", error);
    return res.status(500).json({ error: "Failed to fetch label sizes" });
  }
});

// POST /api/label-sizes (Admin only)
labelSizesRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Label size name is required" });
    }

    const trimmed = name.trim();
    let existing = null;
    try {
      existing = await (prisma as any).labelSize.findUnique({
        where: { name: trimmed },
      });
    } catch {
      const rows: any = await prisma.$queryRawUnsafe(
        'SELECT * FROM "LabelSize" WHERE LOWER(name) = LOWER($1) LIMIT 1',
        trimmed
      );
      if (Array.isArray(rows) && rows.length > 0) existing = rows[0];
    }

    if (existing) {
      return res.status(409).json({ error: `Label size "${trimmed}" already exists` });
    }

    const num = parseInt(trimmed, 10);
    const nextOrder = !isNaN(num) ? num : 50;

    let created: any = null;
    try {
      created = await (prisma as any).labelSize.create({
        data: {
          name: trimmed,
          order: nextOrder,
        },
      });
    } catch {
      const rows: any = await prisma.$queryRawUnsafe(
        'INSERT INTO "LabelSize" (name, "order", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        trimmed,
        nextOrder
      );
      created = Array.isArray(rows) && rows.length > 0 ? rows[0] : { id: Date.now(), name: trimmed, order: nextOrder };
    }

    return res.status(201).json({
      ...created,
      productCount: 0,
    });
  } catch (error: any) {
    console.error("POST /api/label-sizes error:", error);
    return res.status(500).json({ error: error.message || "Failed to create label size" });
  }
});

// PUT /api/label-sizes/:id (Admin only)
labelSizesRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Label size name is required" });
    }

    const trimmed = name.trim();
    let updated: any = null;
    try {
      updated = await (prisma as any).labelSize.update({
        where: { id },
        data: { name: trimmed },
      });
    } catch {
      const rows: any = await prisma.$queryRawUnsafe(
        'UPDATE "LabelSize" SET name = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
        trimmed,
        id
      );
      updated = Array.isArray(rows) && rows.length > 0 ? rows[0] : { id, name: trimmed, order: 0 };
    }

    const products = await prisma.product.findMany({ select: { sizes: true } });
    const productCount = products.filter((p) => p.sizes?.includes(trimmed)).length;

    return res.json({
      ...updated,
      productCount,
    });
  } catch (error: any) {
    console.error("PUT /api/label-sizes error:", error);
    return res.status(500).json({ error: error.message || "Failed to update label size" });
  }
});

// DELETE /api/label-sizes/:id (Admin only)
labelSizesRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
      await (prisma as any).labelSize.delete({ where: { id } });
    } catch {
      await prisma.$executeRawUnsafe('DELETE FROM "LabelSize" WHERE id = $1', id);
    }

    return res.json({ success: true, message: "Label size deleted" });
  } catch (error: any) {
    console.error("DELETE /api/label-sizes error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete label size" });
  }
});
