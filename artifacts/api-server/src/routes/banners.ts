import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function formatBanner(b: typeof bannersTable.$inferSelect) {
  return {
    id: b.id,
    title: b.title,
    content: b.content,
    ctaText: b.ctaText ?? null,
    ctaLink: b.ctaLink ?? null,
    intervalMinutes: b.intervalMinutes,
    active: b.active,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/banners", requireAuth, async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable).where(eq(bannersTable.active, true));
  res.json(banners.map(formatBanner));
});

router.post("/banners", requireAdmin, async (req, res): Promise<void> => {
  const { title, content, ctaText, ctaLink, intervalMinutes } = req.body;
  if (!title || !content || !intervalMinutes) {
    res.status(400).json({ error: "Title, content, and interval are required" });
    return;
  }
  const [banner] = await db.insert(bannersTable).values({
    title,
    content,
    ctaText: ctaText ?? null,
    ctaLink: ctaLink ?? null,
    intervalMinutes,
  }).returning();
  res.status(201).json(formatBanner(banner));
});

router.delete("/banners/:bannerId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.bannerId) ? req.params.bannerId[0] : req.params.bannerId;
  const bannerId = parseInt(raw, 10);
  await db.update(bannersTable).set({ active: false }).where(eq(bannersTable.id, bannerId));
  res.json({ message: "Banner removed" });
});

export default router;
