import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("percentage"), // 'percentage' or 'fixed'
  discountValue: integer("discount_value").notNull(),
  maxUses: integer("max_uses"), // nullable means infinite
  usedCount: integer("used_count").notNull().default(0),
  perUserLimit: integer("per_user_limit").notNull().default(1),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  applicablePlans: text("applicable_plans").array(), // e.g. ['pro']
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
