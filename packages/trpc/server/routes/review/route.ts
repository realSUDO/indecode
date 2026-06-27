import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { reviews, reviewIssues } from "@repo/database/schema";
import { eq, desc } from "drizzle-orm";

export const reviewRouter = router({
  getByPullRequest: publicProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ input }) => {
      return await db.query.reviews.findMany({
        where: eq(reviews.pullRequestId, input.pullRequestId),
        with: {
          issues: true
        },
        orderBy: [desc(reviews.createdAt)]
      });
    }),

  resolveIssue: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(reviewIssues)
        .set({ resolved: true })
        .where(eq(reviewIssues.id, input.issueId));
      return { success: true };
    }),
});
