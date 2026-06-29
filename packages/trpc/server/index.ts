import { router } from "./trpc";

import { authRouter } from "./routes/auth/route";
import { githubRouter } from "./routes/github/route";
import { featureRequestRouter } from "./routes/feature-request/route";
import { discoveryRouter } from "./routes/discovery/route";
import { prdRouter } from "./routes/prd/route";
import { taskRouter } from "./routes/task/route";
import { projectRouter } from "./routes/project/route";
import { pullRequestRouter } from "./routes/pull-request/route";
import { reviewRouter } from "./routes/review/route";
import { billingRouter } from "./routes/billing/route";

export const serverRouter = router({
  auth: authRouter,
  github: githubRouter,
  featureRequest: featureRequestRouter,
  discovery: discoveryRouter,
  prd: prdRouter,
  task: taskRouter,
  project: projectRouter,
  pullRequest: pullRequestRouter,
  review: reviewRouter,
  billing: billingRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
