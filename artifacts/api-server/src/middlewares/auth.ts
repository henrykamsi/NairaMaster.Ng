import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but was not set.");
}

export interface AuthPayload {
  userId: number;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET!) as AuthPayload;
}

/**
 * Middleware that verifies the JWT, then does a DB lookup to confirm the user
 * is still active. Blocks requests from blocked / suspended / disabled users
 * even when a valid token is still in circulation.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.substring(7);
  let payload: AuthPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Revalidate against DB on every request
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Check if restriction has expired (auto-restore)
  if (
    (user.status === "blocked" || user.status === "suspended" || user.status === "disabled") &&
    user.statusUntil &&
    user.statusUntil <= new Date()
  ) {
    await db
      .update(usersTable)
      .set({ status: "active", statusUntil: null, statusReason: null, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    user.status = "active";
  }

  // Enforce active-status gate
  if (user.status === "blocked") {
    res.status(403).json({
      error: `You are currently blocked.${user.statusReason ? " Reason: " + user.statusReason : ""}`,
      status: "blocked",
    });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({
      error: `You are currently suspended.${user.statusReason ? " Reason: " + user.statusReason : ""}`,
      status: "suspended",
    });
    return;
  }
  if (user.status === "disabled") {
    res.status(403).json({
      error: `Your account is disabled.${user.statusReason ? " Reason: " + user.statusReason : ""}`,
      status: "disabled",
    });
    return;
  }

  // Attach real-time isAdmin value from DB (never trust token claim alone)
  req.user = { userId: user.id, isAdmin: user.isAdmin };
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
