import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

// Re-use env variables to avoid duplicating them
const getAppId = () => process.env.GITHUB_APP_ID || "";
const getPrivateKey = () => process.env.GITHUB_PRIVATE_KEY || "";

/**
 * Get an Octokit instance authenticated as the GitHub App itself.
 * Used for fetching installations, generating installation tokens, etc.
 */
export const getAppOctokit = () => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getAppId(),
      privateKey: getPrivateKey().replace(/\\n/g, "\n"), // handle stringified newlines
    },
  });
};

/**
 * Get an Octokit instance authenticated for a specific installation.
 * Used to fetch repos, PRs, and make API calls on behalf of the user/org that installed the app.
 * @param installationId - The numeric ID of the GitHub app installation.
 */
export const getInstallationOctokit = async (installationId: number) => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getAppId(),
      privateKey: getPrivateKey().replace(/\\n/g, "\n"),
      installationId,
    },
  });
};

/**
 * Returns the URL for installing the GitHub App, preserving state.
 * @param state - The payload to pass through (e.g. userId or organizationId)
 */
export const getInstallUrl = (state: string) => {
  // Assume app name from env or hardcoded based on project name for now.
  // Ideally, GITHUB_APP_NAME is in env, but if missing, fallback to generic installation link.
  const appName = process.env.GITHUB_APP_NAME || "indecode-local";
  return `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(state)}`;
};
