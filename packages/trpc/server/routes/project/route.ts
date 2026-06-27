import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { projects } from "@repo/database/schema";
import { eq, desc } from "drizzle-orm";

export const projectRouter = router({
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      organizationId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Find a valid user to satisfy the foreign key, or create a dummy one for MVP
      let user = await db.query.users.findFirst();
      if (!user) {
        const { users } = await import("@repo/database/schema");
        [user] = await db.insert(users).values({
          name: "System User",
          email: "system@indecode.local",
        }).returning();
      }
      
      const userId = user.id;

      const [newProject] = await db.insert(projects).values({
        name: input.name,
        description: input.description,
        userId: input.organizationId ? undefined : userId,
        organizationId: input.organizationId,
      }).returning();

      return {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
      };
    }),

  list: publicProcedure
    .input(z.object({
      organizationId: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const results = await db.select()
        .from(projects)
        .orderBy(desc(projects.createdAt));

      // In MVP, we just return all projects for the user. 
      // If auth was fully wired we'd filter by userId or organizationId.
      return results.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
      }));
    }),

  getById: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new Error("Project not found");
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
