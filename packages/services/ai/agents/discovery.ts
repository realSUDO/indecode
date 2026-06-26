import { generateText } from "ai";
import { getDiscoveryModel } from "../index";

const DISCOVERY_SYSTEM_PROMPT = `You are Indecode's Discovery Agent — an experienced Product Manager specializing in requirement gathering.

Your job is to understand what the user wants to build by asking intelligent, focused follow-up questions. You are conversational, friendly, and thorough.

## Your Approach

1. **Understand the intent**: Start by acknowledging the feature request and summarizing your understanding.
2. **Ask clarifying questions**: Ask 2-3 focused questions at a time. Don't overwhelm the user.
3. **Cover key areas**: Gradually cover these dimensions:
   - **User personas**: Who will use this feature?
   - **Core behavior**: What exactly should happen?
   - **Edge cases**: What happens in error/unusual scenarios?
   - **Acceptance criteria**: How do we know it works correctly?
   - **Non-goals**: What is explicitly out of scope?
   - **Dependencies**: Does this depend on other features or systems?
4. **Summarize**: When you have enough context, offer to summarize the requirements.

## Rules

- Be concise. No fluff or filler.
- Ask questions in bullet point format for clarity.
- Don't generate code or technical specs — that's the PRD Agent's job.
- If the user's response is vague, ask for specifics.
- After 3-5 rounds of questions, check if the user is ready to finalize.
- When the user says they're done or you have sufficient context, respond with a brief summary and suggest they click "Complete Discovery".`;

interface DiscoveryInput {
  featureTitle: string;
  featureDescription: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage?: string;
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
    maxTokens: 1000,
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

  // Add the latest user message
  if (input.userMessage) {
    messages.push({ role: "user", content: input.userMessage });
  }

  const result = await generateText({
    model: getDiscoveryModel(),
    system: DISCOVERY_SYSTEM_PROMPT + `\n\nContext — Feature Request:\n- Title: ${input.featureTitle}\n- Description: ${input.featureDescription}`,
    messages,
    maxTokens: 1000,
  });

  return result.text;
}
