import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const offersRouter = Router();

// GET /api/offers
offersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === "true";
    const offers = await prisma.offer.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// POST /api/offers (Admin only)
offersRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      discountPercent,
      scope,
      targetCategory,
      productIds,
      couponCode,
      bannerText,
      isActive,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const discountNum = parseFloat(discountPercent) || 0;
    const parsedProductIds = Array.isArray(productIds)
      ? productIds.map((id: any) => (typeof id === "number" ? id : parseInt(id))).filter((id: number) => !isNaN(id))
      : [];

    const offer = await prisma.offer.create({
      data: {
        title,
        description: description || null,
        discountPercent: discountNum,
        scope: scope || "SITEWIDE",
        targetCategory: targetCategory || null,
        productIds: parsedProductIds,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
        bannerText: bannerText || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    return res.status(500).json({ error: "Failed to create offer" });
  }
});

// PUT /api/offers/:id (Admin only)
offersRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid offer ID" });

    const {
      title,
      description,
      discountPercent,
      scope,
      targetCategory,
      productIds,
      couponCode,
      bannerText,
      isActive,
    } = req.body;

    const parsedProductIds = Array.isArray(productIds)
      ? productIds.map((i: any) => (typeof i === "number" ? i : parseInt(i))).filter((i: number) => !isNaN(i))
      : undefined;

    const offer = await prisma.offer.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? (description || null) : undefined,
        discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : undefined,
        scope: scope !== undefined ? scope : undefined,
        targetCategory: targetCategory !== undefined ? (targetCategory || null) : undefined,
        productIds: parsedProductIds,
        couponCode: couponCode !== undefined ? (couponCode ? couponCode.trim().toUpperCase() : null) : undefined,
        bannerText: bannerText !== undefined ? (bannerText || null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return res.json(offer);
  } catch (error) {
    console.error("Error updating offer:", error);
    return res.status(500).json({ error: "Failed to update offer" });
  }
});

// DELETE /api/offers/:id (Admin only)
offersRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid offer ID" });

    await prisma.offer.delete({ where: { id } });
    return res.json({ success: true, message: "Offer deleted" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).json({ error: "Failed to delete offer" });
  }
});

