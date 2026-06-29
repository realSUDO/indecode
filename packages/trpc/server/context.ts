import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { auth } from "@repo/auth";

export async function createContext(opts?: CreateExpressContextOptions) {
  let user = null;
  let session = null;

  if (opts?.req) {
    const authSession = await auth.api.getSession({
      headers: opts.req.headers,
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
