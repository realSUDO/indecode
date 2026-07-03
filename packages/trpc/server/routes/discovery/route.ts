import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db } from "@repo/database";
import { discoverySessions, discoveryMessages, featureRequests, codebaseEmbeddings } from "@repo/database/schema";
import { eq, asc, sql } from "drizzle-orm";
import { generateInitialDiscoveryMessage, generateDiscoveryResponse } from "@repo/services/ai/agents/discovery";
import { embedCode } from "@repo/services/ai/embeddings";
import { inngest } from "@repo/services/inngest";
import { hasProjectAccess } from "../../utils/auth";
import { TRPCError } from "@trpc/server";

export const discoveryRouter = router({
  getSession: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ input }) => {
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
        with: {
          messages: {
            orderBy: [asc(discoveryMessages.createdAt)],
          },
        },
      });

      if (!session) {
        return null;
      }

      return {
        id: session.id,
        status: session.status,
        summary: session.summary,
        messages: session.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }),

  /**
   * Initialize a discovery session with the first AI message.
   * Called when user first visits the discovery page and no messages exist yet.
   */
  initialize: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the session
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
        with: { messages: true },
      });

      if (!session) {
        throw new Error("Discovery session not found. Feature request may still be processing.");
      }

      // Get the feature request for context + access check
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
        with: { project: { with: { repositories: true } } }
      });

      if (!feature) throw new Error("Feature request not found");

      // M2: Validate the user has access to this feature's project
      const hasAccess = await hasProjectAccess(feature.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this feature request" });
      }

      // If already has messages, skip
      if (session.messages.length > 0) {
        return { alreadyInitialized: true };
      }

      // M7: Run initial RAG query to give the first AI message codebase context
      let codeContext = "";
      const repo = feature.project?.repositories[0];
      if (repo) {
        const queryEmbeddings = await embedCode(`Feature: ${feature.title}\n${feature.description}`);
        const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
        const results = await db.select({
          filePath: codebaseEmbeddings.filePath,
          content: codebaseEmbeddings.content,
        })
        .from(codebaseEmbeddings)
        .where(eq(codebaseEmbeddings.repositoryId, repo.id))
        .orderBy(sql`${similarity} DESC`)
        .limit(5);

        if (results.length > 0) {
          codeContext = results.map(r => `FILE: ${r.filePath}\n${r.content}`).join("\n\n");
        }
      }

      // Generate initial AI message
      const aiResponse = await generateInitialDiscoveryMessage({
        featureTitle: feature.title,
        featureDescription: feature.description,
        codeContext,
        plan: ctx.user.plan as any,
      });

      // Save AI message
      await db.insert(discoveryMessages).values({
        sessionId: session.id,
        role: "assistant",
        content: aiResponse,
      });

      return { alreadyInitialized: false };
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      featureRequestId: z.string(),
      message: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get session
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
        with: {
          messages: {
            orderBy: [asc(discoveryMessages.createdAt)],
          },
        },
      });

      if (!session) throw new Error("Discovery session not found");
      if (session.status !== "active") throw new Error("Discovery session is no longer active");

      // Get feature request for context
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
        with: { project: { with: { repositories: true } } }
      });
      if (!feature) throw new Error("Feature request not found");

      // Save user message
      const [userMsg] = await db.insert(discoveryMessages).values({
        sessionId: session.id,
        role: "user",
        content: input.message,
      }).returning();
      if (!userMsg) throw new Error("Failed to save user message");

      // Build conversation history
      const history = session.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // H4: RAG Logic — top-level imports, no require()
      let codeContext = "";
      const repo = feature.project?.repositories[0];
      if (repo) {
        const queryEmbeddings = await embedCode(`Feature: ${feature.title}\nUser says: ${input.message}`);
        const similarity = sql<number>`1 - (${codebaseEmbeddings.embedding} <=> ${JSON.stringify(queryEmbeddings)}::vector)`;
        
        const results = await db.select({
          filePath: codebaseEmbeddings.filePath,
          content: codebaseEmbeddings.content,
        })
        .from(codebaseEmbeddings)
        .where(eq(codebaseEmbeddings.repositoryId, repo.id))
        .orderBy(sql`${similarity} DESC`)
        .limit(5);

        if (results.length > 0) {
          codeContext = results.map(r => `FILE: ${r.filePath}\n${r.content}`).join("\n\n");
        }
      }

      // Generate AI response
      const aiResponse = await generateDiscoveryResponse({
        featureTitle: feature.title,
        featureDescription: feature.description,
        conversationHistory: history,
        userMessage: input.message,
        codeContext,
        plan: ctx.user.plan as any,
      });

      // Save AI response
      const [aiMsg] = await db.insert(discoveryMessages).values({
        sessionId: session.id,
        role: "assistant",
        content: aiResponse,
      }).returning();
      if (!aiMsg) throw new Error("Failed to save AI message");

      return {
        userMessageId: userMsg.id,
        aiMessageId: aiMsg.id,
        aiResponse,
      };
    }),

  complete: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // M2: Validate the user has access
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });
      if (!feature) throw new Error("Feature request not found");

      const hasAccess = await hasProjectAccess(feature.projectId, ctx.user.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this feature request" });
      }

      // Mark session as completed
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
      });

      if (!session) throw new Error("Discovery session not found");

      await db.update(discoverySessions)
        .set({ status: "completed" })
        .where(eq(discoverySessions.id, session.id));

      // M6: DO NOT double-write prd_draft here — generate-prd.ts will set it after completion
      // The inngest function is the single source of truth for status transitions

      // Trigger PRD generation via Inngest
      await inngest.send({
        name: "discovery/session.complete",
        data: { featureRequestId: input.featureRequestId, discoverySessionId: session.id },
      });

      return { success: true };
    }),
});
