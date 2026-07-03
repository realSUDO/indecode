import { generateText } from "ai";
import { getPRDModel } from "../index";

type SubscriptionPlan = "free" | "pro" | "enterprise";

const PRD_SYSTEM_OPENLM = `<system_instructions>
You are a Senior Product Manager writing a formal Product Requirements Document (PRD).

<rules>
1. Generate a structured PRD in clean Markdown using EXACTLY the section headers below.
2. Be specific and concrete. No vague language.
3. Base everything strictly on the discovery conversation provided.
4. Do not invent requirements not discussed in discovery.
5. Keep each section focused and brief.
</rules>

<output_format>
## Problem Statement
Clearly describe the problem being solved and why it matters.

## Goals
Bullet list of measurable objectives this feature achieves.

## Non-Goals
Bullet list of what is explicitly out of scope.

## User Stories
Format: "As a [user type], I want to [action] so that [benefit]."

## Acceptance Criteria
Numbered list of specific, testable conditions that must be true for this feature to be considered complete.

## Edge Cases & Error Handling
Bullet list of edge cases and how they should be handled.

## Risks & Open Questions
Bullet list of technical or product risks and open questions needing resolution.

## Success Metrics
How will we measure if this feature succeeded? Include specific metrics.
</output_format>
</system_instructions>`;

const PRD_SYSTEM_ALPACA = `### Instruction:
You are a Senior Product Manager writing a formal Product Requirements Document (PRD).

### Rules:
1. Generate a structured PRD in clean Markdown using EXACTLY the section headers below.
2. Be specific and concrete. No vague language.
3. Base everything strictly on the discovery conversation provided.
4. Do not invent requirements not discussed in discovery.
5. Keep each section focused and brief.

### Output Format:
## Problem Statement
Clearly describe the problem being solved and why it matters.

## Goals
Bullet list of measurable objectives this feature achieves.

## Non-Goals
Bullet list of what is explicitly out of scope.

## User Stories
Format: "As a [user type], I want to [action] so that [benefit]."

## Acceptance Criteria
Numbered list of specific, testable conditions that must be true for this feature to be considered complete.

## Edge Cases & Error Handling
Bullet list of edge cases and how they should be handled.

## Risks & Open Questions
Bullet list of technical or product risks and open questions needing resolution.

## Success Metrics
How will we measure if this feature succeeded? Include specific metrics.`;

interface PRDInput {
  featureTitle: string;
  featureDescription: string;
  discoveryTranscript: Array<{ role: string; content: string }>;
  plan?: SubscriptionPlan;
}

/**
 * Generate a structured PRD from a completed discovery conversation.
 */
export async function generatePRD(input: PRDInput): Promise<string> {
  const isPaid = input.plan === "pro" || input.plan === "enterprise";
  const system = isPaid ? PRD_SYSTEM_OPENLM : PRD_SYSTEM_ALPACA;

  const transcript = input.discoveryTranscript
    .map(m => `**${m.role === "user" ? "User" : "PM Agent"}:** ${m.content}`)
    .join("\n\n");

  const prompt = isPaid
    ? `<input>
Generate a PRD for the following feature request.
</input>

<context>
<title>${input.featureTitle}</title>
<description>${input.featureDescription}</description>
<discovery_transcript>
${transcript}
</discovery_transcript>
</context>`
    : `### Input:
Generate a PRD for the following feature request.

**Title:** ${input.featureTitle}
**Initial Description:** ${input.featureDescription}

**Discovery Conversation:**
${transcript}

### Response:
Now write the full PRD based on everything discussed above.`;

  const result = await generateText({
    model: getPRDModel(input.plan),
    system,
    prompt,
  });

  return result.text;
}
