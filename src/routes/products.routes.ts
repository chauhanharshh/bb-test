import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const productsRouter = Router();

// GET /api/products
productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    await ensureProductColumns();
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
    await ensureProductColumns();
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

    const enrichedProduct = {
      ...product,
      sizes: Array.isArray((product as any).sizes) ? (product as any).sizes : [],
    };

    return res.json(enrichedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

let productColumnsEnsured = false;
async function ensureProductColumns() {
  if (productColumnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);
    productColumnsEnsured = true;
  } catch (err) {
    console.warn("Could not ensure images/sizes columns on Product table:", err);
  }
}

// POST /api/products (Admin only)
productsRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await ensureProductColumns();
    const { name, description, price, stock, category, categories, ageGroup, ageGroups, style, imageUrl, images, sizes } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const finalCategories: string[] = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: any) => String(c).trim()).filter(Boolean)
      : (category ? [String(category).trim()] : ["Girls"]);

    const finalAgeGroups: string[] = Array.isArray(ageGroups) && ageGroups.length > 0
      ? ageGroups.map((a: any) => String(a).trim()).filter(Boolean)
      : (ageGroup ? [String(ageGroup).trim()] : ["0-1 Yrs"]);

    const finalImages: string[] = Array.isArray(images) && images.length > 0
      ? images.map((img: any) => String(img).trim()).filter(Boolean)
      : (imageUrl ? [String(imageUrl).trim()] : []);

    const finalSizes: string[] = Array.isArray(sizes)
      ? sizes.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    const primaryCategory = finalCategories[0] || "Girls";
    const primaryAgeGroup = finalAgeGroups.join(", ") || "0-1 Yrs";
    const primaryImage = finalImages[0] || (imageUrl ? String(imageUrl).trim() : null);

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
        imageUrl: primaryImage,
        images: finalImages,
        sizes: finalSizes,
      } as any,
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
    await ensureProductColumns();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const { name, description, price, stock, category, categories, ageGroup, ageGroups, style, imageUrl, images, sizes } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock, 10) || 0;
    if (style !== undefined) updateData.style = style || "Regular";

    if (sizes !== undefined) {
      updateData.sizes = Array.isArray(sizes)
        ? sizes.map((s: any) => String(s).trim()).filter(Boolean)
        : [];
    }

    if (categories !== undefined || category !== undefined) {
      const finalCategories: string[] = Array.isArray(categories) && categories.length > 0
        ? categories.map((c: any) => String(c).trim()).filter(Boolean)
        : (category ? [String(category).trim()] : ["Girls"]);
      updateData.categories = finalCategories;
      updateData.category = finalCategories[0] || "Girls";
    }

    if (ageGroups !== undefined || ageGroup !== undefined) {
      const finalAgeGroups: string[] = Array.isArray(ageGroups) && ageGroups.length > 0
        ? ageGroups.map((a: any) => String(a).trim()).filter(Boolean)
        : (ageGroup ? [String(ageGroup).trim()] : ["0-1 Yrs"]);
      updateData.ageGroups = finalAgeGroups;
      updateData.ageGroup = finalAgeGroups.join(", ") || "0-1 Yrs";
    }

    if (images !== undefined || imageUrl !== undefined) {
      const finalImages: string[] = Array.isArray(images) && images.length > 0
        ? images.map((img: any) => String(img).trim()).filter(Boolean)
        : (imageUrl ? [String(imageUrl).trim()] : []);
      updateData.images = finalImages;
      updateData.imageUrl = finalImages[0] || (imageUrl ? String(imageUrl).trim() : null);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
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

