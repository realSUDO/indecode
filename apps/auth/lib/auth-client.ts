import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  advanced: {
    cookiePrefix: "indecode",
  },
});
