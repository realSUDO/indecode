import { db } from "./index";
import { pullRequests, featureRequests } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  const prs = await db.query.pullRequests.findMany();
  const features = await db.query.featureRequests.findMany();

  let linkedCount = 0;
  for (const pr of prs) {
    if (!pr.featureRequestId && pr.title.startsWith("Implement: ")) {
      const featureTitle = pr.title.replace("Implement: ", "");
      const match = features.find(f => f.title === featureTitle);
      
      if (match) {
        await db.update(pullRequests)
          .set({ featureRequestId: match.id })
          .where(eq(pullRequests.id, pr.id));
        console.log(`Linked PR "${pr.title}" to feature ID ${match.id}`);
        linkedCount++;
      }
    }
  }
  console.log(`Successfully linked ${linkedCount} PRs to features!`);
}
main().catch(console.error);
