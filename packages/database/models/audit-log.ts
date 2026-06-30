import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user";

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorId: text("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: text("target_user_id").references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // e.g., manual_pro_grant, coupon_redeemed, plan_upgraded
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
