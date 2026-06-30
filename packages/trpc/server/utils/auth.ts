import { db } from "@repo/database";
import { projects, organizationMembers } from "@repo/database/schema";
import { and, eq } from "drizzle-orm";

export async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return false;

  if (project.userId === userId) return true;

  if (project.organizationId) {
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, project.organizationId),
        eq(organizationMembers.userId, userId)
      ),
    });
    if (membership) return true;
  }

  return false;
}
