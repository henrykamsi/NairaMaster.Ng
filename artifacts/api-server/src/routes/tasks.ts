import { Router } from "express";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { db, usersTable, tasksTable, submissionsTable, transactionsTable, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { formatTask, createNotificationForAll } from "../lib/helpers";

const router = Router();

async function getSettings() {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    taskCreationFee: parseFloat(map["task_creation_fee"] ?? "1000"),
    promoFee: parseFloat(map["promo_fee"] ?? "800"),
    dailyDueAmount: parseFloat(map["daily_due_amount"] ?? "400"),
    minWithdrawal: parseFloat(map["min_withdrawal"] ?? "3000"),
    withdrawalFee: parseFloat(map["withdrawal_fee"] ?? "300"),
    dailyDuesEnabled: (map["daily_dues_enabled"] ?? "true") === "true",
  };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(ne(tasksTable.status, "deleted"))
    .orderBy(desc(tasksTable.createdAt));

  const userId = req.user!.userId;
  const submissions = await db
    .select({ taskId: submissionsTable.taskId })
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId));

  const performedSet = new Set(submissions.map(s => s.taskId));

  res.json(tasks.map(t => formatTask(t, performedSet.has(t.id))));
});

router.get("/tasks/my", requireAuth, async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(
      eq(tasksTable.uploadedByUserId, req.user!.userId),
      ne(tasksTable.status, "deleted")
    ))
    .orderBy(desc(tasksTable.createdAt));

  res.json(tasks.map(t => formatTask(t, false)));
});

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  const { title, description, link, socialMedia, category, tags, maxPerformers, reward } = req.body;
  const userId = req.user!.userId;
  const isAdmin = req.user!.isAdmin;

  if (!title || !description || !link || !socialMedia || !category) {
    res.status(400).json({ error: "All required fields must be provided" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const settings = await getSettings();
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const fee = isMonday ? settings.promoFee : settings.taskCreationFee;

  if (!isAdmin) {
    const balance = parseFloat(user.balance as string);
    if (balance < fee) {
      res.status(400).json({ error: `Insufficient balance. You need at least ₦${fee} to create a task.` });
      return;
    }

    // Deduct fee
    const newBalance = balance - fee;
    await db.update(usersTable)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(usersTable.id, userId));

    // Record transaction
    await db.insert(transactionsTable).values({
      userId,
      type: "debit",
      amount: fee.toFixed(2),
      description: `Task creation fee${isMonday ? " (Monday promo)" : ""}`,
    });
  }

  const [task] = await db.insert(tasksTable).values({
    title,
    description,
    link,
    socialMedia,
    category,
    tags: Array.isArray(tags) ? tags : [],
    maxPerformers: isAdmin ? (maxPerformers ?? 50) : 20,
    reward: reward ? reward.toFixed(2) : "0",
    uploadedByAdmin: isAdmin,
    uploadedByUserId: isAdmin ? null : userId,
  }).returning();

  // Notify all users of new task
  await createNotificationForAll("New Task Available", `A new task has been posted: ${title}`, "task");

  res.status(201).json(formatTask(task, false));
});

router.get("/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);
  if (isNaN(taskId)) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
  if (!task || task.status === "deleted") {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [sub] = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.taskId, taskId), eq(submissionsTable.userId, req.user!.userId)))
    .limit(1);

  res.json(formatTask(task, !!sub));
});

router.patch("/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  if (!req.user!.isAdmin) {
    res.status(403).json({ error: "Admin required" });
    return;
  }
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);
  const { title, description, link, socialMedia, category, tags, maxPerformers, reward, status } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (link !== undefined) updates.link = link;
  if (socialMedia !== undefined) updates.socialMedia = socialMedia;
  if (category !== undefined) updates.category = category;
  if (tags !== undefined) updates.tags = tags;
  if (maxPerformers !== undefined) updates.maxPerformers = maxPerformers;
  if (reward !== undefined) updates.reward = parseFloat(reward).toFixed(2);
  if (status !== undefined) updates.status = status;

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, taskId)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task, false));
});

router.delete("/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  if (!req.user!.isAdmin) {
    res.status(403).json({ error: "Admin required" });
    return;
  }
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);
  await db.update(tasksTable).set({ status: "deleted", updatedAt: new Date() }).where(eq(tasksTable.id, taskId));
  res.json({ message: "Task deleted" });
});

router.post("/tasks/:taskId/renew", requireAuth, async (req, res): Promise<void> => {
  if (!req.user!.isAdmin) {
    res.status(403).json({ error: "Admin required" });
    return;
  }
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);

  // Reset performer count and delete all submissions so everyone can do it again
  await db.update(tasksTable).set({ performerCount: 0, status: "active", updatedAt: new Date() }).where(eq(tasksTable.id, taskId));
  await db.delete(submissionsTable).where(eq(submissionsTable.taskId, taskId));

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task, false));
});

router.post("/tasks/:taskId/extend", requireAuth, async (req, res): Promise<void> => {
  if (!req.user!.isAdmin) {
    res.status(403).json({ error: "Admin required" });
    return;
  }
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);
  const { additionalPerformers } = req.body;

  const [task] = await db
    .update(tasksTable)
    .set({ maxPerformers: sql`${tasksTable.maxPerformers} + ${additionalPerformers}`, updatedAt: new Date() })
    .where(eq(tasksTable.id, taskId))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task, false));
});

router.post("/tasks/:taskId/perform", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const taskId = parseInt(raw, 10);
  const userId = req.user!.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check if shadow banned / restricted
  if (user.status === "shadow_banned") {
    res.status(403).json({ error: "Not available in your country" });
    return;
  }
  if (user.status === "restricted") {
    const restrictions = user.restrictions as Record<string, boolean | string> | null;
    if (restrictions?.noPerformTask) {
      res.status(403).json({ error: user.restrictionMessage ?? "You are restricted from performing tasks" });
      return;
    }
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
  if (!task || task.status === "deleted") {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (task.performerCount >= task.maxPerformers) {
    res.status(400).json({ error: "This task has reached its maximum number of performers" });
    return;
  }

  // Check already performed
  const [existing] = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.taskId, taskId), eq(submissionsTable.userId, userId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "You have already performed this task" });
    return;
  }

  // Create submission
  const [submission] = await db.insert(submissionsTable).values({
    taskId,
    userId,
    status: "pending",
    screenshots: [],
  }).returning();

  // Increment performer count
  await db.update(tasksTable).set({ performerCount: sql`${tasksTable.performerCount} + 1`, updatedAt: new Date() }).where(eq(tasksTable.id, taskId));

  res.json({
    id: submission.id,
    taskId: submission.taskId,
    userId: submission.userId,
    status: submission.status,
    screenshots: submission.screenshots ?? [],
    declineReason: submission.declineReason ?? null,
    task: formatTask(task, true),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  });
});

export default router;
