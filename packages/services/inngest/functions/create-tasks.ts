import { inngest } from "../client";
import { db } from "@repo/database";
import { prds, tasks, featureRequests, users } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { generateTasksFromPRD } from "../../ai/agents/planning";

const API_BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || "http://localhost:8000";

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
        with: {
          project: {
            with: { user: true }
          }
        }
      });
      if (!f) throw new Error(`Feature request ${featureRequestId} not found`);
      return f;
    });

    const generatedTasks = await step.run("generate-tasks", async () => {
      return generateTasksFromPRD({
        featureTitle: feature.title,
        prdContent: prd.content,
        plan: (feature as any).project?.user?.plan as "free" | "pro" | "enterprise" | undefined,
      });
    });

    // Step 3: Delete old tasks if any, then bulk insert new ones
    await step.run("save-tasks", async () => {
      await db.delete(tasks).where(eq(tasks.featureRequestId, featureRequestId));

      if (generatedTasks.length === 0) return;

      const newTasks = generatedTasks.map((t: any, index: number) => ({
        id: crypto.randomUUID(), // Ensure IDs exist for the socket event
        featureRequestId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        complexity: t.complexity,
        status: "todo" as const,
        sortOrder: index,
      }));

      await db.insert(tasks).values(newTasks);
      
      // Emit the newly generated tasks so the UI populates instantly
      try {
        await fetch(`${API_BASE_URL}/api/internal/emit`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
          body: JSON.stringify({ event: "tasksGenerated", featureId: featureRequestId, data: newTasks })
        });
      } catch (e) {
        console.warn("Failed to emit tasksGenerated socket event:", e);
      }
    });

    // Step 4: Update feature status to in_progress
    await step.run("update-status", async () => {
      await db.update(featureRequests)
        .set({ status: "in_progress" })
        .where(eq(featureRequests.id, featureRequestId));
        
      try {
        await fetch(`${API_BASE_URL}/api/internal/emit`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
          body: JSON.stringify({ event: "featureUpdated", featureId: featureRequestId, data: { status: "in_progress" } })
        });
      } catch (e) {
        console.warn("Failed to emit featureUpdated socket event:", e);
      }
    });

    // Step 5: Increment Usage
    await step.run("increment-usage", async () => {
      const f = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, featureRequestId),
        with: { project: { with: { user: true } } }
      });
      if ((f as any)?.project?.user?.id) {
        await db.update(users)
          .set({ totalExecutions: sql`${users.totalExecutions} + 1` })
          .where(eq(users.id, (f as any).project.user.id));
      }
    });

    return { taskCount: generatedTasks.length };
  }
);
