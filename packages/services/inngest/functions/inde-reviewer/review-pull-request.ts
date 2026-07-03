import { inngest } from "../../client";
import { db } from "@repo/database";
import { pullRequests, reviews, reviewIssues, prds, tasks, codebaseEmbeddings, featureRequests } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { getInstallationOctokit } from "../../../github/index";
import { generateText } from "ai";
import { getReviewModel } from "../../../ai/index";
import { getPullRequestFiles } from "./pr-files";
import { embedCode } from "../../../ai/embeddings";

export const reviewPullRequest = inngest.createFunction(
  { 
    id: "inde-reviewer", 
    name: "Advanced AI Code Review",
    retries: 3,
    triggers: [{ event: "github/pr.received" }]
  },
  async ({ event, step }) => {
    const { pullRequestId } = event.data;

    await step.run("mark-analyzing", async () => {
      await db.update(pullRequests).set({ status: "processing" }).where(eq(pullRequests.id, pullRequestId));
      
      const existingReviews = await db.query.reviews.findMany({
        where: eq(reviews.pullRequestId, pullRequestId),
      });
      const iteration = existingReviews.length + 1;

      await db.insert(reviews).values({
        pullRequestId,
        iteration,
        status: "analyzing",
        summary: "Analyzing PR...",
        overallVerdict: "needs_discussion",
        reviewData: {},
      });
    });

    const prInfo = await step.run("fetch-pr-info", async () => {
      const pr = await db.query.pullRequests.findFirst({
        where: eq(pullRequests.id, pullRequestId),
        with: {
          repository: {
            with: {
              githubInstallation: true,
              project: {
                with: {
                  user: true
                }
              }
            }
          },
          featureRequest: true,
        }
      });
      if (!pr) throw new Error("PR not found");
      return pr as any;
    });

    const files = await step.run("fetch-files", async () => {
      return getPullRequestFiles(
        prInfo.repository.githubInstallation.installationId,
        prInfo.repository.fullName,
        prInfo.prNumber
      );
    });

    if (files.length === 0) {
      await step.run("mark-empty", async () => {
        // Get latest review row to update specifically
        const latestReview = await db.query.reviews.findFirst({
          where: eq(reviews.pullRequestId, pullRequestId),
          orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
        });
        if (latestReview) {
          await db.update(reviews).set({ status: "completed", summary: "No code changes to review.", overallVerdict: "approved" })
            .where(eq(reviews.id, latestReview.id));
        }
        await db.update(pullRequests).set({ status: "approved" }).where(eq(pullRequests.id, pullRequestId));
      });
      return { success: true, message: "No files to review." };
    }

    const contextData = await step.run("load-context", async () => {
      let prdContent = "";
      let tasksList: any[] = [];
      
      if (prInfo.featureRequestId) {
        const prd = await db.query.prds.findFirst({
          where: eq(prds.featureRequestId, prInfo.featureRequestId)
        });
        if (prd) prdContent = prd.content;
        
        tasksList = await db.query.tasks.findMany({
          where: eq(tasks.featureRequestId, prInfo.featureRequestId)
        });
      }
      return { prdContent, tasksList };
    });

    const repoContext = await step.run("fetch-repo-context", async () => {
      const queryStr = `PR Title: ${prInfo.title}\nFiles: ${files.map(f => f.filePath).join(", ")}`;
      const queryEmbeddings = await embedCode(queryStr);
      
      const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
      const results = await db.select({
        filePath: codebaseEmbeddings.filePath,
        content: codebaseEmbeddings.content,
      })
      .from(codebaseEmbeddings)
      .where(eq(codebaseEmbeddings.repositoryId, prInfo.repositoryId))
      .orderBy(sql`${similarity} DESC`)
      .limit(5);

      return results;
    });

    const reviewOutput = await step.run("generate-review", async () => {
      const diffStr = files.map(f => `FILE: ${f.filePath}\n\`\`\`diff\n${f.patch}\n\`\`\``).join("\n\n");
      const repoContextStr = repoContext.map(r => `FILE: ${r.filePath}\n${r.content}`).join("\n\n");

      const isPaid = (prInfo.repository as any)?.project?.user?.plan === "pro" || (prInfo.repository as any)?.project?.user?.plan === "enterprise";

      const systemOpenLM = `<system_instructions>
You are an elite Senior AI Prompt Engineer and L6+ Staff Engineer at Google.
Your role is to review a Pull Request diff against the provided PRD, Tasks, and Repository Context.

<rules>
1. Strictly Professional: Do NOT use emojis. Do NOT use filler words. Do NOT generate boilerplate text.
2. High Signal Only: Every line you write must carry high signal and tangible value. Avoid generic praises.
3. Be Precise: Look for architectural correctness, security flaws, performance bottlenecks, and strict alignment with the PRD.
4. Actionable Suggestions: When describing an issue, the suggestion must be an exact technical solution or code fix.
</rules>

<output_format>
Output a JSON object exactly matching this structure (no markdown wrapper):
{
  "summary": "Concise, high-signal summary of the review",
  "overallVerdict": "approved" | "changes_required" | "needs_discussion",
  "issues": [
    {
      "severity": "blocking" | "high" | "medium" | "low" | "suggestion",
      "title": "Clear, technical issue title",
      "description": "Precise explanation of the flaw and why it matters",
      "filePath": "path/to/file",
      "lineNumber": 123 (approximate line number within the file, MUST be a number or null),
      "suggestion": "Exact technical solution or code fix"
    }
  ]
}
If there are no major issues, output "approved" for overallVerdict.
</output_format>

<examples>
<example_flawed_implementation>
{
  "summary": "The PR implements the caching layer, but introduces a race condition and lacks proper error handling for the Redis client.",
  "overallVerdict": "changes_required",
  "issues": [
    {
      "severity": "blocking",
      "title": "Race Condition in Cache Invalidation",
      "description": "The invalidation method deletes the key before acquiring the lock, potentially allowing a concurrent request to read stale data.",
      "filePath": "src/cache/manager.ts",
      "lineNumber": 45,
      "suggestion": "Acquire the distributed lock before deleting the key: \`await this.lock.acquire(); await this.redis.del(key);\`"
    },
    {
      "severity": "medium",
      "title": "Missing Error Boundary",
      "description": "If the Redis connection drops, the fallback logic is completely bypassed resulting in an unhandled promise rejection.",
      "filePath": "src/cache/manager.ts",
      "lineNumber": 82,
      "suggestion": "Wrap the Redis call in a try/catch and fallback to DB query: \`try { return await this.redis.get(key); } catch (e) { return this.db.fetch(key); }\`"
    }
  ]
}
</example_flawed_implementation>

<example_approved>
{
  "summary": "Clean implementation of the user profile endpoint. A minor performance optimization can be made.",
  "overallVerdict": "approved",
  "issues": [
    {
      "severity": "suggestion",
      "title": "N+1 Query Optimization",
      "description": "Fetching roles inside the loop will cause N+1 database queries when processing large arrays.",
      "filePath": "src/api/users.ts",
      "lineNumber": 112,
      "suggestion": "Use a DataLoader or bulk fetch the roles before mapping over the users."
    }
  ]
}
</example_approved>
</examples>
</system_instructions>`;

      const systemAlpaca = `### Instruction:
You are an elite Senior AI Prompt Engineer and L6+ Staff Engineer at Google.
Your role is to review a Pull Request diff against the provided PRD, Tasks, and Repository Context.

### Rules:
1. **Strictly Professional**: Do NOT use emojis. Do NOT use filler words. Do NOT generate boilerplate text.
2. **High Signal Only**: Every line you write must carry high signal and tangible value. Avoid generic praises.
3. **Be Precise**: Look for architectural correctness, security flaws, performance bottlenecks, and strict alignment with the PRD.
4. **Actionable Suggestions**: When describing an issue, the suggestion must be an exact technical solution or code fix.

### Output Format:
Output a JSON object exactly matching this structure (no markdown wrapper):
{
  "summary": "Concise, high-signal summary of the review",
  "overallVerdict": "approved" | "changes_required" | "needs_discussion",
  "issues": [
    {
      "severity": "blocking" | "high" | "medium" | "low" | "suggestion",
      "title": "Clear, technical issue title",
      "description": "Precise explanation of the flaw and why it matters",
      "filePath": "path/to/file",
      "lineNumber": 123 (approximate line number within the file, MUST be a number or null),
      "suggestion": "Exact technical solution or code fix"
    }
  ]
}
If there are no major issues, output "approved" for overallVerdict.

### Example Outputs:

**Example 1: Flawed Implementation (changes_required)**
{
  "summary": "The PR implements the caching layer, but introduces a race condition and lacks proper error handling for the Redis client.",
  "overallVerdict": "changes_required",
  "issues": [
    {
      "severity": "blocking",
      "title": "Race Condition in Cache Invalidation",
      "description": "The invalidation method deletes the key before acquiring the lock, potentially allowing a concurrent request to read stale data.",
      "filePath": "src/cache/manager.ts",
      "lineNumber": 45,
      "suggestion": "Acquire the distributed lock before deleting the key: \`await this.lock.acquire(); await this.redis.del(key);\`"
    },
    {
      "severity": "medium",
      "title": "Missing Error Boundary",
      "description": "If the Redis connection drops, the fallback logic is completely bypassed resulting in an unhandled promise rejection.",
      "filePath": "src/cache/manager.ts",
      "lineNumber": 82,
      "suggestion": "Wrap the Redis call in a try/catch and fallback to DB query: \`try { return await this.redis.get(key); } catch (e) { return this.db.fetch(key); }\`"
    }
  ]
}

**Example 2: Minor Nits (approved)**
{
  "summary": "Clean implementation of the user profile endpoint. A minor performance optimization can be made.",
  "overallVerdict": "approved",
  "issues": [
    {
      "severity": "suggestion",
      "title": "N+1 Query Optimization",
      "description": "Fetching roles inside the loop will cause N+1 database queries when processing large arrays.",
      "filePath": "src/api/users.ts",
      "lineNumber": 112,
      "suggestion": "Use a DataLoader or bulk fetch the roles before mapping over the users."
    }
  ]
}
`;

      const promptOpenLM = `<input>
Review the following Pull Request.
</input>

<context>
<prd>
${contextData.prdContent || "No PRD provided"}
</prd>

<tasks>
${JSON.stringify(contextData.tasksList.map(t => t.title)) || "No tasks provided"}
</tasks>

<repository_context>
${repoContextStr || "No related context found"}
</repository_context>

<pull_request_diff>
${diffStr.slice(0, 80000)}
</pull_request_diff>
</context>`;

      const promptAlpaca = `### Input:
Review the following Pull Request.

### Context:
=== PRD ===
${contextData.prdContent || "No PRD provided"}

=== TASKS ===
${JSON.stringify(contextData.tasksList.map(t => t.title)) || "No tasks provided"}

=== RELATED REPOSITORY CONTEXT ===
${repoContextStr || "No related context found"}

=== PULL REQUEST DIFF ===
${diffStr.slice(0, 80000)}

### Response:
`;

      const response = await generateText({
        model: getReviewModel(isPaid ? "pro" : "free"),
        system: isPaid ? systemOpenLM : systemAlpaca,
        prompt: isPaid ? promptOpenLM : promptAlpaca,
      });

      try {
        let text = response.text.trim();
        if (text.startsWith("\`\`\`json")) {
            text = text.slice(7, -3);
        } else if (text.startsWith("\`\`\`")) {
            text = text.slice(3, -3);
        }
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse AI review output", e);
        throw new Error("Invalid JSON from AI model");
      }
    });

    await step.run("save-review", async () => {
      const latestReview = await db.query.reviews.findFirst({
        where: eq(reviews.pullRequestId, pullRequestId),
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
      });

      if (latestReview) {
        await db.update(reviews).set({
          status: "completed",
          summary: reviewOutput.summary,
          overallVerdict: reviewOutput.overallVerdict,
          reviewData: reviewOutput,
        }).where(eq(reviews.id, latestReview.id));

        if (reviewOutput.issues && reviewOutput.issues.length > 0) {
          await db.insert(reviewIssues).values(
            reviewOutput.issues.map((i: any) => ({
              reviewId: latestReview.id,
              severity: i.severity,
              title: i.title,
              description: i.description,
              filePath: i.filePath,
              lineNumber: typeof i.lineNumber === "number" ? i.lineNumber : null,
              suggestion: i.suggestion,
            }))
          );
        }
      }

      await db.update(pullRequests).set({
        status: reviewOutput.overallVerdict === "approved" ? "approved" : "changes_required"
      }).where(eq(pullRequests.id, pullRequestId));
    });

    await step.run("post-github-comment", async () => {
      const octokit = await getInstallationOctokit(prInfo.repository.githubInstallation.installationId);
      const [owner, repo] = prInfo.repository.fullName.split("/");
      
      let commentBody = `## 🤖 Inde-Reviewer Analysis\n\n`;
      commentBody += `**Verdict:** ${reviewOutput.overallVerdict.toUpperCase()}\n`;
      commentBody += `**Summary:** ${reviewOutput.summary}\n\n`;

      if (reviewOutput.issues && reviewOutput.issues.length > 0) {
        commentBody += "### Issues Identified\n\n";
        reviewOutput.issues.forEach((i: any) => {
           commentBody += `- **[${i.severity.toUpperCase()}]** ${i.filePath ? `\`${i.filePath}\`${i.lineNumber ? `:${i.lineNumber}` : ''}` : ''} - ${i.title}\n  ${i.description}\n`;
           if (i.suggestion) commentBody += `  *Suggestion:* ${i.suggestion}\n\n`;
        });
      }

      // 1. Post overall summary comment
      await octokit.rest.issues.createComment({
        owner: owner as string,
        repo: repo as string,
        issue_number: prInfo.prNumber,
        body: commentBody
      });

      // 2. Post inline comments (best-effort)
      if (reviewOutput.issues && reviewOutput.issues.length > 0) {
        // We get the latest commit SHA to post reviews against
        const { data: commits } = await octokit.rest.pulls.listCommits({
          owner: owner as string,
          repo: repo as string,
          pull_number: prInfo.prNumber,
        });
        const latestCommitId = commits?.[commits.length - 1]?.sha;

        for (const issue of reviewOutput.issues) {
          if (issue.filePath && issue.lineNumber) {
            try {
              let body = `**[${issue.severity.toUpperCase()}] ${issue.title}**\n${issue.description}`;
              if (issue.suggestion) {
                body += `\n\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
              }
              
              await octokit.rest.pulls.createReviewComment({
                owner: owner as string,
                repo: repo as string,
                pull_number: prInfo.prNumber,
                commit_id: latestCommitId as string,
                path: issue.filePath,
                line: issue.lineNumber,
                body,
              });
            } catch (err) {
              console.warn("Failed to post inline comment for", issue.filePath, issue.lineNumber, err);
            }
          }
        }
      }

      // Mark as posted
      const latestReview = await db.query.reviews.findFirst({
        where: eq(reviews.pullRequestId, pullRequestId),
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
      });
      if (latestReview) {
        await db.update(reviews).set({ postedToGithub: true }).where(eq(reviews.id, latestReview.id));
      }

      // Emit event to update UI in real-time
      if (prInfo.featureRequestId) {
        // Also update feature status
        const newFeatureStatus = reviewOutput.overallVerdict === "approved" ? "shipped" : "review";
        await db.update(featureRequests)
          .set({ status: newFeatureStatus })
          .where(eq(featureRequests.id, prInfo.featureRequestId));

        const API_BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || "http://localhost:8000";
        try {
          await fetch(`${API_BASE_URL}/api/internal/emit`, {
            method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET || "" },
            body: JSON.stringify({ 
              event: "featureUpdated", 
              featureId: prInfo.featureRequestId, 
              data: { status: newFeatureStatus } 
            })
          });
        } catch (e) {
          console.warn("Failed to emit featureUpdated socket event:", e);
        }
      }
    });

    return { success: true };
  }
);
