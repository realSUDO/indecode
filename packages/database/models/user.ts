import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'user' or 'admin'
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  company: varchar("company", { length: 255 }),
  onboardingRole: varchar("onboarding_role", { length: 100 }),
  totalExecutions: integer("total_executions").notNull().default(0),
  razorpayCustomerId: text("razorpay_customer_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }),
  subscriptionRenewsAt: timestamp("subscription_renews_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
