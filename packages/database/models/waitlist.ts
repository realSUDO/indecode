import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
