import { pgTable, text, varchar, timestamp, boolean, unique, jsonb } from "drizzle-orm/pg-core";
import { projects } from "./project";
import { githubInstallations } from "./github-installation";

export const repositories = pgTable("repositories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  githubInstallationId: text("github_installation_id").notNull().references(() => githubInstallations.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 100 }).default("main"),
  language: varchar("language", { length: 50 }),
  isPrivate: boolean("is_private").default(false),
  analysisStatus: varchar("analysis_status", { length: 20 }).default("pending"),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  unique("project_repo_unique").on(table.projectId, table.fullName),
]);
