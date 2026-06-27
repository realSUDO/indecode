import { serve } from "inngest/next";
import { inngest, processFeatureRequest, generatePRDFunction, createTasksFunction } from "@repo/services/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processFeatureRequest,
    generatePRDFunction,
    createTasksFunction,
  ],
  isDev: true,
});
