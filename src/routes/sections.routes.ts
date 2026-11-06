import { Router, Request, Response } from "express";
import {
  dbGetAllSections,
  dbGetSectionById,
  dbCreateSection,
  dbUpdateSection,
  dbDeleteSection,
} from "../lib/sections.js";
import { requireAdminAuth } from "../lib/auth.js";

export const sectionsRouter = Router();

// GET /api/sections - List showcase sections
sectionsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === "true";
    const sections = await dbGetAllSections(activeOnly);
    res.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return res.status(500).json({ error: "Failed to fetch sections" });
  }
});

// GET /api/sections/:id - Single section
sectionsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid section ID" });
    }

    const section = await dbGetSectionById(id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    return res.json(section);
  } catch (error) {
    console.error("Error fetching section:", error);
    return res.status(500).json({ error: "Failed to fetch section" });
  }
});

// POST /api/sections - Create section (Admin only)
sectionsRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Section title is required" });
    }

    const created = await dbCreateSection(req.body);
    return res.status(201).json(created);
  } catch (error) {
    console.error("Error creating section:", error);
    return res.status(500).json({ error: "Failed to create section" });
  }
});

// PUT /api/sections/:id - Update full section (Admin only)
sectionsRouter.put("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid section ID" });
    }

    const updated = await dbUpdateSection(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Section not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating section:", error);
    return res.status(500).json({ error: "Failed to update section" });
  }
});

// PATCH /api/sections/:id - Quick partial update (Admin only)
sectionsRouter.patch("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid section ID" });
    }

    const updated = await dbUpdateSection(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Section not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error patching section:", error);
    return res.status(500).json({ error: "Failed to update section" });
  }
});

// DELETE /api/sections/:id - Delete section (Admin only)
sectionsRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid section ID" });
    }

    const success = await dbDeleteSection(id);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete section" });
    }

    return res.json({ success: true, message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error deleting section:", error);
    return res.status(500).json({ error: "Failed to delete section" });
  }
});

