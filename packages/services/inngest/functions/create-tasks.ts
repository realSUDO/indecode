import { inngest } from "../client";
import { db } from "@repo/database";
import { prds, tasks, featureRequests } from "@repo/database/schema";
import { eq } from "drizzle-orm";
import { generateTasksFromPRD } from "../../ai/agents/planning";

/**
 * Triggered when a PRD is approved.
 * Generates engineering tasks from the PRD and populates the Kanban board.
 */
export const createTasksFunction = inngest.createFunction(
  {
    id: "create-tasks",
    name: "Create Engineering Tasks from PRD",
    retries: 3,
    triggers: { event: "prd/approved" },
  },
  async ({ event, step }: any) => {
    const { prdId, featureRequestId } = event.data;

    // Step 1: Load PRD
    const prd = await step.run("load-prd", async () => {
      const found = await db.query.prds.findFirst({
        where: eq(prds.id, prdId),
      });
      if (!found) throw new Error(`PRD ${prdId} not found`);
      return found;
    });

    // Step 2: Generate tasks via AI
    const feature = await step.run("load-feature", async () => {
      const f = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, featureRequestId),
      });
      if (!f) throw new Error(`Feature request ${featureRequestId} not found`);
      return f;
    });

    const generatedTasks = await step.run("generate-tasks", async () => {
      return generateTasksFromPRD({
        featureTitle: feature.title,
        prdContent: prd.content,
      });
    });

    // Step 3: Delete old tasks if any, then bulk insert new ones
    await step.run("save-tasks", async () => {
      await db.delete(tasks).where(eq(tasks.featureRequestId, featureRequestId));

      if (generatedTasks.length === 0) return;

      await db.insert(tasks).values(
        generatedTasks.map((t, index) => ({
          featureRequestId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          complexity: t.complexity,
          status: "todo" as const,
          sortOrder: index,
        }))
      );
    });

    // Step 4: Update feature status to in_progress
    await step.run("update-status", async () => {
      await db.update(featureRequests)
        .set({ status: "in_progress" })
        .where(eq(featureRequests.id, featureRequestId));
    });

    return { taskCount: generatedTasks.length };
  }
);
