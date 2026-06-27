import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const getApiKey = () => process.env.OPENROUTER_API_KEY || "";

const openrouter = createOpenRouter({ apiKey: getApiKey() });

// Using a free model for all phases during development.
// Swap individual getters to paid models when credits are available.
const FREE_MODEL = "google/gemma-4-31b-it:free";

/** Conversational AI for Discovery chat */
export const getDiscoveryModel = () => openrouter(FREE_MODEL);

/** Single-shot PRD generation */
export const getPRDModel = () => openrouter(FREE_MODEL);

/** Task breakdown from approved PRD */
export const getPlanningModel = () => openrouter(FREE_MODEL);

/** Deep reasoning for code review (swap to Sonnet/Opus in production) */
export const getReviewModel = () => openrouter(FREE_MODEL);
