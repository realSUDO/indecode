import { generateText } from "ai";
import { getPRDModel } from "../index";

const PRD_SYSTEM_PROMPT = `You are a Senior Product Manager writing a formal Product Requirements Document (PRD).

Generate a structured PRD in clean Markdown. Use EXACTLY this structure with these section headers:

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

## Rules
- Be specific and concrete. No vague language.
- Base everything strictly on the discovery conversation provided.
- Do not invent requirements not discussed in discovery.
- Keep each section focused and brief.`;

interface PRDInput {
  featureTitle: string;
  featureDescription: string;
  discoveryTranscript: Array<{ role: string; content: string }>;
}

/**
 * Generate a structured PRD from a completed discovery conversation.
 */
export async function generatePRD(input: PRDInput): Promise<string> {
  const transcript = input.discoveryTranscript
    .map(m => `**${m.role === "user" ? "User" : "PM Agent"}:** ${m.content}`)
    .join("\n\n");

  const result = await generateText({
    model: getPRDModel(),
    system: PRD_SYSTEM_PROMPT,
    prompt: `Generate a PRD for the following feature request.

**Title:** ${input.featureTitle}
**Initial Description:** ${input.featureDescription}

**Discovery Conversation:**
${transcript}

Now write the full PRD based on everything discussed above.`,
  });

  return result.text;
}
