import { serve } from "inngest/next";
import { inngest, processFeatureRequest } from "@repo/services/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processFeatureRequest,
  ],
  isDev: true, // Explicitly tell Inngest this is local dev
});
