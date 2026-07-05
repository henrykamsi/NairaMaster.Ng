import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "BGg8HLk346rawLX2dgiGU9NLZeug6Kkr0YNBpzAjNr0YNqINf5W_YiOYGAciNA5SjMIVO6nceozyiYafb2VfRlg";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "lwjB_8qsNY6Jpp8gNetR6dE2hXuUsUTyhVO589ikxIA";

webpush.setVapidDetails(
  "mailto:kamsih924@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Ensure push_subscriptions table exists
async function ensurePushTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      keys JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}
ensurePushTable().catch(console.error);

router.get("/push/vapid-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  await db.execute(sql`
    INSERT INTO push_subscriptions (user_id, endpoint, keys)
    VALUES (${req.user!.userId}, ${endpoint}, ${JSON.stringify(keys)}::jsonb)
    ON CONFLICT (endpoint) DO UPDATE SET user_id = ${req.user!.userId}
  `);
  res.json({ message: "Subscribed" });
});

router.post("/push/unsubscribe", requireAuth, async (req, res): Promise<void> => {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: "Endpoint required" }); return; }
  await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
  res.json({ message: "Unsubscribed" });
});

// Helper — send push to all subscribers (used by other routes)
export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  let rows: { endpoint: string; keys: any }[] = [];
  try {
    const result = await db.execute(sql`SELECT endpoint, keys FROM push_subscriptions`);
    rows = result.rows as any;
  } catch {
    return; // table may not exist yet
  }

  const message = JSON.stringify(payload);
  for (const row of rows) {
    const sub = { endpoint: row.endpoint, keys: typeof row.keys === "string" ? JSON.parse(row.keys) : row.keys };
    try {
      await webpush.sendNotification(sub as any, message);
    } catch (err: any) {
      // Remove invalid/expired subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`).catch(() => {});
      }
    }
  }
}

export default router;
