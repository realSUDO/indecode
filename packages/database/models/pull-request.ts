import { pgTable, text, varchar, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { repositories } from "./repository";
import { featureRequests } from "./feature-request";

export const pullRequests = pgTable("pull_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  repositoryId: text("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  featureRequestId: text("feature_request_id").references(() => featureRequests.id),
  installationId: integer("installation_id").notNull(),
  prNumber: integer("pr_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  authorLogin: varchar("author_login", { length: 255 }),
  headSha: varchar("head_sha", { length: 40 }).notNull(),
  baseBranch: varchar("base_branch", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  unique("repo_pr_unique").on(table.repositoryId, table.prNumber),
]);
