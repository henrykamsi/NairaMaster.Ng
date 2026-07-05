import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { generateToken, requireAuth } from "../middlewares/auth";
import { formatUser } from "../lib/helpers";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { firstName, lastName, email, gender, password } = req.body;
  if (!firstName || !lastName || !email || !gender || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    firstName,
    lastName,
    email: email.toLowerCase(),
    gender,
    passwordHash,
  }).returning();

  const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Update last login
  await db.update(usersTable).set({ lastLoginAt: new Date(), lastSeenAt: new Date() }).where(eq(usersTable.id, user.id));

  // Check status
  if (user.status === "blocked" || user.status === "suspended" || user.status === "disabled") {
    if (!user.statusUntil || user.statusUntil > new Date()) {
      const msg = user.status === "blocked"
        ? `You are currently blocked. ${user.statusReason ? "Reason: " + user.statusReason : ""}`
        : user.status === "suspended"
        ? `You are currently suspended. ${user.statusReason ? "Reason: " + user.statusReason : ""}`
        : "Your account is disabled.";
      res.status(403).json({ error: msg, status: user.status, statusReason: user.statusReason });
      return;
    }
    // Expired restriction — re-enable
    await db.update(usersTable).set({ status: "active", statusUntil: null, statusReason: null }).where(eq(usersTable.id, user.id));
    user.status = "active";
  }

  const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Update last seen
  await db.update(usersTable).set({ lastSeenAt: new Date() }).where(eq(usersTable.id, user.id));
  res.json(formatUser(user));
});

router.post("/auth/me/delete", requireAuth, async (req, res): Promise<void> => {
  const { confirmed } = req.body;
  if (!confirmed) {
    res.status(400).json({ error: "Confirmation required" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, req.user!.userId));
  res.json({ message: "Account deleted" });
});

export default router;
