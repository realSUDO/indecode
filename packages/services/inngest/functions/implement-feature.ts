import { inngest } from "../client";
import { db } from "@repo/database";
import { featureRequests, prds, tasks, codebaseEmbeddings } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { embedCode } from "../../ai/embeddings";
import { getPlanningModel } from "../../ai/index";
import { generateText } from "ai";
import { getInstallationOctokit } from "../../github/index";

export const implementFeatureFunction = inngest.createFunction(
  { 
    id: "implement-feature", 
    name: "Implement Feature with AI",
    triggers: [{ event: "feature/implement" }]
  },
  async ({ event, step }: any) => {
    const { featureRequestId } = event.data;

    const data = await step.run("gather-context", async () => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, featureRequestId),
        with: {
          project: {
            with: {
              repositories: {
                with: {
                  githubInstallation: true,
                }
              }
            }
          }
        }
      });
      if (!feature) throw new Error("Feature not found");

      const prd = await db.query.prds.findFirst({
        where: eq(prds.featureRequestId, featureRequestId),
      });

      const featureTasks = await db.query.tasks.findMany({
        where: eq(tasks.featureRequestId, featureRequestId),
      });

      return { feature, prd, featureTasks };
    });

    const repo = data.feature.project?.repositories[0];
    if (!repo) {
      throw new Error("No repository connected to this project.");
    }

    // Step 1: Analyze PRD and Tasks to figure out what code context we need
    const queryEmbeddings = await step.run("embed-query", async () => {
      return await embedCode(`Implement feature: ${data.feature.title}\n${data.prd?.content || ""}`);
    });

    // Step 2: Fetch relevant context from pgvector
    const contextFiles = await step.run("fetch-context", async () => {
      const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
      const results = await db.select({
        filePath: codebaseEmbeddings.filePath,
        content: codebaseEmbeddings.content,
        similarity
      })
      .from(codebaseEmbeddings)
      .where(eq(codebaseEmbeddings.repositoryId, repo.id))
      .orderBy(sql`${similarity} DESC`)
      .limit(10);
      return results;
    });

    // Step 3: Ask AI to generate file changes
    const fileChanges = await step.run("generate-code", async () => {
      const contextStr = contextFiles.map(f => `FILE: ${f.filePath}\n${f.content}`).join("\n\n");
      const prompt = `You are an expert AI software engineer. Implement the following feature.
Feature: ${data.feature.title}
PRD: ${data.prd?.content}
Tasks: ${JSON.stringify(data.featureTasks.map(t => t.title))}

Relevant existing code:
${contextStr}

Respond ONLY with a JSON array of file changes. Format:
[
  { "path": "path/to/file", "content": "entire new file content" }
]`;

      const result = await generateText({
        model: getPlanningModel(),
        prompt,
      });

      try {
        const jsonStr = result.text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr) as { path: string, content: string }[];
      } catch (e) {
        return [];
      }
    });

    if (fileChanges.length === 0) {
      return { success: false, message: "No code changes generated." };
    }

    // Step 4: Create PR using Octokit
    await step.run("create-pr", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      const [owner, name] = repo.fullName.split("/");

      // Get default branch SHA
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo: name,
        ref: `heads/${repo.defaultBranch || "main"}`,
      });
      const baseSha = refData.object.sha;

      // Create new branch (ignore if already exists)
      const branchName = `feature/indecode-${featureRequestId.slice(0, 8)}`;
      try {
        await octokit.rest.git.createRef({
          owner,
          repo: name,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });
      } catch (err: any) {
        if (err.status !== 422) {
          throw err;
        }
        console.log(`Branch ${branchName} already exists, will forcefully update it.`);
      }

      // Create tree
      const tree = await Promise.all(fileChanges.map(async change => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo: name,
          content: change.content,
          encoding: "utf-8",
        });
        return {
          path: change.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      }));

      const { data: newTree } = await octokit.rest.git.createTree({
        owner,
        repo: name,
        base_tree: baseSha,
        tree,
      });

      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo: name,
        message: `feat: Implement ${data.feature.title}`,
        tree: newTree.sha,
        parents: [baseSha],
      });

      await octokit.rest.git.updateRef({
        owner,
        repo: name,
        ref: `heads/${branchName}`,
        sha: newCommit.sha,
        force: true,
      });

      try {
        await octokit.rest.pulls.create({
          owner,
          repo: name,
          title: `Implement: ${data.feature.title}`,
          head: branchName,
          base: repo.defaultBranch || "main",
          body: `Automated PR by Indecode AI implementation agent.\n\nPRD attached for feature: ${data.feature.title}`,
        });
      } catch (err: any) {
        if (err.status !== 422) {
          throw err;
        }
        console.log(`PR for ${branchName} already exists, skipping creation.`);
      }
    });

    return { success: true, filesModified: fileChanges.length };
  }
);
