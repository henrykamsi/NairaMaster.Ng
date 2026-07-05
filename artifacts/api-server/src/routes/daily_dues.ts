import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, dailyDuesTable, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatDue(d: typeof dailyDuesTable.$inferSelect) {
  return {
    id: d.id,
    userId: d.userId,
    date: d.date,
    paid: d.paid,
    amount: parseFloat(d.amount as string),
  };
}

router.get("/daily-dues/me", requireAuth, async (req, res): Promise<void> => {
  const dues = await db
    .select()
    .from(dailyDuesTable)
    .where(eq(dailyDuesTable.userId, req.user!.userId))
    .orderBy(desc(dailyDuesTable.createdAt));

  const formatted = dues.map(formatDue);
  const totalOwed = formatted.filter(d => !d.paid).reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = formatted.filter(d => d.paid).reduce((sum, d) => sum + d.amount, 0);

  res.json({ dues: formatted, totalOwed, totalPaid });
});

router.get("/daily-dues/me/debt", requireAuth, async (req, res): Promise<void> => {
  const dues = await db
    .select()
    .from(dailyDuesTable)
    .where(and(eq(dailyDuesTable.userId, req.user!.userId), eq(dailyDuesTable.paid, false)));

  const totalDebt = dues.reduce((sum, d) => sum + parseFloat(d.amount as string), 0);
  res.json({ totalDebt, unpaidDays: dues.length });
});

export default router;
