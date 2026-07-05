import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyDuesTable = pgTable("daily_dues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  paid: boolean("paid").notNull().default(false),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("400"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyDueSchema = createInsertSchema(dailyDuesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyDue = z.infer<typeof insertDailyDueSchema>;
export type DailyDue = typeof dailyDuesTable.$inferSelect;
