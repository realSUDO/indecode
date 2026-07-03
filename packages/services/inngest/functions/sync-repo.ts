import { inngest } from "../client";
import { db } from "@repo/database";
import { repositories, codebaseEmbeddings, pullRequests, featureRequests } from "@repo/database/schema";
import { eq, and, like } from "drizzle-orm";
import { getInstallationOctokit } from "../../github/index";
import { embedCode } from "../../ai/embeddings";

export const syncRepoCodebase = inngest.createFunction(
  { 
    id: "sync-repo-codebase", 
    name: "Sync Repository Codebase",
    triggers: [{ event: "repo/sync" }]
  },
  async ({ event, step }: any) => {
    const { repositoryId } = event.data;

    const repo = await step.run("fetch-repo-db", async () => {
      return await db.query.repositories.findFirst({
        where: eq(repositories.id, repositoryId),
        with: {
          githubInstallation: true,
        }
      });
    });

    if (!repo || !repo.githubInstallation) {
      throw new Error(`Repository not found or not connected properly: ${repositoryId}`);
    }

    // In a real production setup we would clone the repo, but for MVP we fetch the tree
    const [owner, name] = repo.fullName.split("/");

    const files = await step.run("fetch-repo-tree", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      const { data: commit } = await octokit.rest.repos.getCommit({
        owner,
        repo: name,
        ref: repo.defaultBranch || "main",
      });
      
      const treeSha = commit.commit.tree.sha;
      const { data: tree } = await octokit.rest.git.getTree({
        owner,
        repo: name,
        tree_sha: treeSha,
        recursive: "true"
      });

    // Filter only code files
      const allowedExtensions = [
        ".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json", 
        ".html", ".css", ".java", ".go", ".rb", ".php", ".cs", ".cpp", ".c", ".h"
      ];
      return tree.tree
        .filter(t => t.type === "blob")
        .filter(t => allowedExtensions.some(ext => (t.path || "").endsWith(ext)))
        .map(t => t.path as string);
    });

    await step.run("update-status-debug", async () => {
      await db.update(repositories).set({
        analysisStatus: "syncing",
        analysisData: { processedFiles: files.length, fileNames: files, step: "fetch-repo-tree-done" },
      }).where(eq(repositories.id, repositoryId));
    });

    // We chunk the files and process them
    for (const filePath of files) {
      await step.run(`process-file-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`, async () => {
        const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo: name,
          path: filePath,
        });

        if ("content" in fileData && fileData.encoding === "base64") {
          const content = Buffer.from(fileData.content, "base64").toString("utf-8");
          
          // Basic chunking: split by roughly 100 lines
          const lines = content.split('\n');
          const chunks = [];
          for (let i = 0; i < lines.length; i += 100) {
            chunks.push(lines.slice(i, i + 100).join('\n'));
          }

          for (const chunk of chunks) {
            const vector = await embedCode(chunk);
            await db.insert(codebaseEmbeddings).values({
              repositoryId: repo.id,
              filePath,
              content: chunk,
              embedding: vector,
            });
          }
        }
      });
    }

    await step.run("sync-existing-prs", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      
      const { data: openPrs } = await octokit.rest.pulls.list({
        owner,
        repo: name,
        state: "open",
        per_page: 100
      });

      for (const pr of openPrs) {
        let linkedFeatureId = null;
        const branchPrefix = "feature/indecode-";
        
        if (pr.head.ref.startsWith(branchPrefix)) {
          const shortId = pr.head.ref.slice(branchPrefix.length);
          const match = await db.query.featureRequests.findFirst({
            where: like(featureRequests.id, shortId + "%")
          });
          if (match) {
            linkedFeatureId = match.id;
          }
        }

        const existingPr = await db.query.pullRequests.findFirst({
          where: and(
            eq(pullRequests.repositoryId, repo.id),
            eq(pullRequests.prNumber, pr.number)
          )
        });

        if (!existingPr) {
          await db.insert(pullRequests).values({
            repositoryId: repo.id,
            installationId: repo.githubInstallation.installationId,
            prNumber: pr.number,
            title: pr.title,
            authorLogin: pr.user?.login || "unknown",
            headSha: pr.head.sha,
            baseBranch: pr.base.ref,
            status: "pending",
            featureRequestId: linkedFeatureId,
          });
        }
      }
    });

    await step.run("update-status", async () => {
      await db.update(repositories).set({
        analysisStatus: "completed",
        analysisData: { processedFiles: files.length, fileNames: files, step: "all-done" },
      }).where(eq(repositories.id, repositoryId));
    });

    return { success: true, processedFiles: files.length };
  }
);
