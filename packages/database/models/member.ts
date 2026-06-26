import { pgTable, text, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./user";
import { organizations } from "./organization";

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("developer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  unique("org_user_unique").on(table.organizationId, table.userId),
]);
