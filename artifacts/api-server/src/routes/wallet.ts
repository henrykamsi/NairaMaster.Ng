import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    userId: user.id,
    balance: parseFloat(user.balance as string),
    lastUpdated: user.updatedAt.toISOString(),
  });
});

router.post("/wallet/refresh", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    userId: user.id,
    balance: parseFloat(user.balance as string),
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/wallet/transactions", requireAuth, async (req, res): Promise<void> => {
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.user!.userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);

  res.json(transactions.map(t => ({
    id: t.id,
    type: t.type,
    amount: parseFloat(t.amount as string),
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  })));
});

export default router;
