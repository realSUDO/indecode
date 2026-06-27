import { getInstallationOctokit } from "../../../../github/index";

const FILES_PER_PAGE = 100;

export interface PrFile {
  filePath: string;
  patch: string;
}

export async function getPullRequestFiles(
  installationId: number,
  repoFullName: string,
  prNumber: number
): Promise<PrFile[]> {
  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
    { owner, repo, pull_number: prNumber, per_page: FILES_PER_PAGE }
  );

  const files: PrFile[] = [];

  for (const file of data) {
    if (!file.patch) continue;
    files.push({ filePath: file.filename, patch: file.patch });
  }

  return files;
}
