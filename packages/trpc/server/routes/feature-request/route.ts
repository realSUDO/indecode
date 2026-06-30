import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db } from "@repo/database";
import { featureRequests, users } from "@repo/database/schema";
import { eq, desc } from "drizzle-orm";
import { inngest } from "@repo/services/inngest";
import { TRPCError } from "@trpc/server";
import { hasProjectAccess } from "../../utils/auth";

export const featureRequestRouter = router({
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1).max(500),
      description: z.string().min(1),
      source: z.string().optional().default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const hasAccess = await hasProjectAccess(input.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
      }

      try {
        const [newFeature] = await db.insert(featureRequests).values({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          source: input.source,
          createdById: ctx.user.id,
        }).returning();
        
        if (!newFeature) throw new Error("Failed to create feature request");

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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Failed to create feature request: ${err.message}` });
      }
    }),

  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const hasAccess = await hasProjectAccess(input.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this project" });
      }

      const conditions = [eq(featureRequests.projectId, input.projectId)];
      if (input.status) {
        conditions.push(eq(featureRequests.status, input.status));
      }

      const results = await db.select()
        .from(featureRequests)
        .where(conditions.length === 1 ? conditions[0] : undefined)
        .orderBy(desc(featureRequests.createdAt));

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

  getById: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input, ctx }) => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      const hasAccess = await hasProjectAccess(feature.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this feature request" });
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

  updateStatus: protectedProcedure
    .input(z.object({
      featureRequestId: z.string(),
      status: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      const hasAccess = await hasProjectAccess(feature.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this feature request" });
      }

      const [updated] = await db.update(featureRequests)
        .set({ status: input.status })
        .where(eq(featureRequests.id, input.featureRequestId))
        .returning();
      
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Feature request not found during update" });

      return { id: updated.id, status: updated.status };
    }),

  triggerImplementation: protectedProcedure
    .input(z.object({
      featureRequestId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verify User Plan for AI Execution
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id)
      });
      if (!user || user.plan !== "pro") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Pro subscription required for AI implementation" });
      }

      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      const hasAccess = await hasProjectAccess(feature.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this feature request" });
      }

      // 2. Prevent Concurrent AI Spam (Locking mechanism)
      if (feature.status === "implementing") {
        throw new TRPCError({ code: "CONFLICT", message: "Feature is already being implemented by AI" });
      }

      // Update status to prevent concurrent triggers
      await db.update(featureRequests)
        .set({ status: "implementing" })
        .where(eq(featureRequests.id, feature.id));

      // Trigger Inngest event to start the autonomous AI implementation agent
      await inngest.send({
        name: "feature/implement",
        data: { featureRequestId: input.featureRequestId },
      });

      return { success: true };
    }),
});
