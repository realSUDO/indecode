import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { featureRequests, users } from "@repo/database/schema";
import { eq, desc } from "drizzle-orm";
import { inngest } from "@repo/services/inngest";

export const featureRequestRouter = router({
  create: publicProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1).max(500),
      description: z.string().min(1),
      source: z.string().optional().default("manual"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Find a valid user to satisfy the foreign key, or create a dummy one
        let user = await db.query.users.findFirst();
        if (!user) {
          [user] = await db.insert(users).values({
            id: "system-user-id",
            name: "System User",
            email: "system@indecode.local",
          }).returning();
        }
        
        const createdById = user.id;

        const [newFeature] = await db.insert(featureRequests).values({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          source: input.source,
          createdById,
        }).returning();

        // Trigger Inngest event to create discovery session
        await inngest.send({
          name: "feature/request.created",
          data: { featureRequestId: newFeature.id },
        });

        return {
          id: newFeature.id,
          title: newFeature.title,
          status: newFeature.status,
        };
      } catch (err: any) {
        console.error("Error creating feature request:", err);
        throw new Error(`Failed to create feature request: ${err.message}`);
      }
    }),

  list: publicProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(featureRequests.projectId, input.projectId)];
      if (input.status) {
        conditions.push(eq(featureRequests.status, input.status));
      }

      const results = await db.select()
        .from(featureRequests)
        .where(conditions.length === 1 ? conditions[0] : undefined)
        .orderBy(desc(featureRequests.createdAt));

      // Filter by projectId always, optionally by status
      const filtered = results.filter(r => {
        if (r.projectId !== input.projectId) return false;
        if (input.status && r.status !== input.status) return false;
        return true;
      });

      return filtered.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        source: f.source,
        createdAt: f.createdAt.toISOString(),
      }));
    }),

  getById: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input }) => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });

      if (!feature) {
        throw new Error("Feature request not found");
      }

      return {
        id: feature.id,
        title: feature.title,
        description: feature.description,
        status: feature.status,
        source: feature.source,
        projectId: feature.projectId,
        createdAt: feature.createdAt.toISOString(),
        updatedAt: feature.updatedAt.toISOString(),
      };
    }),

  updateStatus: publicProcedure
    .input(z.object({
      featureRequestId: z.string(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(featureRequests)
        .set({ status: input.status })
        .where(eq(featureRequests.id, input.featureRequestId))
        .returning();

      return { id: updated.id, status: updated.status };
    }),

  triggerImplementation: publicProcedure
    .input(z.object({
      featureRequestId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Trigger Inngest event to start the autonomous AI implementation agent
      await inngest.send({
        name: "feature/implement",
        data: { featureRequestId: input.featureRequestId },
      });

      return { success: true };
    }),
});
