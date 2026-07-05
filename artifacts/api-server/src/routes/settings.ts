import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const DEFAULT_SETTINGS = {
  daily_due_amount: "400",
  task_creation_fee: "1000",
  promo_fee: "800",
  min_withdrawal: "3000",
  withdrawal_fee: "300",
  daily_dues_enabled: "true",
};

async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

function mapToResponse(map: Record<string, string>) {
  return {
    dailyDueAmount: parseFloat(map["daily_due_amount"] ?? "400"),
    taskCreationFee: parseFloat(map["task_creation_fee"] ?? "1000"),
    promoFee: parseFloat(map["promo_fee"] ?? "800"),
    minWithdrawal: parseFloat(map["min_withdrawal"] ?? "3000"),
    withdrawalFee: parseFloat(map["withdrawal_fee"] ?? "300"),
    dailyDuesEnabled: (map["daily_dues_enabled"] ?? "true") === "true",
  };
}

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  const map = await getSettingsMap();
  res.json(mapToResponse(map));
});

router.post("/settings/update", requireAdmin, async (req, res): Promise<void> => {
  const { dailyDueAmount, taskCreationFee, promoFee, minWithdrawal, withdrawalFee, dailyDuesEnabled } = req.body;

  const updates: Record<string, string> = {};
  if (dailyDueAmount !== undefined) updates["daily_due_amount"] = dailyDueAmount.toString();
  if (taskCreationFee !== undefined) updates["task_creation_fee"] = taskCreationFee.toString();
  if (promoFee !== undefined) updates["promo_fee"] = promoFee.toString();
  if (minWithdrawal !== undefined) updates["min_withdrawal"] = minWithdrawal.toString();
  if (withdrawalFee !== undefined) updates["withdrawal_fee"] = withdrawalFee.toString();
  if (dailyDuesEnabled !== undefined) updates["daily_dues_enabled"] = dailyDuesEnabled.toString();

  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value });
    }
  }

  const map = await getSettingsMap();
  res.json(mapToResponse(map));
});

export default router;
