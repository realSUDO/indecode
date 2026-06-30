import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // @ts-expect-error - better-auth types mismatch after zod upgrade
  advanced: {
    cookiePrefix: "indecode",
  },
});
