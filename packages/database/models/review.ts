import { pgTable, text, timestamp, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { pullRequests } from "./pull-request";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  pullRequestId: text("pull_request_id")
    .notNull()
    .references(() => pullRequests.id, { onDelete: "cascade" }),
  iteration: integer("iteration").notNull(),
  status: text("status").default("analyzing").notNull(), // 'analyzing', 'completed', 'failed'
  summary: text("summary").notNull(),
  overallVerdict: text("overall_verdict").notNull(), // 'approved', 'changes_required', 'needs_discussion'
  reviewData: jsonb("review_data").notNull(),
  postedToGithub: boolean("posted_to_github").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviewIssues = pgTable("review_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(), // 'blocking', 'high', 'medium', 'low', 'suggestion'
  title: text("title").notNull(),
  description: text("description").notNull(),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  suggestion: text("suggestion"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

import { relations } from "drizzle-orm";

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  pullRequest: one(pullRequests, {
    fields: [reviews.pullRequestId],
    references: [pullRequests.id],
  }),
  issues: many(reviewIssues),
}));

export const reviewIssuesRelations = relations(reviewIssues, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewIssues.reviewId],
    references: [reviews.id],
  }),
}));
