import { inngest } from "../client";
import { db } from "@repo/database";
import { pullRequests, reviews, reviewIssues, prds, tasks, repositories, githubInstallations, featureRequests } from "@repo/database/schema";
import { eq } from "drizzle-orm";
import { getInstallationOctokit } from "../../github";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedCode } from "../../ai/embeddings";
// import Pinecone or other context here if needed, but for now we'll fetch diff and use AI

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export const reviewPullRequest = inngest.createFunction(
  { 
    id: "review-pull-request", 
    name: "AI Code Review",
    triggers: [{ event: "github/pr.received" }]
  },
  async ({ event, step }) => {
    const { pullRequestId } = event.data;

    await step.run("mark-processing", async () => {
      await db.update(pullRequests).set({ status: "processing" }).where(eq(pullRequests.id, pullRequestId));
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

    const diff = await step.run("fetch-diff", async () => {
      const octokit = await getInstallationOctokit(prInfo.repository.githubInstallation.installationId);
      const [owner, repo] = prInfo.repository.fullName.split("/");
      const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
        owner,
        repo,
        pull_number: prInfo.prNumber,
        mediaType: {
          format: "diff",
        }
      });
      return data as unknown as string; // The diff string
    });

    const contextData = await step.run("load-context", async () => {
      let prdContent = "";
      let tasksList = [];
      
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

    const reviewOutput = await step.run("generate-review", async () => {
      // For dev/testing, we use a cheap model as requested by user.
      const response = await generateText({
        model: openrouter("openai/gpt-4o-mini"), // Cheap model
        system: `You are an expert Staff Engineer and Code Reviewer.
Your goal is to review a Pull Request diff against the provided PRD and Task list.
Output a JSON object exactly matching this structure (no markdown wrapper):
{
  "summary": "Overall summary of the review",
  "overallVerdict": "approved" | "changes_required" | "needs_discussion",
  "issues": [
    {
      "severity": "blocking" | "high" | "medium" | "low" | "suggestion",
      "title": "Issue title",
      "description": "Detailed description of the issue",
      "filePath": "path/to/file (optional)",
      "lineNumber": 123 (optional),
      "suggestion": "How to fix the issue (optional)"
    }
  ]
}
Be precise. Look for correctness, security, performance, and alignment with the PRD.
If there are no major issues, output "approved" for overallVerdict.`,
        prompt: `
Review the following Pull Request.

=== DIFF ===
${diff.slice(0, 50000)} // truncate to avoid token limits

=== PRD ===
${contextData.prdContent || "No PRD provided"}

=== TASKS ===
${JSON.stringify(contextData.tasksList) || "No tasks provided"}
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
      // Find latest iteration
      const existingReviews = await db.query.reviews.findMany({
        where: eq(reviews.pullRequestId, pullRequestId),
      });
      const iteration = existingReviews.length + 1;

      const [newReview] = await db.insert(reviews).values({
        pullRequestId,
        iteration,
        summary: reviewOutput.summary,
        overallVerdict: reviewOutput.overallVerdict,
        reviewData: reviewOutput,
        postedToGithub: false,
      }).returning({ id: reviews.id });

      if (reviewOutput.issues && reviewOutput.issues.length > 0) {
        await db.insert(reviewIssues).values(
          reviewOutput.issues.map((i: any) => ({
            reviewId: newReview.id,
            severity: i.severity,
            title: i.title,
            description: i.description,
            filePath: i.filePath,
            lineNumber: i.lineNumber,
            suggestion: i.suggestion,
          }))
        );
      }

      await db.update(pullRequests).set({
        status: reviewOutput.overallVerdict === "approved" ? "approved" : "changes_required"
      }).where(eq(pullRequests.id, pullRequestId));
    });

    await step.run("post-github-comment", async () => {
      const octokit = await getInstallationOctokit(prInfo.repository.githubInstallation.installationId);
      const [owner, repo] = prInfo.repository.fullName.split("/");
      
      let commentBody = `## AI Code Review

**Verdict:** ${reviewOutput.overallVerdict.toUpperCase()}
**Summary:** ${reviewOutput.summary}

`;

      if (reviewOutput.issues && reviewOutput.issues.length > 0) {
        commentBody += "### Issues\n\n";
        reviewOutput.issues.forEach((i: any) => {
           commentBody += `- **[${i.severity.toUpperCase()}]** ${i.title}\n  ${i.description}\n`;
           if (i.suggestion) commentBody += `  *Suggestion:* ${i.suggestion}\n`;
        });
      }

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prInfo.prNumber,
        body: commentBody
      });

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
