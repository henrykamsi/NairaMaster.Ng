import { db, usersTable, tasksTable, submissionsTable, notificationsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

export function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    gender: user.gender,
    balance: parseFloat(user.balance as string),
    score: user.score,
    status: user.status,
    statusReason: user.statusReason ?? null,
    statusUntil: user.statusUntil?.toISOString() ?? null,
    isAdmin: user.isAdmin,
    restrictions: user.restrictions ?? null,
    dailyDuesPaid: false,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export function formatTask(task: typeof tasksTable.$inferSelect, performedByCurrentUser = false) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    link: task.link,
    socialMedia: task.socialMedia,
    category: task.category,
    tags: task.tags ?? [],
    maxPerformers: task.maxPerformers,
    performerCount: task.performerCount,
    status: task.status,
    uploadedByAdmin: task.uploadedByAdmin,
    uploadedByUserId: task.uploadedByUserId ?? null,
    reward: task.reward ? parseFloat(task.reward as string) : null,
    performedByCurrentUser,
    createdAt: task.createdAt.toISOString(),
  };
}

export async function createNotification(userId: number, title: string, message: string, type = "info") {
  try {
    await db.insert(notificationsTable).values({ userId, title, message, type });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}

export async function createNotificationForAll(title: string, message: string, type = "info") {
  try {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    const values = users.map(u => ({ userId: u.id, title, message, type }));
    if (values.length > 0) {
      await db.insert(notificationsTable).values(values);
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notifications for all");
  }
}

export function checkUserStatus(user: typeof usersTable.$inferSelect): { blocked: boolean; reason?: string } {
  if (user.status === "active" || user.status === "shadow_banned") {
    return { blocked: false };
  }
  if (user.status === "blocked" || user.status === "suspended" || user.status === "disabled") {
    // Check if restriction has expired
    if (user.statusUntil && user.statusUntil < new Date()) {
      return { blocked: false }; // Expired, should be re-enabled
    }
    return { blocked: true, reason: user.statusReason ?? undefined };
  }
  return { blocked: false };
}
