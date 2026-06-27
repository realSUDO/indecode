import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organization";
import { users } from "./user";

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

import { relations } from "drizzle-orm";
import { repositories } from "./repository";
import { featureRequests } from "./feature-request";

export const projectsRelations = relations(projects, ({ many }) => ({
  repositories: many(repositories),
  featureRequests: many(featureRequests),
}));
