import { getInstallationOctokit } from "../../../github/index";

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

  const files: PrFile[] = [];
  let page = 1;

  // M8: Paginate to handle PRs with more than 100 changed files
  while (true) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      { owner: owner as string, repo: repo as string, pull_number: prNumber, per_page: FILES_PER_PAGE, page }
    );

    for (const file of data) {
      if (!file.patch) continue;
      files.push({ filePath: file.filename, patch: file.patch });
    }

    // If fewer results than a full page, we've fetched everything
    if (data.length < FILES_PER_PAGE) break;
    page++;
  }

  return files;
}
