import { db } from "./index";
import { reviews, pullRequests, reviewIssues } from "./schema";
async function main() {
  const prs = await db.select().from(pullRequests);
  console.log("PRs:", prs);
  const revs = await db.select().from(reviews);
  console.log("Reviews:", revs);
}
main().catch(console.error);
