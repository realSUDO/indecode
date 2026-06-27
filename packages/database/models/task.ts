import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { featureRequests } from "./feature-request";
import { users } from "./user";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  featureRequestId: text("feature_request_id")
    .notNull()
    .references(() => featureRequests.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  // "todo" | "in_progress" | "done"
  priority: varchar("priority", { length: 20 }).default("medium"),
  // "low" | "medium" | "high" | "critical"
  complexity: varchar("complexity", { length: 20 }),
  // "trivial" | "small" | "medium" | "large" | "complex"
  sortOrder: integer("sort_order").notNull().default(0),
  assigneeId: text("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const taskRelations = relations(tasks, ({ one }) => ({
  featureRequest: one(featureRequests, {
    fields: [tasks.featureRequestId],
    references: [featureRequests.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
}));
