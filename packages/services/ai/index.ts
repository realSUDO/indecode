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

const FREE_MODEL = "meta-llama/llama-3.1-70b-instruct";
const PRO_MINI_MODEL = "gpt-4o-mini";
const PRO_ADVANCED_MODEL = "gpt-4o";

type SubscriptionPlan = "free" | "pro" | "enterprise";

/** Conversational AI for Discovery chat */
export const getDiscoveryModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Single-shot PRD generation */
export const getPRDModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Task breakdown from approved PRD */
export const getPlanningModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_MODEL) : aicredits(PRO_MINI_MODEL);
};

/** Code implementation */
export const getImplementationModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_MODEL) : aicredits(PRO_ADVANCED_MODEL);
};

/** Deep reasoning for code review */
export const getReviewModel = (plan: SubscriptionPlan = "free") => {
  return plan === "free" ? openrouter(FREE_MODEL) : aicredits(PRO_ADVANCED_MODEL);
};
