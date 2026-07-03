import { db } from "./index";
import { projects, repositories, pullRequests } from "./schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const projectId = "6889505b-3dd0-408d-ac8b-6741e51bb9ab";
  console.log("Project:", projectId);
  
  const proj = await db.query.projects.findFirst({
    where: eq(projects.id, projectId)
  });
  console.log("Project data:", proj?.name || "Not Found");
  
  const repos = await db.query.repositories.findMany({
    where: eq(repositories.projectId, projectId)
  });
  console.log("Repos linked:", repos.map((r: any) => r.fullName));
  
  if (repos.length > 0) {
    const prs = await db.query.pullRequests.findMany({
      where: inArray(pullRequests.repositoryId, repos.map((r: any) => r.id))
    });
    console.log("PRs for this project:", prs.length);
    console.log(prs.map((p: any) => ({ title: p.title, number: p.prNumber, status: p.status })));
  } else {
    console.log("No repositories linked to this project.");
  }
}
main().catch(console.error);
