import { pgTable, serial, text, timestamp, boolean, integer, numeric, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  gender: text("gender").notNull(),
  passwordHash: text("password_hash").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  score: integer("score").notNull().default(100),
  isAdmin: boolean("is_admin").notNull().default(false),
  status: text("status").notNull().default("active"), // active | blocked | suspended | shadow_banned | restricted | disabled
  statusReason: text("status_reason"),
  statusUntil: timestamp("status_until"),
  restrictions: json("restrictions").$type<Record<string, boolean | string>>(),
  restrictionMessage: text("restriction_message"),
  lastLoginAt: timestamp("last_login_at"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
