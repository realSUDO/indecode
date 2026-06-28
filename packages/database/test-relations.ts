import { db } from "./index";
import { repositories, pullRequests } from "./schema";
import { eq } from "drizzle-orm";
async function main() {
  const pr = await db.query.pullRequests.findFirst({
    where: eq(pullRequests.prNumber, 12),
    with: {
      repository: {
        with: {
          githubInstallation: true,
        }
      }
    }
  });
  console.log("PR Info:", JSON.stringify(pr, null, 2));
}
main().catch(console.error);
