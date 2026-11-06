import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const productsRouter = Router();

// GET /api/products
productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { category, search, minPrice, maxPrice, ageGroup } = req.query;

    const where: any = {};

    if (typeof category === "string" && category && category !== "All Categories") {
      where.OR = [
        { category: { equals: category, mode: "insensitive" } },
        { categories: { has: category } },
      ];
    }

    if (typeof search === "string" && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    if (typeof ageGroup === "string" && ageGroup) {
      where.ageGroups = { has: ageGroup };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(String(minPrice));
      if (maxPrice) where.price.lte = parseFloat(String(maxPrice));
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id
productsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products (Admin only)
productsRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock, category, categories, ageGroup, ageGroups, style, imageUrl } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const finalCategories: string[] = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: any) => String(c).trim()).filter(Boolean)
      : (category ? [String(category).trim()] : ["Girls"]);

    const finalAgeGroups: string[] = Array.isArray(ageGroups) && ageGroups.length > 0
      ? ageGroups.map((a: any) => String(a).trim()).filter(Boolean)
      : (ageGroup ? [String(ageGroup).trim()] : ["0-1 Yrs"]);

    const primaryCategory = finalCategories[0] || "Girls";
    const primaryAgeGroup = finalAgeGroups.join(", ") || "0-1 Yrs";

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description ? String(description).trim() : null,
        price: parseFloat(price) || 0,
        stock: parseInt(stock, 10) || 0,
        category: primaryCategory,
        categories: finalCategories,
        ageGroup: primaryAgeGroup,
        ageGroups: finalAgeGroups,
        style: style || "Regular",
        imageUrl: imageUrl || null,
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id (Admin only)
productsRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const { name, description, price, stock, category, categories, ageGroup, ageGroups, style, imageUrl } = req.body;

    const finalCategories: string[] = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: any) => String(c).trim()).filter(Boolean)
      : (category ? [String(category).trim()] : ["Girls"]);

    const finalAgeGroups: string[] = Array.isArray(ageGroups) && ageGroups.length > 0
      ? ageGroups.map((a: any) => String(a).trim()).filter(Boolean)
      : (ageGroup ? [String(ageGroup).trim()] : ["0-1 Yrs"]);

    const primaryCategory = finalCategories[0] || "Girls";
    const primaryAgeGroup = finalAgeGroups.join(", ") || "0-1 Yrs";

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock, 10) : undefined,
        category: primaryCategory,
        categories: finalCategories,
        ageGroup: primaryAgeGroup,
        ageGroups: finalAgeGroups,
        style: style || "Regular",
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      },
    });

    return res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id (Admin only)
productsRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

