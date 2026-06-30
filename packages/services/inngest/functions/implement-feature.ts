import { inngest } from "../client";
import { db } from "@repo/database";
import { featureRequests, prds, tasks, codebaseEmbeddings, pullRequests } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { embedCode } from "../../ai/embeddings";
import { getPlanningModel } from "../../ai/index";
import { generateText } from "ai";
import { getInstallationOctokit } from "../../github/index";

const API_BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || "http://localhost:8000";

export const implementFeatureFunction = inngest.createFunction(
  { 
    id: "implement-feature", 
    name: "Implement Feature with AI",
    triggers: [{ event: "feature/implement" }]
  },
  async ({ event, step }: any) => {
    const { featureRequestId } = event.data;

    // 1. Gather Context & Branch Information
    const data = await step.run("gather-context", async () => {
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, featureRequestId),
        with: {
          project: {
            with: { repositories: { with: { githubInstallation: true } } }
          }
        }
      });
      if (!feature) throw new Error("Feature not found");

      const prd = await db.query.prds.findFirst({ where: eq(prds.featureRequestId, featureRequestId) });
      const featureTasks = await db.query.tasks.findMany({ where: eq(tasks.featureRequestId, featureRequestId) });
      
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.featureRequestId, featureRequestId),
        with: {
          reviews: {
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
            limit: 1,
            with: { issues: true }
          }
        }
      });

      return { feature, prd, featureTasks, pr };
    });

    const repo = data.feature.project?.repositories[0];
    if (!repo) throw new Error("No repository connected to this project.");

    const branchName = `feature/indecode-${featureRequestId.slice(0, 8)}`;
    const [owner, name] = repo.fullName.split("/");

    const branchState = await step.run("check-branch", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      try {
        const { data: refData } = await octokit.rest.git.getRef({
          owner, repo: name, ref: `heads/${branchName}`
        });
        return { exists: true, sha: refData.object.sha };
      } catch (err: any) {
        if (err.status === 404) {
          const { data: mainRef } = await octokit.rest.git.getRef({
            owner, repo: name, ref: `heads/${repo.defaultBranch || "main"}`
          });
          return { exists: false, sha: mainRef.object.sha };
        }
        throw err;
      }
    });

    // 2. Fetch Relevant Context from pgvector (main branch)
    const queryEmbeddings = await step.run("embed-query", async () => {
      return await embedCode(`Implement feature: ${data.feature.title}\n${data.prd?.content || ""}`);
    });

    const contextFiles = await step.run("fetch-context", async () => {
      const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
      const results = await db.select({
        filePath: codebaseEmbeddings.filePath,
        content: codebaseEmbeddings.content,
      })
      .from(codebaseEmbeddings)
      .where(eq(codebaseEmbeddings.repositoryId, repo.id))
      .orderBy(sql`${similarity} DESC`)
      .limit(10);

      // If branch exists, overwrite with branch's current file content so AI sees existing progress
      if (branchState.exists) {
        const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
        for (const f of results) {
          try {
            const { data: fileData } = await octokit.rest.repos.getContent({
              owner, repo: name, path: f.filePath, ref: branchName
            });
            if (fileData && !Array.isArray(fileData) && (fileData as any).content) {
              f.content = Buffer.from((fileData as any).content, 'base64').toString('utf8');
            }
          } catch (e) { /* ignore if not found */ }
        }
      }
      return results;
    });

    // 3. Iteratively Generate File Changes per Task
    if (data.featureTasks.length > 0) {
      await step.run("initialize-tasks", async () => {
        await db.update(tasks).set({ status: "todo" }).where(eq(tasks.featureRequestId, featureRequestId));
      });

      for (const task of data.featureTasks) {
        // Set task to in_progress and notify UI
        await step.run(`task-${task.id}-start`, async () => {
          await db.update(tasks).set({ status: "in_progress" }).where(eq(tasks.id, task.id));
          try {
            await fetch(`${API_BASE_URL}/api/internal/emit`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "taskUpdated", featureId: featureRequestId, data: { id: task.id, status: "in_progress" } })
            });
          } catch (e) {}
        });

        // Generate changes for THIS SPECIFIC TASK
        const fileChanges = await step.run(`task-${task.id}-generate`, async () => {
          const contextStr = contextFiles.map((f: any) => `FILE: ${f.filePath}\n${f.content}`).join("\n\n");
          
          let reviewIssuesStr = "";
          if (data.pr?.reviews?.length && data.pr.reviews[0].issues.length > 0) {
            reviewIssuesStr = `\n\nRecent Review Issues to Fix:\n` + 
              data.pr.reviews[0].issues.map((i: any) => `- ${i.title}: ${i.description} (File: ${i.filePath || 'N/A'})`).join("\n");
          }

          const prompt = `You are acting as the Lead Engineer, Staff Software Architect (Amazon L6+/L7), and Technical Lead responsible for implementing features on an active Pull Request.

Your responsibility is to write production-ready, complete code for a SINGLE task.
CRITICAL RULES:
1. Never restart implementation. Always build on the existing branch context.
2. Never abandon the current branch.
3. Every implementation should be an incremental improvement toward a merge-ready Pull Request.
4. Do NOT leave things halfway. Do NOT use placeholders like "TODO" or "insert code here".
5. Write the full, working implementation for the requested task.
6. Fix any bugs in the codebase related to the feature.

Feature: ${data.feature.title}
PRD: ${data.prd?.content || "N/A"}

Current Task to implement:
- [${task.priority}] ${task.title}
  Description: ${task.description || "N/A"}

${reviewIssuesStr}

Relevant existing code (Current Branch State):
${contextStr}

Respond ONLY with a JSON array of file changes that represent the next logical commit. Format:
[
  { "path": "path/to/file", "content": "entire new file content" }
]`;

          const result = await generateText({ model: getPlanningModel(), prompt });
          try {
            let jsonStr = result.text.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            else jsonStr = jsonStr.replace(/```json|```/g, "").trim();
            return JSON.parse(jsonStr) as { path: string, content: string }[];
          } catch (e) {
            console.error("Failed to parse file changes JSON:", result.text);
            return [];
          }
        });

        // Apply changes to GitHub and local context
        if (fileChanges.length > 0) {
          await step.run(`task-${task.id}-commit`, async () => {
            const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
            
            // Check branch again inside the loop to get latest sha
            let currentSha = branchState.sha;
            try {
              const { data: refData } = await octokit.rest.git.getRef({ owner, repo: name, ref: `heads/${branchName}` });
              currentSha = refData.object.sha;
              branchState.exists = true;
            } catch (err: any) {
              if (err.status === 404 && !branchState.exists) {
                 await octokit.rest.git.createRef({ owner, repo: name, ref: `refs/heads/${branchName}`, sha: branchState.sha });
              }
            }

            const tree = await Promise.all(fileChanges.map(async (change: any) => {
              const { data: blob } = await octokit.rest.git.createBlob({ owner, repo: name, content: change.content, encoding: "utf-8" });
              return { path: change.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
            }));

            const { data: newTree } = await octokit.rest.git.createTree({ owner, repo: name, base_tree: currentSha, tree });
            const commitMessage = `feat: ${task.title}`;
            const { data: newCommit } = await octokit.rest.git.createCommit({ owner, repo: name, message: commitMessage, tree: newTree.sha, parents: [currentSha] });

            await octokit.rest.git.updateRef({ owner, repo: name, ref: `heads/${branchName}`, sha: newCommit.sha, force: false });

            if (!branchState.exists) {
              try {
                await octokit.rest.pulls.create({
                  owner, repo: name, title: `Implement: ${data.feature.title}`, head: branchName, base: repo.defaultBranch || "main",
                  body: `Automated PR by Indecode AI implementation agent.\n\nPRD attached for feature: ${data.feature.title}`,
                });
              } catch (err: any) { if (err.status !== 422) throw err; }
            }

            // Update local context string for next task
            for (const change of fileChanges) {
              const existingFile = contextFiles.find((f: any) => f.filePath === change.path);
              if (existingFile) {
                existingFile.content = change.content;
              } else {
                contextFiles.push({ filePath: change.path, content: change.content });
              }
            }
          });
        }

        // Set task to done and notify UI
        await step.run(`task-${task.id}-done`, async () => {
          await db.update(tasks).set({ status: "done" }).where(eq(tasks.id, task.id));
          try {
            await fetch(`${API_BASE_URL}/api/internal/emit`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "taskUpdated", featureId: featureRequestId, data: { id: task.id, status: "done" } })
            });
          } catch (e) {}
        });
      }
    }

    // 5. Update Status to Review
    await step.run("update-feature-status", async () => {
      await db.update(featureRequests).set({ status: "review" }).where(eq(featureRequests.id, featureRequestId));
      try {
        await fetch(`${API_BASE_URL}/api/internal/emit`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "featureUpdated", featureId: featureRequestId, data: { status: "review" } })
        });
      } catch (e) {}
    });

    return { success: true };
  }
);
