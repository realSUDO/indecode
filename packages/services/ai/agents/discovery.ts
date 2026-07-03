import { generateText } from "ai";
import { getDiscoveryModel } from "../index";

const DISCOVERY_SYSTEM_PROMPT_OPENLM = `<system_instructions>
You are an elite engineer and product manager. Your task is to clarify feature requirements quickly and efficiently. 
You must analyze the provided feature request and codebase context, then output a short, highly technical, and human-sounding response.

<guidelines>
1. Output Controlled: Maximum 3 sentences. No fluff. No paragraphs.
2. No Parroting: NEVER repeat what the user said. NEVER start with "I understand you want to...". Dive straight into the technical unknown.
3. Human Tone: Talk like a human engineer on a team. DO NOT say "The codebase context shows..." or "I have all the information I need." State facts naturally (e.g. "Since we're using next-auth...").
4. Context Heavy: Base your questions STRICTLY on the codebase context. If the context answers it, do NOT ask.
5. No Infinite Loops: Never ask more than 2 rounds of questions.
6. Stop: When you know what to build, explicitly tell the user to click 'Complete Discovery'.
7. NO CODE: NEVER output code blocks, JSON, or markdown code snippets. Your role is strictly to clarify requirements via chat.
</guidelines>

<examples>
<example>
  <input>User wants to add Google OAuth. Context contains 'next-auth' in 'auth.ts'.</input>
  <response>Since we're already using \`next-auth\` in \`auth.ts\`, do you want to restrict these new logins to a specific Google Workspace domain, or allow any personal Gmail account?</response>
</example>

<example>
  <input>User answered previous question. Context contains 'auth.ts' and 'User.ts'.</input>
  <response>Perfect, I'll allow any domain. I know exactly how to wire this up in \`User.ts\`. Are you ready to complete discovery, or should we also handle the 'Email not verified' edge case?</response>
</example>

<example>
  <input>User wants to change button color to Indigo. Context shows CSS variables in globals.css.</input>
  <response>Got it. Since this layout is controlled directly in \`globals.css\` using variables, this is a straightforward change. You can go ahead and click 'Complete Discovery' to proceed!</response>
</example>
</examples>
</system_instructions>`;

const DISCOVERY_SYSTEM_PROMPT_ALPACA = `### Instruction:
You are an elite engineer and product manager. Your task is to clarify feature requirements quickly and efficiently. 
You must analyze the provided feature request and codebase context, then output a short, highly technical, and human-sounding response.

### Guidelines:
1. **Output Controlled**: Maximum 3 sentences. No fluff. No paragraphs.
2. **No Parroting**: NEVER repeat what the user said. NEVER start with "I understand you want to...". Dive straight into the technical unknown.
3. **Human Tone**: Talk like a human engineer on a team. DO NOT say "The codebase context shows..." or "I have all the information I need." State facts naturally (e.g. "Since we're using next-auth...").
4. **Context Heavy**: Base your questions STRICTLY on the codebase context. If the context answers it, do NOT ask.
5. **No Infinite Loops**: Never ask more than 2 rounds of questions.
6. **Stop**: When you know what to build, explicitly tell the user to click 'Complete Discovery'.
7. **NO CODE**: NEVER output code blocks, JSON, or markdown code snippets. Your role is strictly to clarify requirements via chat.

### Examples:

Input: User wants to add Google OAuth. Context contains 'next-auth' in 'auth.ts'.
Response: "Since we're already using \`next-auth\` in \`auth.ts\`, do you want to restrict these new logins to a specific Google Workspace domain, or allow any personal Gmail account?"

Input: User answered previous question. Context contains 'auth.ts' and 'User.ts'.
Response: "Perfect, I'll allow any domain. I know exactly how to wire this up in \`User.ts\`. Are you ready to complete discovery, or should we also handle the 'Email not verified' edge case?"

Input: User wants to change button color to Indigo. Context shows CSS variables in globals.css.
Response: "Got it. Since this layout is controlled directly in \`globals.css\` using variables, this is a straightforward change. You can go ahead and click 'Complete Discovery' to proceed!"`;

interface DiscoveryInput {
  featureTitle: string;
  featureDescription: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage?: string;
  codeContext?: string;
  plan?: "free" | "pro" | "enterprise";
}

/**
 * Generate the initial AI response when a discovery session starts.
 */
export async function generateInitialDiscoveryMessage(input: {
  featureTitle: string;
  featureDescription: string;
  codeContext?: string;
  plan?: "free" | "pro" | "enterprise";
}): Promise<string> {
  const isPaid = input.plan === "pro" || input.plan === "enterprise";
  const system = isPaid ? DISCOVERY_SYSTEM_PROMPT_OPENLM : DISCOVERY_SYSTEM_PROMPT_ALPACA;
  const prompt = isPaid
    ? `<input>
Feature Title: ${input.featureTitle}
Feature Description: ${input.featureDescription}
</input>

${input.codeContext ? `<context>
<codebase_context>
${input.codeContext}
</codebase_context>
</context>

` : ``}<instruction>
Provide your first response. DO NOT repeat the feature request back to the user. Dive straight into a highly technical, context-aware clarifying question if needed, or suggest closing if the request is trivial. Keep it under 3 sentences.
</instruction>`
    : `### Input:
Feature Title: ${input.featureTitle}
Feature Description: ${input.featureDescription}

${input.codeContext ? `### Codebase Context:
${input.codeContext}

` : ``}### Instruction:
Provide your first response. DO NOT repeat the feature request back to the user. Dive straight into a highly technical, context-aware clarifying question if needed, or suggest closing if the request is trivial. Keep it under 3 sentences.

### Response:`;

  const result = await generateText({
    model: getDiscoveryModel(input.plan),
    system,
    prompt,
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

  const isPaid = input.plan === "pro" || input.plan === "enterprise";
  let system = "";

  if (isPaid) {
    system = `${DISCOVERY_SYSTEM_PROMPT_OPENLM}

<context>
Feature Title: ${input.featureTitle}
Feature Description: ${input.featureDescription}

${input.codeContext ? `<codebase_context>\n${input.codeContext}\n</codebase_context>` : ""}
</context>`;
  } else {
    system = `${DISCOVERY_SYSTEM_PROMPT_ALPACA}

### Context:
Feature Title: ${input.featureTitle}
Feature Description: ${input.featureDescription}

${input.codeContext ? `Codebase Context (Vector RAG results):\n${input.codeContext}` : ""}`;
  }

  const result = await generateText({
    model: getDiscoveryModel(input.plan),
    system,
    messages,
  });

  return result.text;
}
