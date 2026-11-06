import { Router, Request, Response } from "express";
import { getStoreProfile, updateStoreProfile } from "../lib/profile.js";
import { requireAdminAuth } from "../lib/auth.js";

export const profileRouter = Router();

// GET /api/profile
profileRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const profile = await getStoreProfile();
    return res.json({ success: true, profile });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return res.status(500).json({ success: false, error: "Failed to retrieve store profile" });
  }
});

// POST /api/profile (Admin only)
profileRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const updated = await updateStoreProfile(req.body);
    return res.json({ success: true, profile: updated });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return res.status(500).json({ success: false, error: "Failed to update store profile" });
  }
});

// PUT /api/profile (Admin only)
profileRouter.put("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const updated = await updateStoreProfile(req.body);
    return res.json({ success: true, profile: updated });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return res.status(500).json({ success: false, error: "Failed to update store profile" });
  }
});

