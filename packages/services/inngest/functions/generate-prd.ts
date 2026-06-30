import { inngest } from "../client";
import { db } from "@repo/database";
import { discoverySessions, discoveryMessages, featureRequests, prds } from "@repo/database/schema";
import { eq, asc } from "drizzle-orm";
import { generatePRD } from "../../ai/agents/prd";

/**
 * Triggered when discovery is completed.
 * Gathers the full conversation transcript and generates a PRD.
 */
export const generatePRDFunction = inngest.createFunction(
  {
    id: "generate-prd",
    name: "Generate PRD from Discovery",
    retries: 3,
    triggers: { event: "discovery/session.complete" },
  },
  async ({ event, step }: any) => {
    const { featureRequestId, discoverySessionId } = event.data;

    // Step 1: Load context
    const context = await step.run("gather-context", async () => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, featureRequestId),
      });
      if (!feature) throw new Error(`Feature request ${featureRequestId} not found`);

      const messages = await db.query.discoveryMessages.findMany({
        where: eq(discoveryMessages.sessionId, discoverySessionId),
        orderBy: [asc(discoveryMessages.createdAt)],
      });

      return {
        title: feature.title,
        description: feature.description,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      };
    });

    // Step 2: Generate PRD
    const prdContent = await step.run("generate-prd-content", async () => {
      return generatePRD({
        featureTitle: context.title,
        featureDescription: context.description,
        discoveryTranscript: context.messages,
      });
    });

    // Step 3: Save PRD to database
    const savedPRD = await step.run("save-prd", async () => {
      // Upsert: if one already exists, update it
      const existing = await db.query.prds.findFirst({
        where: eq(prds.featureRequestId, featureRequestId),
      });

      if (existing) {
        const [updated] = await db.update(prds)
          .set({ content: prdContent, status: "in_review", version: existing.version + 1 })
          .where(eq(prds.id, existing.id))
          .returning();
        return updated;
      }

      const [newPRD] = await db.insert(prds).values({
        featureRequestId,
        content: prdContent,
        status: "in_review",
        version: 1,
      }).returning();
      return newPRD;
    });

    // Step 4: Update feature status
    await step.run("update-status", async () => {
      await db.update(featureRequests)
        .set({ status: "prd_draft" })
        .where(eq(featureRequests.id, featureRequestId));
    });

    return { prdId: savedPRD.id };
  }
);
