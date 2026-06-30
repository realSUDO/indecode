import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { getInstallUrl, getInstallationOctokit } from "@repo/services/github";
import { db } from "@repo/database";
import { githubInstallations, repositories, codebaseEmbeddings, projects } from "@repo/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { inngest } from "@repo/services/inngest";
import { TRPCError } from "@trpc/server";

export const githubRouter = router({
  getInstallationStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      const result = await db.query.githubInstallations.findFirst({
        where: eq(githubInstallations.organizationId, input.projectId) // Using organizationId column for projectId mapping for now
      });

      if (!result) {
        return { connected: false, accountLogin: null, installedAt: null };
      }

      return {
        connected: true,
        accountLogin: result.accountLogin,
        installedAt: result.createdAt.toISOString()
      };
    }),

  linkInstallationToProject: protectedProcedure
    .input(z.object({
      installationId: z.number(),
      projectId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      // We expect the webhook to have already created the installation record without an organizationId.
      // Now we find it and link it.
      const installation = await db.query.githubInstallations.findFirst({
        where: eq(githubInstallations.installationId, input.installationId)
      });

      if (!installation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Installation not found. Webhook may not have processed yet." });
      }

      await db.update(githubInstallations)
        .set({ organizationId: input.projectId, userId: ctx.user.id })
        .where(eq(githubInstallations.id, installation.id));

      return { success: true };
    }),

  getInstallUrl: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ input, ctx }) => {
      // Pass the projectId as the OAuth state so we know which project to attach the installation to
      return { url: getInstallUrl(input.projectId) };
    }),

  listRepos: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      const installation = await db.query.githubInstallations.findFirst({
        where: eq(githubInstallations.organizationId, input.projectId) // Using organizationId column for projectId mapping for now
      });

      if (!installation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "GitHub App is not installed for this project." });
      }

      const octokit = await getInstallationOctokit(installation.installationId);
      
      const response = await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

      return response.data.repositories.map(repo => ({
        id: repo.id,
        fullName: repo.full_name,
        name: repo.name,
        language: repo.language,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch,
      }));
    }),

  connectRepo: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      repoFullName: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      const installation = await db.query.githubInstallations.findFirst({
        where: eq(githubInstallations.organizationId, input.projectId)
      });
      if (!installation) throw new TRPCError({ code: "NOT_FOUND", message: "No installation found" });

      const [newRepo] = await db.insert(repositories).values({
        projectId: input.projectId,
        githubInstallationId: installation.id,
        fullName: input.repoFullName,
      }).returning();
      
      if (!newRepo) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to connect repository" });

      return {
        id: newRepo.id,
        fullName: newRepo.fullName,
        language: newRepo.language,
      };
    }),

  disconnectRepo: protectedProcedure
    .input(z.object({ repositoryId: z.string(), projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }
      
      await db.delete(repositories).where(
        and(eq(repositories.id, input.repositoryId), eq(repositories.projectId, input.projectId))
      );
      return { success: true };
    }),

  listConnectedRepos: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      const connected = await db.select({
        id: repositories.id,
        fullName: repositories.fullName,
        language: repositories.language,
        chunkCount: sql<number>`count(${codebaseEmbeddings.id})::int`
      })
      .from(repositories)
      .leftJoin(codebaseEmbeddings, eq(repositories.id, codebaseEmbeddings.repositoryId))
      .where(eq(repositories.projectId, input.projectId))
      .groupBy(repositories.id, repositories.fullName, repositories.language);

      return connected.map(repo => ({
        id: repo.id,
        fullName: repo.fullName,
        language: repo.language,
        chunkCount: repo.chunkCount,
      }));
    }),

  syncRepoCodebase: protectedProcedure
    .input(z.object({ repositoryId: z.string(), projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
      });

      if (!project) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Project not found or access denied" });
      }

      const repo = await db.query.repositories.findFirst({
        where: and(eq(repositories.id, input.repositoryId), eq(repositories.projectId, input.projectId))
      });

      if (!repo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Repository not found" });
      }

      await inngest.send({
        name: "repo/sync",
        data: { repositoryId: input.repositoryId },
      });
      return { success: true };
    })
});
