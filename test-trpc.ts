import { appRouter } from "./packages/trpc/server/routers/_app";
import { createContext } from "./packages/trpc/server/context";
import { db } from "./packages/database";

async function main() {
  // Just testing the DB query directly
  const { pullRequests } = require("./packages/database/schema");
  const { eq } = require("drizzle-orm");
  const featureRequestId = "84643ea9-235c-43b4-b6b9-2a88e1801f14";
  const pr = await db.query.pullRequests.findFirst({
    where: eq(pullRequests.featureRequestId, featureRequestId),
    with: {
      repository: true,
      featureRequest: true,
      reviews: true
    }
  });
  console.log("DB Query Result:", pr ? pr.id : "null");
}
main().catch(console.error);
