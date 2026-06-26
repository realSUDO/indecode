import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { getAppOctokit, getInstallUrl, getInstallationOctokit } from "@repo/services/github";
import { db } from "@repo/database";
import { githubInstallations, repositories } from "@repo/database/schema";
import { eq, and } from "drizzle-orm";

export const githubRouter = router({
  getInstallationStatus: publicProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(async ({ input }) => {
      const result = await db.query.githubInstallations.findFirst({
        where: input.organizationId 
          ? eq(githubInstallations.organizationId, input.organizationId)
          : undefined // Ideally filter by userId if no org provided, assuming single user mode for now
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

  getInstallUrl: publicProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(({ input }) => {
      // Pass the organizationId (or placeholder) as the OAuth state so we know who installed it
      const state = input.organizationId || "personal_workspace";
      return { url: getInstallUrl(state) };
    }),

  listRepos: publicProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(async ({ input }) => {
      // Fetch the installation from our DB first
      const installation = await db.query.githubInstallations.findFirst({
        where: input.organizationId 
          ? eq(githubInstallations.organizationId, input.organizationId)
          : undefined
      });

      if (!installation) {
        throw new Error("GitHub App is not installed for this workspace.");
      }

      const octokit = await getInstallationOctokit(installation.installationId);
      
      // Fetch repositories accessible to this installation
      // In production, we should handle pagination
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

  connectRepo: publicProcedure
    .input(z.object({
      projectId: z.string(),
      repoFullName: z.string()
    }))
    .mutation(async ({ input }) => {
      // Create repository mapping in DB
      // Note: We should fetch githubInstallationId from the context/project's org, 
      // simplified here for demonstration
      const installation = await db.query.githubInstallations.findFirst();
      if (!installation) throw new Error("No installation found");

      const [newRepo] = await db.insert(repositories).values({
        projectId: input.projectId,
        githubInstallationId: installation.id,
        fullName: input.repoFullName,
      }).returning();

      return {
        id: newRepo.id,
        fullName: newRepo.fullName,
        language: newRepo.language,
      };
    }),

  disconnectRepo: publicProcedure
    .input(z.object({ repositoryId: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(repositories).where(eq(repositories.id, input.repositoryId));
      return { success: true };
    })
});
