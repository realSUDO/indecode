import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db } from "@repo/database";
import { projects } from "@repo/database/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const projectRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      organizationId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const [newProject] = await db.insert(projects).values({
        name: input.name,
        description: input.description,
        userId: input.organizationId ? undefined : userId,
        organizationId: input.organizationId,
      }).returning();
      if (!newProject) throw new Error("Failed to create project");

      return {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
      };
    }),

  list: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const results = await db.select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));

      return results.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, userId)),
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        organizationId: project.organizationId,
        userId: project.userId,
        createdAt: project.createdAt.toISOString(),
      };
    }),
});
