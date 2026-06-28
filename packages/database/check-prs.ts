import { db } from "./index";
import { pullRequests } from "./schema";
async function main() {
  const prs = await db.query.pullRequests.findMany();
  console.log("PRs:", prs.map(p => ({ id: p.id, title: p.title, featureId: p.featureRequestId })));
}
main().catch(console.error);
