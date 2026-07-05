import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, withdrawalsTable, transactionsTable, dailyDuesTable, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router = Router();

async function getSettings() {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    minWithdrawal: parseFloat(map["min_withdrawal"] ?? "3000"),
    withdrawalFee: parseFloat(map["withdrawal_fee"] ?? "300"),
    dailyDuesEnabled: (map["daily_dues_enabled"] ?? "true") === "true",
  };
}

function formatWithdrawal(w: typeof withdrawalsTable.$inferSelect) {
  return {
    id: w.id,
    userId: w.userId,
    amount: parseFloat(w.amount as string),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    note: w.note ?? null,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.user!.userId))
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(withdrawals.map(formatWithdrawal));
});

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!amount || !bankName || !accountNumber || !accountName) {
    res.status(400).json({ error: "All withdrawal details are required" });
    return;
  }

  const settings = await getSettings();

  // Check for unpaid daily dues
  if (settings.dailyDuesEnabled) {
    const unpaidDues = await db
      .select()
      .from(dailyDuesTable)
      .where(eq(dailyDuesTable.userId, userId));
    const hasUnpaid = unpaidDues.some(d => !d.paid);
    if (hasUnpaid) {
      res.status(400).json({ error: "Please pay your daily dues before withdrawing. Contact the admin." });
      return;
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check shadow ban / restrict
  if (user.status === "shadow_banned") {
    res.status(403).json({ error: "Not available in your country" });
    return;
  }
  if (user.status === "restricted") {
    const restrictions = user.restrictions as Record<string, boolean | string> | null;
    if (restrictions?.noWithdraw) {
      res.status(403).json({ error: user.restrictionMessage ?? "You are restricted from withdrawing" });
      return;
    }
  }

  const balance = parseFloat(user.balance as string);
  const totalNeeded = amount + settings.withdrawalFee;

  if (amount < settings.minWithdrawal) {
    res.status(400).json({ error: `Minimum withdrawal is ₦${settings.minWithdrawal}` });
    return;
  }

  if (balance < totalNeeded) {
    res.status(400).json({
      error: `Insufficient balance. You need ₦${totalNeeded} (₦${amount} + ₦${settings.withdrawalFee} processing fee).`,
    });
    return;
  }

  // Execute all writes atomically in a single DB transaction
  const client = await pool.connect();
  let withdrawal: typeof withdrawalsTable.$inferSelect;
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
      [totalNeeded, userId]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [userId, "fee", settings.withdrawalFee.toFixed(2), "Withdrawal processing fee"]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [userId, "withdrawal", amount.toFixed(2), `Withdrawal to ${bankName} (${accountNumber})`]
    );
    const { rows } = await client.query(
      `INSERT INTO withdrawals (user_id, amount, bank_name, account_number, account_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) RETURNING *`,
      [userId, amount.toFixed(2), bankName, accountNumber, accountName]
    );
    withdrawal = rows[0] as typeof withdrawalsTable.$inferSelect;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json(formatWithdrawal(withdrawal));
});

export default router;
