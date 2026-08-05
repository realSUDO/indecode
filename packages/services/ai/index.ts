import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";

const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY || "";
const openrouter = createOpenRouter({ apiKey: getOpenRouterKey() });

const getAICreditsKey = () => process.env.AICREDITS_API_KEY || "";
const getAICreditsBaseUrl = () => process.env.AICREDITS_BASE_URL || "https://api.openai.com/v1";

const aicredits = createOpenAI({
  apiKey: getAICreditsKey(),
  baseURL: getAICreditsBaseUrl(),
});

// Free-tier model stack (differentiated by task type)
// Discovery + PRD + Planning: Llama 3.3 70B — fast, cheap, great reasoning
const FREE_CHAT_MODEL = "meta-llama/llama-3.3-70b-instruct";
// Implementation + Review: Qwen3 Coder 480B — top-tier coding model
const FREE_CODE_MODEL = "qwen/qwen3-coder-480b-a35b";

// Pro-tier model stack
const PRO_MINI_MODEL = "gpt-4o-mini";
const PRO_ADVANCED_MODEL = "gpt-4o";

type SubscriptionPlan = "free" | "pro" | "enterprise";

/** Conversational AI for Discovery chat */
export const getDiscoveryModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_CHAT_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Single-shot PRD generation */
export const getPRDModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_CHAT_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Task breakdown from approved PRD */
export const getPlanningModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_CHAT_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Code implementation — use the strongest free coding model */
export const getImplementationModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_CODE_MODEL) : aicredits(PRO_ADVANCED_MODEL);
};

/** Deep reasoning for code review — use the strongest free coding model */
export const getReviewModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_CODE_MODEL) : aicredits(PRO_ADVANCED_MODEL);
};
