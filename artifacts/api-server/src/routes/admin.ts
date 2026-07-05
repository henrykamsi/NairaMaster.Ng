import { Router } from "express";
import { eq, desc, or, ilike, and, sql, ne } from "drizzle-orm";
import {
  db, usersTable, tasksTable, submissionsTable, withdrawalsTable,
  dailyDuesTable, transactionsTable, notificationsTable, settingsTable
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { formatUser, formatTask, createNotification } from "../lib/helpers";

const router = Router();

// ---- ADMIN STATS ----
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalTasksResult] = await db.select({ count: sql<number>`count(*)` }).from(tasksTable).where(ne(tasksTable.status, "deleted"));
  const [totalSubsResult] = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable);
  const [pendingSubsResult] = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.status, "pending"));
  const [totalWithdrawalsResult] = await db.select({ count: sql<number>`count(*)` }).from(withdrawalsTable);
  const [pendingWithdrawalsResult] = await db.select({ count: sql<number>`count(*)` }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));

  // Revenue = total task creation fees + withdrawal fees
  const revenueRows = await db.select({ amount: transactionsTable.amount }).from(transactionsTable).where(eq(transactionsTable.type, "fee"));
  const totalRevenue = revenueRows.reduce((sum, r) => sum + parseFloat(r.amount as string), 0);

  res.json({
    totalUsers: Number(totalUsersResult.count),
    totalTasks: Number(totalTasksResult.count),
    totalSubmissions: Number(totalSubsResult.count),
    pendingSubmissions: Number(pendingSubsResult.count),
    totalWithdrawals: Number(totalWithdrawalsResult.count),
    pendingWithdrawals: Number(pendingWithdrawalsResult.count),
    totalRevenue,
  });
});

// ---- ADMIN USERS ----
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { search, sort, status } = req.query as Record<string, string>;
  let query = db.select().from(usersTable);

  let users = await db.select().from(usersTable).orderBy(
    sort === "oldest" ? usersTable.createdAt : desc(usersTable.createdAt)
  );

  if (search) {
    const term = search.toLowerCase();
    users = users.filter(u =>
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  }

  if (status) {
    users = users.filter(u => u.status === status);
  }

  // Count online/offline (online = lastSeenAt within 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineUsers = users.filter(u => u.lastSeenAt && u.lastSeenAt > fiveMinutesAgo).length;
  const offlineUsers = users.length - onlineUsers;

  // Get task counts per user
  const taskCounts = await db.select({
    userId: tasksTable.uploadedByUserId,
    count: sql<number>`count(*)`
  }).from(tasksTable).groupBy(tasksTable.uploadedByUserId);

  const subCounts = await db.select({
    userId: submissionsTable.userId,
    count: sql<number>`count(*)`
  }).from(submissionsTable).groupBy(submissionsTable.userId);

  const taskCountMap = new Map(taskCounts.map(t => [t.userId, Number(t.count)]));
  const subCountMap = new Map(subCounts.map(s => [s.userId, Number(s.count)]));

  res.json({
    users: users.map(u => ({
      ...formatUser(u),
      taskCount: taskCountMap.get(u.id) ?? 0,
      submissionCount: subCountMap.get(u.id) ?? 0,
    })),
    totalUsers: users.length,
    onlineUsers,
    offlineUsers,
  });
});

router.get("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasksTable).where(eq(tasksTable.uploadedByUserId, userId));
  const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.userId, userId));

  res.json({
    ...formatUser(user),
    taskCount: Number(taskCount.count),
    submissionCount: Number(subCount.count),
  });
});

router.post("/admin/users/:userId/block", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { weeks, reason } = req.body;

  if (!weeks || weeks < 1) {
    res.status(400).json({ error: "Number of weeks is required" });
    return;
  }

  const until = new Date();
  until.setDate(until.getDate() + weeks * 7);

  await db.update(usersTable).set({
    status: "blocked",
    statusReason: reason ?? null,
    statusUntil: until,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  await createNotification(userId, "Account Blocked", `Your account has been blocked${reason ? ": " + reason : ""}.`, "block");
  res.json({ message: "User blocked" });
});

router.post("/admin/users/:userId/suspend", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { days, reason } = req.body;

  if (!days || days < 1) {
    res.status(400).json({ error: "Number of days is required" });
    return;
  }

  const until = new Date();
  until.setDate(until.getDate() + days);

  await db.update(usersTable).set({
    status: "suspended",
    statusReason: reason ?? null,
    statusUntil: until,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  await createNotification(userId, "Account Suspended", `Your account has been suspended for ${days} day(s)${reason ? ": " + reason : ""}.`, "suspend");
  res.json({ message: "User suspended" });
});

router.post("/admin/users/:userId/shadow-ban", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  await db.update(usersTable).set({
    status: "shadow_banned",
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  res.json({ message: "User shadow banned" });
});

router.post("/admin/users/:userId/restrict", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { restrictions, message } = req.body;

  await db.update(usersTable).set({
    status: "restricted",
    restrictions,
    restrictionMessage: message ?? null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  await createNotification(userId, "Account Restricted", message ?? "Your account has been restricted.", "restrict");
  res.json({ message: "User restricted" });
});

router.post("/admin/users/:userId/lift", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  await db.update(usersTable).set({
    status: "active",
    statusReason: null,
    statusUntil: null,
    restrictions: null,
    restrictionMessage: null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  await createNotification(userId, "Account Restored", "Your account restrictions have been lifted.", "info");
  res.json({ message: "Restriction lifted" });
});

router.post("/admin/users/:userId/score", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { score } = req.body;

  if (score === undefined || score === null) {
    res.status(400).json({ error: "Score is required" });
    return;
  }

  let newStatus: string | undefined;
  // Auto-disable based on score
  if (score < 10) {
    // Disable for 1 week
    const until = new Date();
    until.setDate(until.getDate() + 7);
    await db.update(usersTable).set({
      score,
      status: "disabled",
      statusReason: "Score below 10",
      statusUntil: until,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));
  } else if (score < 15) {
    // Disable for 24 hours
    const until = new Date();
    until.setHours(until.getHours() + 24);
    await db.update(usersTable).set({
      score,
      status: "disabled",
      statusReason: "Score below 15",
      statusUntil: until,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));
  } else {
    await db.update(usersTable).set({
      score,
      status: "active",
      statusReason: null,
      statusUntil: null,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await createNotification(userId, "Score Updated", `Your score has been updated to ${score}.`, "info");

  res.json({
    userId: user.id,
    score: user.score,
    updatedAt: user.updatedAt.toISOString(),
  });
});

router.post("/admin/users/:userId/credit", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = parseFloat(user.balance as string) + amount;
  await db.update(usersTable).set({
    balance: newBalance.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    userId,
    type: "credit",
    amount: amount.toFixed(2),
    description: description ?? "Admin credit",
  });

  await createNotification(userId, "Wallet Credited", `Your wallet has been credited with ₦${amount}.`, "credit");

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json({
    userId: updated!.id,
    balance: parseFloat(updated!.balance as string),
    lastUpdated: updated!.updatedAt.toISOString(),
  });
});

// ---- ADMIN WITHDRAWALS ----
router.get("/admin/withdrawals", requireAdmin, async (_req, res): Promise<void> => {
  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .orderBy(desc(withdrawalsTable.createdAt));

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(withdrawals.map(w => ({
    id: w.id,
    userId: w.userId,
    amount: parseFloat(w.amount as string),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    note: w.note ?? null,
    user: formatUser(userMap.get(w.userId)!),
    createdAt: w.createdAt.toISOString(),
  })));
});

router.post("/admin/withdrawals/:withdrawalId/approve", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.withdrawalId) ? req.params.withdrawalId[0] : req.params.withdrawalId;
  const withdrawalId = parseInt(raw, 10);
  const { note } = req.body;

  // Only transition from pending/under_review — prevent double-processing
  const [existing] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, withdrawalId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (existing.status === "approved" || existing.status === "declined") {
    res.status(409).json({ error: `Withdrawal already ${existing.status}` });
    return;
  }

  const [w] = await db.update(withdrawalsTable).set({
    status: "approved",
    note: note ?? null,
    updatedAt: new Date(),
  }).where(eq(withdrawalsTable.id, withdrawalId)).returning();

  await createNotification(w!.userId, "Withdrawal Approved", `Your withdrawal of ₦${w!.amount} has been approved.`, "withdrawal");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, w!.userId)).limit(1);
  res.json({
    id: w!.id,
    userId: w!.userId,
    amount: parseFloat(w!.amount as string),
    bankName: w!.bankName,
    accountNumber: w!.accountNumber,
    accountName: w!.accountName,
    status: w!.status,
    note: w!.note ?? null,
    user: formatUser(user!),
    createdAt: w!.createdAt.toISOString(),
  });
});

router.post("/admin/withdrawals/:withdrawalId/decline", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.withdrawalId) ? req.params.withdrawalId[0] : req.params.withdrawalId;
  const withdrawalId = parseInt(raw, 10);
  const { note } = req.body;

  // Only transition from pending/under_review — prevent double-refund
  const [existing] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, withdrawalId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (existing.status === "approved" || existing.status === "declined") {
    res.status(409).json({ error: `Withdrawal already ${existing.status}` });
    return;
  }

  const [w] = await db.update(withdrawalsTable).set({
    status: "declined",
    note: note ?? null,
    updatedAt: new Date(),
  }).where(eq(withdrawalsTable.id, withdrawalId)).returning();

  // Refund the amount + fee to user (idempotent now — only runs once)
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, w!.userId)).limit(1);
  if (user) {
    const refundAmount = parseFloat(w!.amount as string) + 300;
    const newBalance = parseFloat(user.balance as string) + refundAmount;
    await db.update(usersTable).set({ balance: newBalance.toFixed(2) }).where(eq(usersTable.id, w!.userId));
    await db.insert(transactionsTable).values({
      userId: w!.userId,
      type: "credit",
      amount: refundAmount.toFixed(2),
      description: "Withdrawal declined - refunded",
    });
    await createNotification(w!.userId, "Withdrawal Declined", `Your withdrawal of ₦${w!.amount} has been declined. Amount refunded.`, "withdrawal");
  }

  res.json({
    id: w.id,
    userId: w.userId,
    amount: parseFloat(w.amount as string),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    note: w.note ?? null,
    user: formatUser(user!),
    createdAt: w.createdAt.toISOString(),
  });
});

// ---- ADMIN SUBMISSIONS ----
router.get("/admin/submissions", requireAdmin, async (_req, res): Promise<void> => {
  const subs = await db.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt));
  const users = await db.select().from(usersTable);
  const tasks = await db.select().from(tasksTable);

  const userMap = new Map(users.map(u => [u.id, u]));
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  res.json(subs.map(s => ({
    id: s.id,
    taskId: s.taskId,
    userId: s.userId,
    status: s.status,
    screenshots: s.screenshots ?? [],
    task: taskMap.has(s.taskId) ? formatTask(taskMap.get(s.taskId)!, false) : null,
    user: userMap.has(s.userId) ? formatUser(userMap.get(s.userId)!) : null,
    createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/admin/submissions/:submissionId/approve", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.submissionId) ? req.params.submissionId[0] : req.params.submissionId;
  const submissionId = parseInt(raw, 10);

  const [sub] = await db.update(submissionsTable).set({
    status: "approved",
    updatedAt: new Date(),
  }).where(eq(submissionsTable.id, submissionId)).returning();

  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  // Optionally credit user with task reward
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, sub.taskId)).limit(1);
  if (task && task.reward && parseFloat(task.reward as string) > 0) {
    const reward = parseFloat(task.reward as string);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sub.userId)).limit(1);
    if (user) {
      const newBalance = parseFloat(user.balance as string) + reward;
      await db.update(usersTable).set({ balance: newBalance.toFixed(2) }).where(eq(usersTable.id, sub.userId));
      await db.insert(transactionsTable).values({
        userId: sub.userId,
        type: "task_reward",
        amount: reward.toFixed(2),
        description: `Task reward: ${task.title}`,
      });
    }
  }

  await createNotification(sub.userId, "Task Approved", "Your task submission has been approved!", "task");
  res.json({ message: "Submission approved" });
});

router.post("/admin/submissions/:submissionId/decline", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.submissionId) ? req.params.submissionId[0] : req.params.submissionId;
  const submissionId = parseInt(raw, 10);
  const { reason } = req.body;

  const [sub] = await db.update(submissionsTable).set({
    status: "declined",
    declineReason: reason ?? null,
    updatedAt: new Date(),
  }).where(eq(submissionsTable.id, submissionId)).returning();

  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  await createNotification(sub.userId, "Task Declined", `Your task submission was declined${reason ? ": " + reason : ""}.`, "task");
  res.json({ message: "Submission declined" });
});

// ---- ADMIN DAILY DUES ----
router.get("/admin/daily-dues", requireAdmin, async (req, res): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  if (search) {
    const term = search.toLowerCase();
    users = users.filter(u =>
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  }

  const allDues = await db.select().from(dailyDuesTable);

  res.json(users.map(u => {
    const userDues = allDues.filter(d => d.userId === u.id);
    const formatted = userDues.map(d => ({
      id: d.id,
      userId: d.userId,
      date: d.date,
      paid: d.paid,
      amount: parseFloat(d.amount as string),
    }));
    return {
      userId: u.id,
      user: formatUser(u),
      dues: formatted,
      totalOwed: formatted.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0),
      totalPaid: formatted.filter(d => d.paid).reduce((s, d) => s + d.amount, 0),
    };
  }));
});

router.get("/admin/daily-dues/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const dues = await db.select().from(dailyDuesTable).where(eq(dailyDuesTable.userId, userId)).orderBy(desc(dailyDuesTable.createdAt));
  const formatted = dues.map(d => ({
    id: d.id,
    userId: d.userId,
    date: d.date,
    paid: d.paid,
    amount: parseFloat(d.amount as string),
  }));

  res.json({
    userId: user.id,
    user: formatUser(user),
    dues: formatted,
    totalOwed: formatted.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0),
    totalPaid: formatted.filter(d => d.paid).reduce((s, d) => s + d.amount, 0),
  });
});

router.patch("/admin/daily-dues/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { dates } = req.body;

  if (!Array.isArray(dates)) {
    res.status(400).json({ error: "Dates array is required" });
    return;
  }

  for (const date of dates) {
    const [existing] = await db.select().from(dailyDuesTable)
      .where(and(eq(dailyDuesTable.userId, userId), eq(dailyDuesTable.date, date)))
      .limit(1);

    if (existing) {
      await db.update(dailyDuesTable).set({ paid: true }).where(eq(dailyDuesTable.id, existing.id));
    } else {
      await db.insert(dailyDuesTable).values({ userId, date, paid: true });
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const dues = await db.select().from(dailyDuesTable).where(eq(dailyDuesTable.userId, userId)).orderBy(desc(dailyDuesTable.createdAt));
  const formatted = dues.map(d => ({
    id: d.id, userId: d.userId, date: d.date, paid: d.paid,
    amount: parseFloat(d.amount as string),
  }));

  res.json({
    userId,
    user: formatUser(user!),
    dues: formatted,
    totalOwed: formatted.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0),
    totalPaid: formatted.filter(d => d.paid).reduce((s, d) => s + d.amount, 0),
  });
});

export default router;
