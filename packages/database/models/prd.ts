import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { featureRequests } from "./feature-request";
import { users } from "./user";

export const prds = pgTable("prds", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  featureRequestId: text("feature_request_id")
    .notNull()
    .references(() => featureRequests.id, { onDelete: "cascade" })
    .unique(),
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  // "draft" | "in_review" | "approved" | "rejected"
  version: integer("version").notNull().default(1),
  approvedById: text("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const prdRelations = relations(prds, ({ one }) => ({
  featureRequest: one(featureRequests, {
    fields: [prds.featureRequestId],
    references: [featureRequests.id],
  }),
  approvedBy: one(users, {
    fields: [prds.approvedById],
    references: [users.id],
  }),
}));
