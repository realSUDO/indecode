import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { featureRequests } from "./feature-request";

export const discoverySessions = pgTable("discovery_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  featureRequestId: text("feature_request_id").notNull().references(() => featureRequests.id, { onDelete: "cascade" }).unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // "active" | "completed" | "failed"
  summary: text("summary"), // AI-generated summary of discovery
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const discoverySessionRelations = relations(discoverySessions, ({ one, many }) => ({
  featureRequest: one(featureRequests, {
    fields: [discoverySessions.featureRequestId],
    references: [featureRequests.id],
  }),
  messages: many(discoveryMessages),
}));

export const discoveryMessages = pgTable("discovery_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => discoverySessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const discoveryMessageRelations = relations(discoveryMessages, ({ one }) => ({
  session: one(discoverySessions, {
    fields: [discoveryMessages.sessionId],
    references: [discoverySessions.id],
  }),
}));
