import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const categoriesRouter = Router();

// GET /api/categories - List all categories with subcategories & product counts
categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const productCounts = await prisma.product.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const countMap: Record<string, number> = {};
    for (const item of productCounts) {
      countMap[item.category.toLowerCase()] = item._count.id;
    }

    const enriched = categories.map((c) => ({
      ...c,
      productCount: countMap[c.name.toLowerCase()] || 0,
    }));

    res.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res.json(enriched);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories - Create category (Admin only)
categoriesRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, imageUrl, subcategories } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: "insensitive" } },
          { slug: slug },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ error: `Category "${trimmedName}" already exists` });
    }

    let subcategoryData: { name: string; slug: string }[] = [];
    if (Array.isArray(subcategories)) {
      subcategoryData = subcategories
        .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s: string) => ({
          name: s.trim(),
          slug: slugify(s.trim()),
        }));
    }

    if (subcategoryData.length === 0) {
      subcategoryData = [{ name: "Regular", slug: "regular" }];
    }

    const uniqueSubs: { name: string; slug: string }[] = [];
    const seen = new Set<string>();
    for (const sub of subcategoryData) {
      const lower = sub.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueSubs.push(sub);
      }
    }

    const created = await prisma.category.create({
      data: {
        name: trimmedName,
        slug,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        subcategories: {
          create: uniqueSubs,
        },
      },
      include: {
        subcategories: true,
      },
    });

    return res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating category:", error);
    return res.status(500).json({ error: error.message || "Failed to create category" });
  }
});

// PUT /api/categories/:id - Update category (Admin only)
categoriesRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const { name, description, imageUrl } = req.body;
    const data: any = {};
    if (name && typeof name === "string") {
      data.name = name.trim();
      data.slug = slugify(name.trim());
    }
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl ? String(imageUrl).trim() : null;

    const updated = await prisma.category.update({
      where: { id },
      data,
      include: { subcategories: true },
    });

    return res.json(updated);
  } catch (error: any) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: error.message || "Failed to update category" });
  }
});

// DELETE /api/categories/:id - Delete category (Admin only)
categoriesRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    await prisma.category.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Category deleted" });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// POST /api/categories/:id/subcategories - Add subcategory
categoriesRouter.post("/:id/subcategories", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Subcategory name is required" });
    }

    const trimmed = name.trim();
    const slug = slugify(trimmed);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subcategories: true },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const exists = category.subcategories.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ error: `Subcategory "${trimmed}" already exists under ${category.name}` });
    }

    const created = await prisma.subcategory.create({
      data: {
        name: trimmed,
        slug,
        categoryId,
      },
    });

    return res.status(201).json(created);
  } catch (error: any) {
    console.error("Error adding subcategory:", error);
    return res.status(500).json({ error: error.message || "Failed to create subcategory" });
  }
});

