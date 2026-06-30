import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db } from "@repo/database";
import { projects, organizationMembers } from "@repo/database/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hasProjectAccess } from "../../utils/auth";

export const projectRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      organizationId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (input.organizationId) {
        const membership = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.userId, userId)
          )
        });
        if (!membership) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization" });
        }
      }

      const [newProject] = await db.insert(projects).values({
        name: input.name,
        description: input.description,
        userId: input.organizationId ? undefined : userId,
        organizationId: input.organizationId,
      }).returning();
      if (!newProject) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create project" });

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

      // Get all orgs the user is part of
      const userOrgs = await db.select({ orgId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId));
      
      const orgIds = userOrgs.map(o => o.orgId);

      // Build where condition
      const conditions = [];
      
      if (input?.organizationId) {
        if (!orgIds.includes(input.organizationId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this organization" });
        }
        conditions.push(eq(projects.organizationId, input.organizationId));
      } else {
        const baseCondition = orgIds.length > 0 
          ? or(eq(projects.userId, userId), inArray(projects.organizationId, orgIds))
          : eq(projects.userId, userId);
        conditions.push(baseCondition);
      }

      const results = await db.select()
        .from(projects)
        .where(and(...conditions))
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
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const hasAccess = await hasProjectAccess(project.id, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
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
