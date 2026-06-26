import { inngest } from "../client";
import { db } from "@repo/database";
import { discoverySessions, featureRequests } from "@repo/database/schema";
import { eq } from "drizzle-orm";

/**
 * Triggered when a user creates a new feature request.
 * Creates a discovery session and updates the feature request status.
 */
export const processFeatureRequest = inngest.createFunction(
  {
    id: "process-feature-request",
    name: "Process Feature Request",
    retries: 3,
    triggers: { event: "feature/request.created" },
  },
  async ({ event, step }: any) => {
    const { featureRequestId } = event.data;

    // Step 1: Create a discovery session
    const session = await step.run("create-discovery-session", async () => {
      const [newSession] = await db.insert(discoverySessions).values({
        featureRequestId,
        status: "active",
      }).returning();
      return newSession;
    });

    // Step 2: Update the feature request status to "discovery"
    await step.run("update-feature-status", async () => {
      await db.update(featureRequests)
        .set({ status: "discovery" })
        .where(eq(featureRequests.id, featureRequestId));
    });

    return { sessionId: session.id };
  }
);
