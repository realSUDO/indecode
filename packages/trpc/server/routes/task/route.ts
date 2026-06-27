import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { tasks } from "@repo/database/schema";
import { eq, asc } from "drizzle-orm";

export const taskRouter = router({
  listByFeature: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input }) => {
      const result = await db.query.tasks.findMany({
        where: eq(tasks.featureRequestId, input.featureRequestId),
        orderBy: [asc(tasks.sortOrder)],
      });

      return result.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        complexity: t.complexity,
        sortOrder: t.sortOrder,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    }),

  update: publicProcedure
    .input(z.object({
      taskId: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { taskId, ...updates } = input;
      const [updated] = await db.update(tasks)
        .set(updates)
        .where(eq(tasks.id, taskId))
        .returning();

      return { id: updated.id, status: updated.status, title: updated.title };
    }),

  reorder: publicProcedure
    .input(z.object({
      taskId: z.string(),
      newSortOrder: z.number().int(),
      newStatus: z.enum(["todo", "in_progress", "done"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: Record<string, any> = { sortOrder: input.newSortOrder };
      if (input.newStatus) updates.status = input.newStatus;

      await db.update(tasks).set(updates).where(eq(tasks.id, input.taskId));
      return { success: true };
    }),
});
