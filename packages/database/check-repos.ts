import { db } from "./index";
import { repositories } from "./schema";
async function main() {
  const repos = await db.select().from(repositories);
  console.log("Repos:", repos);
}
main().catch(console.error);
