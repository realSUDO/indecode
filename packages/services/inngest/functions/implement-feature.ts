import { inngest } from "../client";
import { db } from "@repo/database";
import { featureRequests, prds, tasks, codebaseEmbeddings, pullRequests } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { embedCode } from "../../ai/embeddings";
import { getPlanningModel, getImplementationModel } from "../../ai/index";
import { generateText } from "ai";
import { getInstallationOctokit } from "../../github/index";

const API_BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || "http://localhost:8000";

export const implementFeatureFunction = inngest.createFunction(
  { 
    id: "implement-feature", 
    name: "Implement Feature with AI",
    retries: 3,
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

    const userPlan = (data.feature as any).project?.user?.plan as "free" | "pro" | "enterprise" | undefined;

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
              method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
              body: JSON.stringify({ event: "taskUpdated", featureId: featureRequestId, data: { id: task.id, status: "in_progress" } })
            });
          } catch (e) {
            console.warn("Failed to emit taskUpdated socket event:", e);
          }
        });

        // Generate changes for THIS SPECIFIC TASK
        const fileChanges = await step.run(`task-${task.id}-generate`, async () => {
          const contextStr = contextFiles.map((f: any) => `FILE: ${f.filePath}\n${f.content}`).join("\n\n");
          
          let reviewIssuesStr = "";
          if (data.pr?.reviews?.length && data.pr.reviews[0].issues.length > 0) {
            reviewIssuesStr = `\n\nRecent Review Issues to Fix:\n` + 
              data.pr.reviews[0].issues.map((i: any) => `- ${i.title}: ${i.description} (File: ${i.filePath || 'N/A'})`).join("\n");
          }

          const isPaid = userPlan === "pro" || userPlan === "enterprise";

          const systemOpenLM = `<system_instructions>
You are the Lead Engineer, Staff Software Architect (L6+), implementing features on an active Pull Request.

<rules>
1. NEVER restart implementation. Always build on the existing branch context.
2. NEVER abandon the current branch.
3. Write the FULL, working implementation. No TODOs, no placeholders.
4. Fix any bugs in the codebase related to the feature.
5. Every implementation must be incremental and merge-ready.
</rules>

<output_format>
First output a think block to analyze requirements, then an analyze block to plan file modifications, then the JSON file changes.

<think>Your analysis here</think>
<analyze>Your step-by-step plan here</analyze>
\`\`\`json
[ { "path": "path/to/file", "content": "entire new file content" } ]
\`\`\`
</output_format>
</system_instructions>`;

          const systemAlpaca = `### Instruction:
You are the Lead Engineer, Staff Software Architect (L6+), implementing features on an active Pull Request.

### Rules:
1. NEVER restart implementation. Always build on the existing branch context.
2. NEVER abandon the current branch.
3. Write the FULL, working implementation. No TODOs, no placeholders.
4. Fix any bugs in the codebase related to the feature.
5. Every implementation must be incremental and merge-ready.

### Output Format:
First output a think block to analyze requirements, then an analyze block to plan file modifications, then the JSON file changes.

<think>Your analysis here</think>
<analyze>Your step-by-step plan here</analyze>
\`\`\`json
[ { "path": "path/to/file", "content": "entire new file content" } ]
\`\`\`

### Response:`;

          const promptContext = isPaid
            ? `<input>
<feature>${data.feature.title}</feature>
<prd>${data.prd?.content || "N/A"}</prd>
<task priority="${task.priority}">${task.title}: ${task.description || "N/A"}</task>
${reviewIssuesStr ? `<review_issues>${reviewIssuesStr}</review_issues>` : ""}
<existing_code>${contextStr}</existing_code>
</input>`
            : `Feature: ${data.feature.title}
PRD: ${data.prd?.content || "N/A"}

Current Task to implement:
- [${task.priority}] ${task.title}
  Description: ${task.description || "N/A"}
${reviewIssuesStr}

Relevant existing code (Current Branch State):
${contextStr}`;

          let fileChanges: { path: string, content: string }[] = [];
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const result = await generateText({ model: getImplementationModel(userPlan), system: isPaid ? systemOpenLM : systemAlpaca, prompt: promptContext });
              let jsonStr = result.text;
              const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                jsonStr = jsonMatch[0];
              } else {
                jsonStr = jsonStr.replace(/```json|```/g, "").trim();
              }
              fileChanges = JSON.parse(jsonStr);
              break; // Success
            } catch (e) {
              console.warn(`Attempt ${attempt} failed to parse AI JSON output:`, e);
              if (attempt === 3) return [];
            }
          }
          return fileChanges;
        });

        // Apply changes to GitHub and local context
        if (fileChanges.length > 0) {
          await step.run(`task-${task.id}-commit`, async () => {
            const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
            
            // Check branch again inside the loop to get latest sha
            let currentSha = branchState.sha;
            let branchExists = branchState.exists;
            try {
              const { data: refData } = await octokit.rest.git.getRef({ owner, repo: name, ref: `heads/${branchName}` });
              currentSha = refData.object.sha;
              branchExists = true;
            } catch (err: any) {
              if (err.status === 404 && !branchExists) {
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
              method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
              body: JSON.stringify({ event: "taskUpdated", featureId: featureRequestId, data: { id: task.id, status: "done" } })
            });
          } catch (e) {
            console.warn("Failed to emit taskUpdated socket event:", e);
          }
        });
      }
    }

    // 4. Create the Pull Request exactly ONCE after all tasks are committed
    await step.run("create-pr", async () => {
      // Only create PR if branch has commits (branchState.sha would be updated if commits were made)
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      let branchHasCommits = false;
      try {
        await octokit.rest.git.getRef({ owner, repo: name, ref: `heads/${branchName}` });
        branchHasCommits = true;
      } catch { /* branch doesn't exist */ }

      if (branchHasCommits) {
        try {
          await octokit.rest.pulls.create({
            owner, repo: name, title: `Implement: ${data.feature.title}`, head: branchName, base: repo.defaultBranch || "main",
            body: `Automated PR by Indecode AI implementation agent.\n\nPRD attached for feature: ${data.feature.title}`,
          });
        } catch (err: any) {
          if (err.status !== 422) throw err; // 422 = PR already exists
        }
      }
    });

    // 5. Update Status to Review
    await step.run("update-feature-status", async () => {
      await db.update(featureRequests).set({ status: "review" }).where(eq(featureRequests.id, featureRequestId));
      try {
        await fetch(`${API_BASE_URL}/api/internal/emit`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
          body: JSON.stringify({ event: "featureUpdated", featureId: featureRequestId, data: { status: "review" } })
        });
      } catch (e) {
        console.warn("Failed to emit featureUpdated socket event:", e);
      }
    });

    return { success: true };
  }
);
