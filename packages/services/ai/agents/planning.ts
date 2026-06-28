import { generateText } from "ai";
import { getPlanningModel } from "../index";

const PLANNING_SYSTEM_PROMPT = `You are a Staff Software Engineer breaking down a PRD into engineering tasks.

Analyze the PRD and produce a JSON array of engineering tasks. Output ONLY valid JSON, no markdown code fences, no explanation.

Each task must have:
- "title": string (short, action-oriented, e.g. "Implement user authentication endpoint")
- "description": string (2-3 sentences explaining what needs to be built and why)
- "priority": "low" | "medium" | "high" | "critical"
- "complexity": "trivial" | "small" | "medium" | "large" | "complex"

Rules:
- Create 3-8 tasks. Quality over quantity.
- Order tasks from foundational (backend, data models) to UI.
- Each task must be independently workable by one engineer.
- Be specific — "Add user_id foreign key to orders table" not "Update database".
- Output ONLY a JSON array, starting with [ and ending with ].`;

interface PlanningInput {
  featureTitle: string;
  prdContent: string;
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
  const result = await generateText({
    model: getPlanningModel(),
    system: PLANNING_SYSTEM_PROMPT,
    prompt: `Break down the following PRD for "${input.featureTitle}" into engineering tasks.

${input.prdContent}`,
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
