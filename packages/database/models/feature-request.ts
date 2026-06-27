import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./project";
import { users } from "./user";

export const featureRequests = pgTable("feature_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  source: varchar("source", { length: 50 }).default("manual"),
  status: varchar("status", { length: 30 }).notNull().default("submitted"),
  createdById: text("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

import { relations } from "drizzle-orm";

export const featureRequestsRelations = relations(featureRequests, ({ one }) => ({
  project: one(projects, {
    fields: [featureRequests.projectId],
    references: [projects.id],
  }),
}));
