import { generateText } from "ai";
import { getDiscoveryModel } from "../index";

const DISCOVERY_SYSTEM_PROMPT = `You are Indecode's Discovery Agent — an experienced Product Manager specializing in requirement gathering.

Your job is to understand what the user wants to build by asking intelligent, focused follow-up questions. You are conversational, friendly, and thorough.
Because you have access to the user's codebase context (provided as "Codebase Context"), you do NOT need to ask basic questions about the existing architecture unless it is ambiguous.

## Your Approach

1. **Understand the intent**: Start by acknowledging the feature request and summarizing your understanding based on the codebase context.
2. **Ask clarifying questions**: Ask 1-2 focused questions at a time. Don't overwhelm the user. Use the codebase context to ask highly technical, specific questions rather than generic ones.
3. **DO NOT INFINITE LOOP**: Do NOT ask endless questions. The goal is to move fast. After 1 or 2 rounds of questions, or if the user says they are done, you MUST explicitly state that you have all the information you need and tell the user to click "Complete Discovery" or explicitly mark it complete.
4. **Summarize**: When you have enough context, summarize the technical requirements concisely.

## Rules

- Be concise. No fluff or filler.
- Use the provided Codebase Context to understand the existing project.
- Do NOT ask questions if the codebase context already answers them.
- If you have enough context, stop asking questions and explicitly say: "I have all the information I need. Please click 'Complete Discovery' to proceed."`;

interface DiscoveryInput {
  featureTitle: string;
  featureDescription: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage?: string;
  codeContext?: string;
}

/**
 * Generate the initial AI response when a discovery session starts.
 */
export async function generateInitialDiscoveryMessage(input: {
  featureTitle: string;
  featureDescription: string;
}): Promise<string> {
  const result = await generateText({
    model: getDiscoveryModel(),
    system: DISCOVERY_SYSTEM_PROMPT,
    prompt: `A new feature request has been submitted:

**Title:** ${input.featureTitle}
**Description:** ${input.featureDescription}

Please acknowledge the request, summarize your understanding, and ask your first round of clarifying questions.`,
  });

  return result.text;
}

/**
 * Generate an AI response during an ongoing discovery conversation.
 */
export async function generateDiscoveryResponse(input: DiscoveryInput): Promise<string> {
  const messages = input.conversationHistory.map(msg => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  if (input.userMessage) {
    messages.push({ role: "user", content: input.userMessage });
  }

  const system = `${DISCOVERY_SYSTEM_PROMPT}

Context — Feature Request:
- Title: ${input.featureTitle}
- Description: ${input.featureDescription}

${input.codeContext ? `Codebase Context (Vector RAG results based on conversation):\n${input.codeContext}` : ""}`;

  const result = await generateText({
    model: getDiscoveryModel(),
    system,
    messages,
  });

  return result.text;
}
