import { router } from "./trpc";

import { authRouter } from "./routes/auth/route";
import { githubRouter } from "./routes/github/route";
import { featureRequestRouter } from "./routes/feature-request/route";
import { discoveryRouter } from "./routes/discovery/route";
import { prdRouter } from "./routes/prd/route";
import { taskRouter } from "./routes/task/route";

export const serverRouter = router({
  auth: authRouter,
  github: githubRouter,
  featureRequest: featureRequestRouter,
  discovery: discoveryRouter,
  prd: prdRouter,
  task: taskRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
