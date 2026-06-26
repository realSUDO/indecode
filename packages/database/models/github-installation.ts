import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organization";
import { users } from "./user";

export const githubInstallations = pgTable("github_installations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  installationId: integer("installation_id").notNull(),
  accountLogin: varchar("account_login", { length: 255 }),
  accountType: varchar("account_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
