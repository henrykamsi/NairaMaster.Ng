import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, submissionsTable, tasksTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { formatTask } from "../lib/helpers";

const router = Router();

function formatSubmission(s: typeof submissionsTable.$inferSelect, task?: ReturnType<typeof formatTask>) {
  return {
    id: s.id,
    taskId: s.taskId,
    userId: s.userId,
    status: s.status,
    screenshots: s.screenshots ?? [],
    declineReason: s.declineReason ?? null,
    task: task ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/submissions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const subs = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.userId, userId))
    .orderBy(desc(submissionsTable.updatedAt));

  // Fetch tasks
  const taskIds = [...new Set(subs.map(s => s.taskId))];
  let tasksMap: Map<number, ReturnType<typeof formatTask>> = new Map();
  if (taskIds.length > 0) {
    const tasks = await db.select().from(tasksTable).where(
      taskIds.length === 1
        ? eq(tasksTable.id, taskIds[0])
        : eq(tasksTable.id, taskIds[0]) // fallback — fetched one by one below if needed
    );
    // Just fetch all tasks for the user submissions
    const allTasks = await db.select().from(tasksTable);
    allTasks.forEach(t => tasksMap.set(t.id, formatTask(t, true)));
  }

  const pending = subs.filter(s => s.status === "pending").map(s => formatSubmission(s, tasksMap.get(s.taskId)));
  const approved = subs.filter(s => s.status === "approved").map(s => formatSubmission(s, tasksMap.get(s.taskId)));
  const declined = subs.filter(s => s.status === "declined").map(s => formatSubmission(s, tasksMap.get(s.taskId)));

  res.json({ pending, approved, declined });
});

router.post("/submissions/:submissionId/screenshots", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.submissionId) ? req.params.submissionId[0] : req.params.submissionId;
  const submissionId = parseInt(raw, 10);
  const { screenshots } = req.body;

  if (!Array.isArray(screenshots) || screenshots.length === 0 || screenshots.length > 2) {
    res.status(400).json({ error: "You must upload 1-2 screenshots" });
    return;
  }

  const [sub] = await db.select().from(submissionsTable).where(
    and(eq(submissionsTable.id, submissionId), eq(submissionsTable.userId, req.user!.userId))
  ).limit(1);

  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set({ screenshots, updatedAt: new Date() })
    .where(eq(submissionsTable.id, submissionId))
    .returning();

  res.json(formatSubmission(updated));
});

router.post("/submissions/:submissionId/send", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.submissionId) ? req.params.submissionId[0] : req.params.submissionId;
  const submissionId = parseInt(raw, 10);

  const [sub] = await db.select().from(submissionsTable).where(
    and(eq(submissionsTable.id, submissionId), eq(submissionsTable.userId, req.user!.userId))
  ).limit(1);

  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (!sub.screenshots || sub.screenshots.length === 0) {
    res.status(400).json({ error: "Please upload screenshots before sending" });
    return;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(submissionsTable.id, submissionId))
    .returning();

  res.json(formatSubmission(updated));
});

export default router;
