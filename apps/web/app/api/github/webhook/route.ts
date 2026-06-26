import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@repo/database";
import { githubInstallations, pullRequests, repositories } from "@repo/database/schema";
import { eq, and } from "drizzle-orm";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!signature || !WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify signature
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = "sha256=" + hmac.update(rawBody).digest("hex");

    if (signature !== digest) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = req.headers.get("x-github-event");
    const payload = JSON.parse(rawBody);

    if (event === "installation") {
      if (payload.action === "created") {
        // Track the installation
        // For a real app, you'd match payload.installation.account.login to an organization
        // We'll just create a placeholder installation record for now
        await db.insert(githubInstallations).values({
          installationId: payload.installation.id,
          accountLogin: payload.installation.account.login,
          accountType: payload.installation.account.type,
        });
      } else if (payload.action === "deleted") {
        await db.delete(githubInstallations).where(eq(githubInstallations.installationId, payload.installation.id));
      }
    } else if (event === "pull_request") {
      if (payload.action === "opened" || payload.action === "synchronize") {
        // Find if this repo is tracked by us
        const repoFullName = payload.repository.full_name;
        const repoRecord = await db.query.repositories.findFirst({
          where: eq(repositories.fullName, repoFullName)
        });

        if (repoRecord) {
          // Upsert the pull request
          // (Drizzle upsert syntax varies, we'll do simple check for now)
          const existingPr = await db.query.pullRequests.findFirst({
            where: and(
              eq(pullRequests.repositoryId, repoRecord.id),
              eq(pullRequests.prNumber, payload.pull_request.number)
            )
          });

          if (!existingPr) {
            await db.insert(pullRequests).values({
              repositoryId: repoRecord.id,
              installationId: payload.installation.id,
              prNumber: payload.pull_request.number,
              title: payload.pull_request.title,
              authorLogin: payload.pull_request.user.login,
              headSha: payload.pull_request.head.sha,
              baseBranch: payload.pull_request.base.ref,
              status: "pending"
            });
          } else {
            await db.update(pullRequests)
              .set({
                headSha: payload.pull_request.head.sha,
                title: payload.pull_request.title,
                status: "pending" // reset status for new review on sync
              })
              .where(eq(pullRequests.id, existingPr.id));
          }

          // In the future: trigger Inngest event for AI review here
          console.log(`[GitHub Webhook] Captured PR #${payload.pull_request.number} for ${repoFullName}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GitHub Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
