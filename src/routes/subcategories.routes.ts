import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAdminAuth } from "../lib/auth.js";

export const subcategoriesRouter = Router();

// DELETE /api/subcategories/:id - Delete subcategory (Admin only)
subcategoriesRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid subcategory ID" });
    }

    const existing = await prisma.subcategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    await prisma.subcategory.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting subcategory:", error);
    return res.status(500).json({ error: error.message || "Failed to delete subcategory" });
  }
});

