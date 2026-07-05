import { pgTable, serial, text, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  link: text("link").notNull(),
  socialMedia: text("social_media").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull().default([]),
  maxPerformers: integer("max_performers").notNull().default(20),
  performerCount: integer("performer_count").notNull().default(0),
  reward: numeric("reward", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // active | expired | deleted
  uploadedByAdmin: boolean("uploaded_by_admin").notNull().default(false),
  uploadedByUserId: integer("uploaded_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  performerCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
