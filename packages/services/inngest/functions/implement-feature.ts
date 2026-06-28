import { inngest } from "../client";
import { db } from "@repo/database";
import { featureRequests, prds, tasks, codebaseEmbeddings, pullRequests } from "@repo/database/schema";
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

    // 3. Generate File Changes using Senior AI Prompt
    const fileChanges = await step.run("generate-code", async () => {
      const contextStr = contextFiles.map((f: any) => `FILE: ${f.filePath}\n${f.content}`).join("\n\n");
      
      let reviewIssuesStr = "";
      if (data.pr?.reviews?.length && data.pr.reviews[0].issues.length > 0) {
        reviewIssuesStr = `\n\nRecent Review Issues to Fix:\n` + 
          data.pr.reviews[0].issues.map((i: any) => `- ${i.title}: ${i.description} (File: ${i.filePath || 'N/A'})`).join("\n");
      }

      const prompt = `You are acting as the Lead Engineer, Staff Software Architect (Amazon L6+/L7), and Technical Lead responsible for implementing features on an active Pull Request.

Your responsibility is to continue development on the existing feature branch, preserving its history and intent until it is ready to merge.

Never restart implementation.
Never abandon the current branch.
Every implementation should be an incremental improvement toward a merge-ready Pull Request.

Feature: ${data.feature.title}
PRD: ${data.prd?.content || "N/A"}
Tasks: ${JSON.stringify(data.featureTasks.map((t: any) => t.title))}
${reviewIssuesStr}

Relevant existing code (Current Branch State):
${contextStr}

Respond ONLY with a JSON array of file changes that represent the next logical commit. Format:
[
  { "path": "path/to/file", "content": "entire new file content" }
]`;

      const result = await generateText({
        model: getPlanningModel(),
        prompt,
      });

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

    if (fileChanges.length === 0) {
      return { success: false, message: "No code changes generated." };
    }

    // 4. Create Commit & PR
    await step.run("create-pr", async () => {
      const octokit = await getInstallationOctokit(repo.githubInstallation.installationId);
      
      if (!branchState.exists) {
        await octokit.rest.git.createRef({
          owner, repo: name, ref: `refs/heads/${branchName}`, sha: branchState.sha,
        });
      }

      const tree = await Promise.all(fileChanges.map(async (change: any) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner, repo: name, content: change.content, encoding: "utf-8",
        });
        return { path: change.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
      }));

      const { data: newTree } = await octokit.rest.git.createTree({
        owner, repo: name, base_tree: branchState.sha, tree,
      });

      const commitMessage = data.pr?.reviews?.length ? `fix: Address review issues for ${data.feature.title}` : `feat: Implement ${data.feature.title}`;

      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner, repo: name, message: commitMessage, tree: newTree.sha, parents: [branchState.sha],
      });

      await octokit.rest.git.updateRef({
        owner, repo: name, ref: `heads/${branchName}`, sha: newCommit.sha, force: false, // Iterative fast-forward
      });

      if (!branchState.exists) {
        try {
          await octokit.rest.pulls.create({
            owner, repo: name, title: `Implement: ${data.feature.title}`, head: branchName, base: repo.defaultBranch || "main",
            body: `Automated PR by Indecode AI implementation agent.\n\nPRD attached for feature: ${data.feature.title}`,
          });
        } catch (err: any) {
          if (err.status !== 422) throw err;
        }
      }
    });

    return { success: true, filesModified: fileChanges.length };
  }
);
