import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import * as dotenv from "dotenv";

dotenv.config();

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const model = openrouter("google/gemma-4-31b-it:free");

async function test() {
  console.log("Testing OpenRouter API with Gemini 2.0 Flash Exp (Free)...");
  try {
    const result = await generateText({
      model,
      prompt: "Reply with the word 'SUCCESS' if you can read this.",
      maxTokens: 1000,
    });
    console.log("Response:", result.text);
    console.log("✅ API Test Passed!");
  } catch (error: any) {
    console.error("❌ API Test Failed!");
    console.error(error.message || error);
  }
}

test();
