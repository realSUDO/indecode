import { db } from "./index";
import { pullRequests } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.update(pullRequests)
    .set({ featureRequestId: '2bd15969-d3df-41d7-9991-7e8a75e5ce7b' })
    .where(eq(pullRequests.id, '6fb21a2a-58cc-4911-8bd9-f6c4a5db977e'));
  console.log("Successfully linked PR to Feature Request.");
}
main().catch(console.error);
