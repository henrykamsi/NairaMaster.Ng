import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, docsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function formatDoc(d: typeof docsTable.$inferSelect) {
  return {
    id: d.id,
    title: d.title,
    content: d.content,
    linkUrl: d.linkUrl ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/docs", requireAuth, async (_req, res): Promise<void> => {
  const docs = await db.select().from(docsTable).orderBy(desc(docsTable.createdAt));
  res.json(docs.map(formatDoc));
});

router.post("/docs", requireAdmin, async (req, res): Promise<void> => {
  const { title, content, linkUrl } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }
  const [doc] = await db.insert(docsTable).values({ title, content, linkUrl: linkUrl ?? null }).returning();
  res.status(201).json(formatDoc(doc));
});

router.patch("/docs/:docId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const docId = parseInt(raw, 10);
  const { title, content, linkUrl } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (linkUrl !== undefined) updates.linkUrl = linkUrl;

  const [doc] = await db.update(docsTable).set(updates).where(eq(docsTable.id, docId)).returning();
  if (!doc) {
    res.status(404).json({ error: "Doc not found" });
    return;
  }
  res.json(formatDoc(doc));
});

router.delete("/docs/:docId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const docId = parseInt(raw, 10);
  await db.delete(docsTable).where(eq(docsTable.id, docId));
  res.json({ message: "Deleted" });
});

export default router;
