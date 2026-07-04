import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db } from "@repo/database";
import { pullRequests, repositories } from "@repo/database/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const pullRequestRouter = router({
  listByProject: protectedProcedure
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
        latestReviewVerdict: pr.reviews.length > 0 ? pr.reviews[0]!.overallVerdict : null,
        createdAt: pr.createdAt,
        isIndecode: pr.featureRequestId !== null
      }));
    }),

  getById: protectedProcedure
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

  getByFeatureId: protectedProcedure
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

  merge: protectedProcedure
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

  getDiff: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ input }) => {
      const { getInstallationOctokit } = await import("@repo/services/github");
      
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.id, input.pullRequestId),
        with: { repository: true }
      });
      if (!pr) throw new Error("PR not found");

      const octokit = await getInstallationOctokit(pr.installationId);
      const [owner, repo] = pr.repository.fullName.split("/") as [string, string];

      const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pr.prNumber,
        mediaType: {
          format: "diff"
        }
      });

      return { diff: response.data as unknown as string };
    }),

  getUnlinkedPrs: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { getInstallationOctokit } = await import("@repo/services/github");
      const { featureRequests } = await import("@repo/database/schema");

      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
        with: { project: { with: { repositories: { with: { githubInstallation: true } } } } }
      });

      if (!feature) throw new TRPCError({ code: "NOT_FOUND" });
      const repo = feature.project?.repositories?.[0];
      if (!repo?.githubInstallation) return [];

      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      const [owner, repoName] = repo.fullName.split("/") as [string, string];

      // Get latest 10 open PRs
      const { data: openPrs } = await octokit.rest.pulls.list({
        owner, repo: repoName, state: "open", sort: "created", direction: "desc", per_page: 10
      });

      // Filter out auto-generated indecode branches
      const candidates = openPrs.filter(pr => !pr.head.ref.startsWith("feature/indecode-")).slice(0, 3);
      
      return candidates.map(pr => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        url: pr.html_url,
      }));
    }),

  linkToFeature: protectedProcedure
    .input(z.object({ featureRequestId: z.string(), prNumber: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getInstallationOctokit } = await import("@repo/services/github");
      const { featureRequests } = await import("@repo/database/schema");
      const { inngest: inngestClient } = await import("@repo/services/inngest");
      const { and } = await import("drizzle-orm");

      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
        with: { project: { with: { repositories: { with: { githubInstallation: true } } } } }
      });
      if (!feature) throw new TRPCError({ code: "NOT_FOUND" });
      const repo = feature.project?.repositories?.[0];
      if (!repo?.githubInstallation) throw new TRPCError({ code: "BAD_REQUEST", message: "No repo linked" });

      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      const [owner, repoName] = repo.fullName.split("/") as [string, string];

      const { data: ghPr } = await octokit.rest.pulls.get({
        owner, repo: repoName, pull_number: input.prNumber
      });

      let prId: string;
      const existingDbPr = await db.query.pullRequests.findFirst({
        where: and(
          eq(pullRequests.repositoryId, repo.id),
          eq(pullRequests.prNumber, input.prNumber)
        )
      });

      if (existingDbPr) {
        await db.update(pullRequests)
          .set({ featureRequestId: input.featureRequestId, status: "pending" })
          .where(eq(pullRequests.id, existingDbPr.id));
        prId = existingDbPr.id;
      } else {
        const [newPr] = await db.insert(pullRequests).values({
          repositoryId: repo.id,
          installationId: repo.githubInstallation.installationId,
          prNumber: ghPr.number,
          title: ghPr.title,
          authorLogin: ghPr.user?.login || "unknown",
          headSha: ghPr.head.sha,
          baseBranch: ghPr.base.ref,
          status: "pending",
          featureRequestId: input.featureRequestId,
        }).returning();
        prId = newPr!.id;
      }

      await inngestClient.send({ name: "github/pr.received", data: { pullRequestId: prId } });
      return { success: true };
    }),
});
