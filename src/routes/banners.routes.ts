import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const bannersRouter = Router();

// GET /api/banners
bannersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === "true";
    const banners = await prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return res.json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return res.status(500).json({ error: "Failed to fetch banners" });
  }
});

// POST /api/banners (Admin only)
bannersRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { imageUrl, title, alt, linkUrl, order, isActive } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const banner = await prisma.banner.create({
      data: {
        imageUrl,
        title: title || "",
        alt: alt || "Babybloom Banner",
        linkUrl: linkUrl || "/shop",
        order: typeof order === "number" ? order : parseInt(order) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json(banner);
  } catch (error) {
    console.error("Error creating banner:", error);
    return res.status(500).json({ error: "Failed to create banner" });
  }
});

// PUT /api/banners/:id (Admin only)
bannersRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid banner ID" });

    const { imageUrl, title, alt, linkUrl, order, isActive } = req.body;

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        title: title !== undefined ? title : undefined,
        alt: alt !== undefined ? alt : undefined,
        linkUrl: linkUrl !== undefined ? linkUrl : undefined,
        order: order !== undefined ? (typeof order === "number" ? order : parseInt(order) || 0) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return res.json(banner);
  } catch (error) {
    console.error("Error updating banner:", error);
    return res.status(500).json({ error: "Failed to update banner" });
  }
});

// DELETE /api/banners/:id (Admin only)
bannersRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid banner ID" });

    await prisma.banner.delete({ where: { id } });
    return res.json({ success: true, message: "Banner deleted" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return res.status(500).json({ error: "Failed to delete banner" });
  }
});

