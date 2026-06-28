import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { pullRequests, repositories } from "@repo/database/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const pullRequestRouter = router({
  listByProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      // Find all repos for this project
      const repos = await db.query.repositories.findMany({
        where: eq(repositories.projectId, input.projectId)
      });
      
      if (repos.length === 0) return [];
      
      const repoIds = repos.map(r => r.id);
      
      // Get all PRs for these repos
      const prs = await db.query.pullRequests.findMany({
        where: inArray(pullRequests.repositoryId, repoIds),
        with: {
          repository: true,
          reviews: {
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
            limit: 1,
          }
        },
        orderBy: (pullRequests, { desc }) => [desc(pullRequests.createdAt)]
      });
      
      return prs.map(pr => ({
        id: pr.id,
        prNumber: pr.prNumber,
        title: pr.title,
        authorLogin: pr.authorLogin,
        status: pr.status,
        repoFullName: pr.repository.fullName,
        latestReviewVerdict: pr.reviews.length > 0 ? pr.reviews[0].overallVerdict : null,
        createdAt: pr.createdAt
      }));
    }),

  getById: publicProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ input }) => {
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.id, input.pullRequestId),
        with: {
          repository: true,
          featureRequest: true,
          reviews: {
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
          }
        }
      });
      if (!pr) throw new Error("PR not found");
      return pr;
    }),

  getByFeatureId: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input }) => {
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.featureRequestId, input.featureRequestId),
        with: {
          repository: true,
          featureRequest: true,
          reviews: {
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
            with: {
              issues: true
            }
          }
        }
      });
      return pr || null;
    }),

  merge: publicProcedure
    .input(z.object({ pullRequestId: z.string(), commitMessage: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { getInstallationOctokit } = require("@repo/services/github");
      const { featureRequests } = require("@repo/database/schema");
      
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.id, input.pullRequestId),
        with: { repository: true }
      });
      if (!pr) throw new Error("PR not found");

      const octokit = await getInstallationOctokit(pr.installationId);
      const [owner, repo] = pr.repository.fullName.split("/");

      await octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: pr.prNumber,
        commit_message: input.commitMessage || "Merged via Indecode",
      });

      await db.update(pullRequests)
        .set({ status: "merged" })
        .where(eq(pullRequests.id, pr.id));

      if (pr.featureRequestId) {
        await db.update(featureRequests)
          .set({ status: "shipped" })
          .where(eq(featureRequests.id, pr.featureRequestId));
      }

      return { success: true };
    }),
});
