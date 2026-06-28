import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { prds, featureRequests, discoverySessions } from "@repo/database/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@repo/services/inngest";

export const prdRouter = router({
  getByFeature: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input }) => {
      const prd = await db.query.prds.findFirst({
        where: eq(prds.featureRequestId, input.featureRequestId),
      });

      if (!prd) return null;

      return {
        id: prd.id,
        content: prd.content,
        status: prd.status,
        version: prd.version,
        approvedById: prd.approvedById,
        approvedAt: prd.approvedAt?.toISOString() ?? null,
        createdAt: prd.createdAt.toISOString(),
        updatedAt: prd.updatedAt.toISOString(),
      };
    }),

  update: publicProcedure
    .input(z.object({
      prdId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.prds.findFirst({
        where: eq(prds.id, input.prdId),
      });
      if (!existing) throw new Error("PRD not found");
      if (existing.status === "approved") throw new Error("Cannot edit an approved PRD");

      const [updated] = await db.update(prds)
        .set({
          content: input.content,
          version: existing.version + 1,
          status: "draft",
        })
        .where(eq(prds.id, input.prdId))
        .returning();
      if (!updated) throw new Error("Failed to update PRD");

      return { id: updated.id, version: updated.version };
    }),

  approve: publicProcedure
    .input(z.object({ prdId: z.string() }))
    .mutation(async ({ input }) => {
      const prd = await db.query.prds.findFirst({
        where: eq(prds.id, input.prdId),
      });
      if (!prd) throw new Error("PRD not found");

      const [updated] = await db.update(prds)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(prds.id, input.prdId))
        .returning();
      if (!updated) throw new Error("Failed to approve PRD");

      // Update feature request status
      await db.update(featureRequests)
        .set({ status: "planning" })
        .where(eq(featureRequests.id, prd.featureRequestId));

      // Trigger task generation
      await inngest.send({
        name: "prd/approved",
        data: { prdId: prd.id, featureRequestId: prd.featureRequestId },
      });

      return { id: updated.id, status: updated.status };
    }),

  reject: publicProcedure
    .input(z.object({ prdId: z.string() }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(prds)
        .set({ status: "rejected" })
        .where(eq(prds.id, input.prdId))
        .returning();
      if (!updated) throw new Error("Failed to reject PRD");

      return { id: updated.id, status: updated.status };
    }),

  regenerate: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ input }) => {
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
      });

      // Re-fire the discovery complete event to regenerate
      await inngest.send({
        name: "discovery/session.complete",
        data: {
          featureRequestId: input.featureRequestId,
          discoverySessionId: session?.id ?? "",
        },
      });

      return { success: true };
    }),
});
