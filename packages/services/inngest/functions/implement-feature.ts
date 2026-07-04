import { inngest } from "../client";
import { db } from "@repo/database";
import { featureRequests, prds, tasks, codebaseEmbeddings, pullRequests, users } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { embedCode } from "../../ai/embeddings";
import { getPlanningModel, getImplementationModel } from "../../ai/index";
import { generateText } from "ai";
import { getInstallationOctokit } from "../../github/index";

const API_BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || "http://localhost:8000";

/** Normalize file paths for safe comparison (strip leading ./ and /) */
const normalizePath = (p: string) => p.replace(/^\.\//, '').replace(/^\//, '');

export const implementFeatureFunction = inngest.createFunction(
  { 
    id: "implement-feature", 
    name: "Implement Feature with AI",
    retries: 3,
    triggers: [{ event: "feature/implement" }]
  },
  async ({ event, step }: any) => {
    const { featureRequestId } = event.data;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Gather Context & Branch Information
    // ─────────────────────────────────────────────────────────────────────────
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
    const [owner, repoName] = repo.fullName.split("/");

    const branchState = await step.run("check-branch", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      try {
        const { data: refData } = await octokit.rest.git.getRef({
          owner, repo: repoName, ref: `heads/${branchName}`
        });
        return { exists: true, sha: refData.object.sha };
      } catch (err: any) {
        if (err.status === 404) {
          const { data: mainRef } = await octokit.rest.git.getRef({
            owner, repo: repoName, ref: `heads/${repo.defaultBranch || "main"}`
          });
          return { exists: false, sha: mainRef.object.sha };
        }
        throw err;
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Iteratively Generate File Changes per Task
    //    Context is fetched PER TASK so each task gets relevant files.
    // ─────────────────────────────────────────────────────────────────────────

    // Accumulate full file contents across tasks so subsequent tasks see prior changes
    const fileContentCache: Map<string, string> = new Map();

    if (data.featureTasks.length > 0) {
      await step.run("initialize-tasks", async () => {
        await db.update(tasks).set({ status: "todo" }).where(eq(tasks.featureRequestId, featureRequestId));
      });

      for (const task of data.featureTasks) {
        // Set task to in_progress
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

        // ───────────────────────────────────────────────────────────────────
        // FIX #2: Fetch context PER TASK using the task's own description
        // ───────────────────────────────────────────────────────────────────
        const taskContextFiles = await step.run(`task-${task.id}-context`, async () => {
          // Embed based on the TASK, not just the feature title
          const queryText = `Implement task: ${task.title}\n${task.description || ""}\nFeature: ${data.feature.title}`;
          const queryEmbeddings = await embedCode(queryText);

          const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
          const rawResults = await db.select({
            filePath: codebaseEmbeddings.filePath,
            content: codebaseEmbeddings.content,
          })
          .from(codebaseEmbeddings)
          .where(eq(codebaseEmbeddings.repositoryId, repo.id))
          .orderBy(sql`${similarity} DESC`)
          .limit(20); // Fetch more to compensate for dedup

          // ─────────────────────────────────────────────────────────────────
          // FIX #1: Deduplicate by filePath — keep only first (highest sim)
          // ─────────────────────────────────────────────────────────────────
          const seen = new Set<string>();
          const uniqueResults: typeof rawResults = [];
          for (const r of rawResults) {
            const normed = normalizePath(r.filePath);
            if (!seen.has(normed)) {
              seen.add(normed);
              uniqueResults.push(r);
            }
            if (uniqueResults.length >= 10) break; // Cap at 10 unique files
          }

          // Now fetch the FULL file content from GitHub for each unique file.
          // If a prior task already wrote to this file, use the cached version.
          const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
          for (const f of uniqueResults) {
            const normedPath = normalizePath(f.filePath);

            // Check our in-memory cache first (from previous task commits)
            if (fileContentCache.has(normedPath)) {
              f.content = fileContentCache.get(normedPath)!;
              continue;
            }

            try {
              const refToFetch = branchState.exists ? branchName : (repo.defaultBranch || "main");
              const { data: fileData } = await octokit.rest.repos.getContent({
                owner, repo: repoName, path: f.filePath, ref: refToFetch
              });
              if (fileData && !Array.isArray(fileData) && (fileData as any).content) {
                f.content = Buffer.from((fileData as any).content, 'base64').toString('utf8');
              }
            } catch (e) {
              console.warn(`Could not fetch full file for ${f.filePath}. Using vector chunk as fallback.`);
            }
          }

          return uniqueResults;
        });

        // Generate changes for THIS SPECIFIC TASK
        const fileChanges = await step.run(`task-${task.id}-generate`, async () => {
          const contextStr = taskContextFiles.map((f: any) => `FILE: ${f.filePath}\n${f.content}`).join("\n\n");
          
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
2. Write the FULL, working implementation. No TODOs, no placeholders.
3. Fix any bugs in the codebase related to the feature.
4. When modifying an existing file, YOU MUST PRESERVE ALL EXISTING CODE. Only modify what is strictly necessary. NEVER delete unrelated code, imports, styles, or functions.
5. For existing files, use action "modify" with surgical search/replace blocks. For brand new files, use action "create".
6. The "search" string MUST be an exact character-for-character match of the existing code (including whitespace and newlines). Copy it precisely from the provided file content.
</rules>

<output_format>
First output a <think> block to analyze requirements, then an <analyze> block to plan file modifications, then the JSON.

IMPORTANT: For EXISTING files, you MUST use action "modify" with a "modifications" array. NEVER use action "create" for a file that already exists — that will DELETE all existing code.

JSON schema:
[
  {
    "path": "path/to/existing/file.ts",
    "action": "modify",
    "modifications": [
      {
        "search": "exact string from the existing file to find",
        "replace": "new string to replace it with"
      }
    ]
  },
  {
    "path": "path/to/brand_new/file.ts",
    "action": "create",
    "content": "entire new file content"
  }
]

<think>Your analysis here</think>
<analyze>Your step-by-step plan here</analyze>
\`\`\`json
[ ... ]
\`\`\`
</output_format>
</system_instructions>`;

          const systemAlpaca = `### Instruction:
You are the Lead Engineer, Staff Software Architect (L6+), implementing features on an active Pull Request.

### Rules:
1. NEVER restart implementation. Always build on the existing branch context.
2. Write the FULL, working implementation. No TODOs, no placeholders.
3. Fix any bugs in the codebase related to the feature.
4. When modifying an existing file, YOU MUST PRESERVE ALL EXISTING CODE. Only modify what is strictly necessary. NEVER delete unrelated code, imports, styles, or functions.
5. For existing files, use action "modify" with surgical search/replace blocks. For brand new files, use action "create".
6. The "search" string MUST be an exact character-for-character match of the existing code (including whitespace and newlines). Copy it precisely from the provided file content.

### Output Format:
First output a <think> block to analyze requirements, then an <analyze> block to plan, then JSON.

IMPORTANT: For EXISTING files, you MUST use action "modify" with a "modifications" array. NEVER use action "create" for a file that already exists.

JSON schema:
[
  {
    "path": "path/to/existing/file.ts",
    "action": "modify",
    "modifications": [
      {
        "search": "exact string from the existing file to find",
        "replace": "new string to replace it with"
      }
    ]
  },
  {
    "path": "path/to/brand_new/file.ts",
    "action": "create",
    "content": "entire new file content"
  }
]

<think>Your analysis here</think>
<analyze>Your step-by-step plan here</analyze>
\`\`\`json
[ ... ]
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
              const parsed = JSON.parse(jsonStr);

              // ─────────────────────────────────────────────────────────────
              // FIX #5: Only allow explicit action:"create". No sneaky fallbacks.
              // FIX #3: Normalize paths for matching.
              // FIX #6: If file not in context, fetch from GitHub on-the-fly.
              // ─────────────────────────────────────────────────────────────
              const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);

              fileChanges = (await Promise.all(parsed.map(async (change: any) => {
                const normedChangePath = normalizePath(change.path);

                // ── ACTION: CREATE ──────────────────────────────────────
                if (change.action === "create" && change.content) {
                  return { path: change.path, content: change.content };
                }

                // ── ACTION: MODIFY ──────────────────────────────────────
                if (change.action === "modify" && change.modifications) {
                  // FIX #3: Find file using normalized path comparison
                  let existingFile = taskContextFiles.find(
                    (f: any) => normalizePath(f.filePath) === normedChangePath
                  );

                  let updatedContent = existingFile ? existingFile.content : "";

                  // FIX #6: File not in context? Fetch from GitHub live.
                  if (!updatedContent) {
                    // Also check the in-memory cache
                    if (fileContentCache.has(normedChangePath)) {
                      updatedContent = fileContentCache.get(normedChangePath)!;
                    } else {
                      try {
                        const refToFetch = branchState.exists ? branchName : (repo.defaultBranch || "main");
                        const { data: fileData } = await octokit.rest.repos.getContent({
                          owner, repo: repoName, path: change.path, ref: refToFetch
                        });
                        if (fileData && !Array.isArray(fileData) && (fileData as any).content) {
                          updatedContent = Buffer.from((fileData as any).content, 'base64').toString('utf8');
                        }
                      } catch (e) {
                        console.error(`CRITICAL: Cannot find file ${change.path} anywhere. Skipping modification.`);
                        return null;
                      }
                    }
                  }

                  // Apply each search/replace modification
                  for (const mod of change.modifications) {
                    if (updatedContent.includes(mod.search)) {
                      updatedContent = updatedContent.replace(mod.search, mod.replace);
                    } else {
                      // Fallback: try with normalized newlines
                      const normSearch = mod.search.replace(/\r\n/g, "\n");
                      const normContent = updatedContent.replace(/\r\n/g, "\n");
                      if (normContent.includes(normSearch)) {
                        updatedContent = normContent.replace(normSearch, mod.replace);
                      } else {
                        console.warn(`WARN: Exact match failed for modification in ${change.path}. Skipping this diff block.`);
                      }
                    }
                  }
                  return { path: change.path, content: updatedContent };
                }

                // ── FIX #5: NO FALLBACK ─────────────────────────────────
                // If the AI didn't use action:"create" or action:"modify",
                // we refuse to process it. This prevents silent full-file overwrites.
                console.warn(`WARN: Ignoring change for ${change.path} — missing valid action field. Got: ${JSON.stringify({ action: change.action, hasContent: !!change.content, hasMods: !!change.modifications })}`);
                return null;
              }))).filter(Boolean) as { path: string, content: string }[];

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
              const { data: refData } = await octokit.rest.git.getRef({ owner, repo: repoName, ref: `heads/${branchName}` });
              currentSha = refData.object.sha;
              branchExists = true;
            } catch (err: any) {
              if (err.status === 404 && !branchExists) {
                 await octokit.rest.git.createRef({ owner, repo: repoName, ref: `refs/heads/${branchName}`, sha: branchState.sha });
              }
            }

            // ─────────────────────────────────────────────────────────────
            // FIX #4: Catastrophic-deletion safety net
            // Block any commit that would delete >50% of a file's lines.
            // ─────────────────────────────────────────────────────────────
            const safeChanges: typeof fileChanges = [];
            for (const change of fileChanges) {
              const normedPath = normalizePath(change.path);
              const originalContent = fileContentCache.get(normedPath) || 
                taskContextFiles.find((f: any) => normalizePath(f.filePath) === normedPath)?.content || "";
              
              const originalLines = originalContent.split('\n').length;
              const newLines = change.content.split('\n').length;

              if (originalLines > 50 && newLines < originalLines * 0.5) {
                console.error(
                  `🛑 SAFETY NET: Blocked commit for ${change.path}. ` +
                  `Would delete ${originalLines - newLines} of ${originalLines} lines ` +
                  `(${Math.round((1 - newLines / originalLines) * 100)}% reduction). ` +
                  `This is almost certainly a bug in the AI output.`
                );
                continue; // Skip this destructive change
              }
              safeChanges.push(change);
            }

            if (safeChanges.length === 0) {
              console.warn(`All changes for task ${task.id} were blocked by the safety net. Skipping commit.`);
              return;
            }

            const tree = await Promise.all(safeChanges.map(async (change: any) => {
              const { data: blob } = await octokit.rest.git.createBlob({ owner, repo: repoName, content: change.content, encoding: "utf-8" });
              return { path: change.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
            }));

            const { data: newTree } = await octokit.rest.git.createTree({ owner, repo: repoName, base_tree: currentSha, tree });
            const commitMessage = `feat: ${task.title}`;
            const { data: newCommit } = await octokit.rest.git.createCommit({ owner, repo: repoName, message: commitMessage, tree: newTree.sha, parents: [currentSha] });

            await octokit.rest.git.updateRef({ owner, repo: repoName, ref: `heads/${branchName}`, sha: newCommit.sha, force: false });

            // Update the in-memory file content cache for subsequent tasks
            for (const change of safeChanges) {
              fileContentCache.set(normalizePath(change.path), change.content);
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

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Create the Pull Request exactly ONCE after all tasks are committed
    // ─────────────────────────────────────────────────────────────────────────
    await step.run("create-pr", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      let branchHasCommits = false;
      try {
        await octokit.rest.git.getRef({ owner, repo: repoName, ref: `heads/${branchName}` });
        branchHasCommits = true;
      } catch { /* branch doesn't exist */ }

      if (branchHasCommits) {
        try {
          await octokit.rest.pulls.create({
            owner, repo: repoName, title: `Implement: ${data.feature.title}`, head: branchName, base: repo.defaultBranch || "main",
            body: `Automated PR by Indecode AI implementation agent.\n\nPRD attached for feature: ${data.feature.title}`,
          });
        } catch (err: any) {
          if (err.status !== 422) throw err; // 422 = PR already exists
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Update Status to Review
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Increment Usage
    // ─────────────────────────────────────────────────────────────────────────
    await step.run("increment-usage", async () => {
      if ((data.feature as any)?.project?.user?.id) {
        await db.update(users)
          .set({ totalExecutions: sql`${users.totalExecutions} + 1` })
          .where(eq(users.id, (data.feature as any).project.user.id));
      }
    });

    return { success: true };
  }
);
