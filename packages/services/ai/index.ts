import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const getApiKey = () => process.env.OPENROUTER_API_KEY || "";

const openrouter = createOpenRouter({ apiKey: getApiKey() });

export const getDiscoveryModel = () => {
  return openrouter("google/gemma-4-31b-it:free");
};

/**
 * Get a powerful model for deep reasoning (Code Review).
 */
export const getReviewModel = () => {
  return openrouter("anthropic/claude-sonnet-4");
};

/**
 * Get a balanced model for task planning.
 */
export const getPlanningModel = () => {
  return openrouter("anthropic/claude-sonnet-4");
};
