import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { db } from "@repo/database";
import { discoverySessions, discoveryMessages, featureRequests } from "@repo/database/schema";
import { eq, asc } from "drizzle-orm";
import { generateInitialDiscoveryMessage, generateDiscoveryResponse } from "@repo/services/ai/agents/discovery";
import { inngest } from "@repo/services/inngest";

export const discoveryRouter = router({
  getSession: publicProcedure
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
  initialize: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ input }) => {
      // Get the session
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
        with: { messages: true },
      });

      if (!session) {
        throw new Error("Discovery session not found. Feature request may still be processing.");
      }

      // If already has messages, skip
      if (session.messages.length > 0) {
        return { alreadyInitialized: true };
      }

      // Get the feature request for context
      const feature = await db.query.featureRequests.findFirst({
        where: eq(featureRequests.id, input.featureRequestId),
      });

      if (!feature) throw new Error("Feature request not found");

      // Generate initial AI message
      const aiResponse = await generateInitialDiscoveryMessage({
        featureTitle: feature.title,
        featureDescription: feature.description,
      });

      // Save AI message
      await db.insert(discoveryMessages).values({
        sessionId: session.id,
        role: "assistant",
        content: aiResponse,
      });

      return { alreadyInitialized: false };
    }),

  sendMessage: publicProcedure
    .input(z.object({
      featureRequestId: z.string(),
      message: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
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

      // RAG Logic
      let codeContext = "";
      const repo = feature.project?.repositories[0];
      if (repo) {
        const { embedCode } = require("@repo/services/ai/embeddings");
        const { codebaseEmbeddings } = require("@repo/database/schema");
        const { sql } = require("drizzle-orm");
        
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

  complete: publicProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ input }) => {
      // Mark session as completed
      const session = await db.query.discoverySessions.findFirst({
        where: eq(discoverySessions.featureRequestId, input.featureRequestId),
      });

      if (!session) throw new Error("Discovery session not found");

      await db.update(discoverySessions)
        .set({ status: "completed" })
        .where(eq(discoverySessions.id, session.id));

      // Update feature request status
      await db.update(featureRequests)
        .set({ status: "prd_draft" })
        .where(eq(featureRequests.id, input.featureRequestId));

      // Trigger PRD generation via Inngest
      await inngest.send({
        name: "discovery/session.complete",
        data: { featureRequestId: input.featureRequestId, discoverySessionId: session.id },
      });

      return { success: true };
    }),
});
