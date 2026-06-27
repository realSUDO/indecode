import "dotenv/config";
import { getAppOctokit } from "@repo/services/github";
import { db } from "@repo/database";
import { githubInstallations } from "@repo/database/schema";

async function seed() {
  const octokit = getAppOctokit();
  const { data: installations } = await octokit.rest.apps.listInstallations();

  if (installations.length === 0) {
    console.log("No installations found on GitHub!");
    process.exit(1);
  }

  const inst = installations[0];
  console.log("Found installation:", inst.id, "Account:", inst.account?.login);

  await db.insert(githubInstallations).values({
    installationId: inst.id,
    accountLogin: inst.account?.login || "unknown",
    accountType: inst.account?.type || "unknown",
  });
  
  console.log("Inserted successfully into the local database!");
  process.exit(0);
}

seed().catch(console.error);
