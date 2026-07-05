import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, updatesTable, commentsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { createNotificationForAll } from "../lib/helpers";

const router = Router();

router.get("/updates", requireAuth, async (_req, res): Promise<void> => {
  const updates = await db.select().from(updatesTable).orderBy(desc(updatesTable.createdAt));
  const comments = await db.select().from(commentsTable).orderBy(desc(commentsTable.createdAt));
  const users = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable);

  const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

  const result = updates.map(u => ({
    id: u.id,
    title: u.title,
    content: u.content,
    comments: comments
      .filter(c => c.updateId === u.id)
      .map(c => ({
        id: c.id,
        content: c.content,
        userId: c.userId,
        userName: userMap.get(c.userId) ?? "Unknown",
        createdAt: c.createdAt.toISOString(),
      })),
    createdAt: u.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/updates", requireAdmin, async (req, res): Promise<void> => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }
  const [update] = await db.insert(updatesTable).values({ title, content }).returning();

  // Notify all users
  await createNotificationForAll("New Update Posted", title, "update");

  res.status(201).json({
    id: update.id,
    title: update.title,
    content: update.content,
    comments: [],
    createdAt: update.createdAt.toISOString(),
  });
});

router.post("/updates/:updateId/comments", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.updateId) ? req.params.updateId[0] : req.params.updateId;
  const updateId = parseInt(raw, 10);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "Comment content is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  const [comment] = await db.insert(commentsTable).values({
    updateId,
    userId: req.user!.userId,
    content,
  }).returning();

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    userId: comment.userId,
    userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;
