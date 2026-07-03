import { generateText } from "ai";
import { getPlanningModel } from "../index";

type SubscriptionPlan = "free" | "pro" | "enterprise";

const PLANNING_SYSTEM_OPENLM = `<system_instructions>
You are a Staff Software Engineer breaking down a PRD into engineering tasks.

<rules>
1. Analyze the PRD and produce a JSON array of engineering tasks.
2. Output ONLY valid JSON — no markdown code fences, no explanation.
3. Create 3-8 tasks. Quality over quantity.
4. Order tasks from foundational (backend, data models) to UI.
5. Each task must be independently workable by one engineer.
6. Be specific: "Add user_id foreign key to orders table" not "Update database".
</rules>

<output_format>
Each task must have:
- "title": string (short, action-oriented, e.g. "Implement user authentication endpoint")
- "description": string (2-3 sentences explaining what needs to be built and why)
- "priority": "low" | "medium" | "high" | "critical"
- "complexity": "trivial" | "small" | "medium" | "large" | "complex"

Output ONLY a JSON array, starting with [ and ending with ].
</output_format>
</system_instructions>`;

const PLANNING_SYSTEM_ALPACA = `### Instruction:
You are a Staff Software Engineer breaking down a PRD into engineering tasks.

### Rules:
1. Analyze the PRD and produce a JSON array of engineering tasks.
2. Output ONLY valid JSON — no markdown code fences, no explanation.
3. Create 3-8 tasks. Quality over quantity.
4. Order tasks from foundational (backend, data models) to UI.
5. Each task must be independently workable by one engineer.
6. Be specific: "Add user_id foreign key to orders table" not "Update database".

### Output Format:
Each task must have:
- "title": string (short, action-oriented)
- "description": string (2-3 sentences)
- "priority": "low" | "medium" | "high" | "critical"
- "complexity": "trivial" | "small" | "medium" | "large" | "complex"

Output ONLY a JSON array, starting with [ and ending with ].

### Response:`;

interface PlanningInput {
  featureTitle: string;
  prdContent: string;
  plan?: SubscriptionPlan;
}

interface GeneratedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  complexity: "trivial" | "small" | "medium" | "large" | "complex";
}

/**
 * Break an approved PRD into a list of engineering tasks.
 */
export async function generateTasksFromPRD(input: PlanningInput): Promise<GeneratedTask[]> {
  const isPaid = input.plan === "pro" || input.plan === "enterprise";
  const system = isPaid ? PLANNING_SYSTEM_OPENLM : PLANNING_SYSTEM_ALPACA;

  const prompt = isPaid
    ? `<input>
Break down the following PRD for "${input.featureTitle}" into engineering tasks.
</input>

<context>
${input.prdContent}
</context>`
    : `### Input:
Break down the following PRD for "${input.featureTitle}" into engineering tasks.

${input.prdContent}`;

  const result = await generateText({
    model: getPlanningModel(input.plan),
    system,
    prompt,
  });

  // Parse JSON, stripping any accidental markdown fences
  const raw = result.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Not an array");
    return parsed as GeneratedTask[];
  } catch {
    // Fallback: extract JSON array substring
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as GeneratedTask[];
    throw new Error(`Failed to parse task JSON from AI response: ${raw.substring(0, 200)}`);
  }
}
