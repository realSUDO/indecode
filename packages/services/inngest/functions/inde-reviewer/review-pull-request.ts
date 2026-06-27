import { inngest } from "../../../client";
import { db } from "@repo/database";
import { pullRequests, reviews, reviewIssues, prds, tasks, codebaseEmbeddings } from "@repo/database/schema";
import { eq, sql } from "drizzle-orm";
import { getInstallationOctokit } from "../../../github/index";
import { generateText } from "ai";
import { getPlanningModel } from "../../../ai/index";
import { getPullRequestFiles, PrFile } from "./pr-files";
import { embedCode } from "../../../ai/embeddings";

export const reviewPullRequest = inngest.createFunction(
  { 
    id: "inde-reviewer", 
    name: "Advanced AI Code Review",
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
            }
          },
          featureRequest: true,
        }
      });
      if (!pr) throw new Error("PR not found");
      return pr;
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
        await db.update(reviews).set({ status: "completed", summary: "No code changes to review.", overallVerdict: "approved" })
          .where(eq(reviews.pullRequestId, pullRequestId));
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

      const response = await generateText({
        model: getPlanningModel(),
        system: `You are Inde-Reviewer, an expert Staff Engineer and Code Reviewer.
Your goal is to review a Pull Request diff against the provided PRD, Tasks, and Repository Context.
Output a JSON object exactly matching this structure (no markdown wrapper):
{
  "summary": "Overall summary of the review",
  "overallVerdict": "approved" | "changes_required" | "needs_discussion",
  "issues": [
    {
      "severity": "blocking" | "high" | "medium" | "low" | "suggestion",
      "title": "Issue title",
      "description": "Detailed description of the issue",
      "filePath": "path/to/file",
      "lineNumber": 123 (approximate line number within the file, MUST be a number or null),
      "suggestion": "How to fix the issue"
    }
  ]
}
Be precise. Look for correctness, security, performance, and alignment with the PRD.
If there are no major issues, output "approved" for overallVerdict.`,
        prompt: `
Review the following Pull Request.

=== PRD ===
${contextData.prdContent || "No PRD provided"}

=== TASKS ===
${JSON.stringify(contextData.tasksList.map(t => t.title)) || "No tasks provided"}

=== RELATED REPOSITORY CONTEXT ===
${repoContextStr || "No related context found"}

=== PULL REQUEST DIFF ===
${diffStr.slice(0, 80000)} // truncate to avoid token limits
        `,
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
        owner,
        repo,
        issue_number: prInfo.prNumber,
        body: commentBody
      });

      // 2. Post inline comments (best-effort)
      if (reviewOutput.issues && reviewOutput.issues.length > 0) {
        // We get the latest commit SHA to post reviews against
        const { data: commits } = await octokit.rest.pulls.listCommits({
          owner,
          repo,
          pull_number: prInfo.prNumber,
        });
        const latestCommitId = commits[commits.length - 1].sha;

        for (const issue of reviewOutput.issues) {
          if (issue.filePath && issue.lineNumber) {
            try {
              let body = `**[${issue.severity.toUpperCase()}] ${issue.title}**\n${issue.description}`;
              if (issue.suggestion) {
                body += `\n\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
              }
              
              await octokit.rest.pulls.createReviewComment({
                owner,
                repo,
                pull_number: prInfo.prNumber,
                commit_id: latestCommitId,
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
    });

    return { success: true };
  }
);
