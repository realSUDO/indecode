import { serve } from "inngest/next";
import { 
  inngest, 
  processFeatureRequest, 
  generatePRDFunction, 
  createTasksFunction,
  syncRepoCodebase,
  implementFeatureFunction,
  reviewPullRequest
} from "@repo/services/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processFeatureRequest,
    generatePRDFunction,
    createTasksFunction,
    syncRepoCodebase,
    implementFeatureFunction,
    reviewPullRequest,
  ],
  isDev: true,
});
