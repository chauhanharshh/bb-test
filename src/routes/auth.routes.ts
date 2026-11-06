import { Router, Request, Response } from "express";
import {
  verifyAdminCredentials,
  createSessionToken,
  verifySessionToken,
  updateAdminPassword,
  getStoredAdminCredential,
} from "../lib/auth.js";
import { config } from "../config.js";

export const authRouter = Router();

// GET /api/admin/auth - Check admin session status
authRouter.get("/", async (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.[config.adminCookieName] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : null);

    const isAuthenticated = await verifySessionToken(token);
    return res.json({
      authenticated: isAuthenticated,
      username: config.adminUsername,
    });
  } catch {
    return res.json({ authenticated: false, username: config.adminUsername });
  }
});

// POST /api/admin/auth - Login / Logout / Change-Password
authRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { action, username, password, currentPassword, newPassword } = req.body || {};

    // 1. LOGOUT
    if (action === "logout") {
      res.clearCookie(config.adminCookieName, {
        path: "/",
        sameSite: "lax",
      });
      return res.json({ success: true, message: "Logged out successfully" });
    }

    // 2. CHANGE PASSWORD
    if (action === "change_password") {
      const sessionToken = req.cookies?.[config.adminCookieName];
      const isAuth = await verifySessionToken(sessionToken);
      if (!isAuth) {
        return res.status(401).json({ success: false, error: "Unauthorized: Please log in first." });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: "Current and new password are required." });
      }

      const result = await updateAdminPassword(currentPassword, newPassword);
      if (!result.success) {
        return res.status(400).json(result);
      }

      if (result.newPasswordHash) {
        const newToken = createSessionToken(result.newPasswordHash);
        res.cookie(config.adminCookieName, newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: config.sessionTtlMs,
        });
      }

      return res.json({ success: true, message: "Password updated successfully." });
    }

    // 3. LOGIN
    const inputUsername = typeof username === "string" ? username : config.adminUsername;
    const inputPassword = typeof password === "string" ? password : "";

    const isValid = await verifyAdminCredentials(inputUsername, inputPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid admin password." });
    }

    const cred = await getStoredAdminCredential();
    const token = createSessionToken(cred.passwordHash);

    res.cookie(config.adminCookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: config.sessionTtlMs,
    });

    return res.json({
      success: true,
      message: "Admin authentication successful",
      token,
      username: config.adminUsername,
    });
  } catch (error) {
    console.error("Auth POST error:", error);
    return res.status(500).json({ success: false, error: "Internal authentication error" });
  }
});

