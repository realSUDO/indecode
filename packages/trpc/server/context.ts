import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { expressAuth } from "@repo/auth-core";

export async function createContext(opts?: CreateExpressContextOptions) {
  let user = null;
  let session = null;

  if (opts?.req) {
    const { fromNodeHeaders } = require("better-auth/node");
    const authSession = await expressAuth.api.getSession({
      headers: fromNodeHeaders(opts.req.headers),
    });
    if (authSession) {
      user = authSession.user;
      session = authSession.session;
    }
  }

  return {
    req: opts?.req,
    res: opts?.res,
    user,
    session,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
