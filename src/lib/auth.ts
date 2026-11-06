import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import prisma from "./prisma.js";
import { config } from "../config.js";

let authTableEnsured = false;

export function hashPassword(plainPassword: string): string {
  return crypto
    .createHmac("sha256", config.adminAuthSalt)
    .update(plainPassword)
    .digest("hex");
}

export async function ensureAdminAuthTable(): Promise<void> {
  if (authTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AdminCredential" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "username" TEXT NOT NULL DEFAULT 'admin',
        "passwordHash" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const defaultHash = hashPassword(config.adminInitialPassword);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminCredential" ("id", "username", "passwordHash")
       VALUES (1, $1, $2)
       ON CONFLICT ("id") DO NOTHING;`,
      config.adminUsername,
      defaultHash
    );
    authTableEnsured = true;
  } catch (err) {
    console.warn("Could not ensure AdminCredential table, falling back to default hash:", err);
  }
}

export async function getStoredAdminCredential(): Promise<{
  username: string;
  passwordHash: string;
}> {
  try {
    await ensureAdminAuthTable();
    const rows = await prisma.$queryRawUnsafe<
      Array<{ username: string; passwordHash: string }>
    >(`SELECT "username", "passwordHash" FROM "AdminCredential" WHERE "id" = 1 LIMIT 1;`);

    if (rows && rows.length > 0 && rows[0].passwordHash) {
      return {
        username: rows[0].username || config.adminUsername,
        passwordHash: rows[0].passwordHash,
      };
    }
  } catch (err) {
    console.warn("Fallback to initial admin credential:", err);
  }

  return {
    username: config.adminUsername,
    passwordHash: hashPassword(config.adminInitialPassword),
  };
}

export async function verifyAdminCredentials(
  inputUsername: string,
  inputPassword: string
): Promise<boolean> {
  const cred = await getStoredAdminCredential();
  const normalizedInputUser = inputUsername.trim().toLowerCase();
  const normalizedExpectedUser = cred.username.trim().toLowerCase();

  if (normalizedInputUser !== normalizedExpectedUser) {
    return false;
  }

  const inputHash = hashPassword(inputPassword);
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(cred.passwordHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(passwordHash: string): string {
  const exp = Date.now() + config.sessionTtlMs;
  const payload = `${config.adminUsername}:${passwordHash.slice(0, 16)}:${exp}`;
  const signature = crypto
    .createHmac("sha256", config.adminSessionSecret)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) return false;

    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSig = crypto
      .createHmac("sha256", config.adminSessionSecret)
      .update(payload)
      .digest("hex");

    const sigBufA = Buffer.from(signature, "hex");
    const sigBufB = Buffer.from(expectedSig, "hex");
    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
      return false;
    }

    const [userPart, pwdPart, expPart] = payload.split(":");
    if (!userPart || !pwdPart || !expPart) return false;

    const expTime = Number(expPart);
    if (!Number.isFinite(expTime) || Date.now() > expTime) {
      return false;
    }

    const cred = await getStoredAdminCredential();
    return userPart === config.adminUsername && pwdPart === cred.passwordHash.slice(0, 16);
  } catch {
    return false;
  }
}

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.[config.adminCookieName] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : null);

    const isAuthenticated = await verifySessionToken(token);
    if (!isAuthenticated) {
      return res.status(401).json({ error: "Unauthorized: Admin authentication required." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Admin authentication required." });
  }
}

export async function updateAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; newPasswordHash?: string }> {
  const isValid = await verifyAdminCredentials(config.adminUsername, currentPassword);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }

  await ensureAdminAuthTable();
  const newHash = hashPassword(newPassword);

  await prisma.$executeRawUnsafe(
    `UPDATE "AdminCredential" SET "passwordHash" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1;`,
    newHash
  );

  return { success: true, newPasswordHash: newHash };
}

