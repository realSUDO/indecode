const { Octokit } = require("@octokit/rest");
const octokit = new Octokit();
async function run() {
  const { data: commit } = await octokit.rest.repos.getCommit({
    owner: "realSUDO",
    repo: "KRONN",
    ref: "main"
  });
  const treeSha = commit.commit.tree.sha;
  const { data: tree } = await octokit.rest.git.getTree({
    owner: "realSUDO",
    repo: "KRONN",
    tree_sha: treeSha,
    recursive: "true"
  });
  const allowedExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json"];
  const files = tree.tree
    .filter(t => t.type === "blob")
    .filter(t => allowedExtensions.some(ext => (t.path || "").endsWith(ext)))
    .map(t => t.path);
  console.log("Found files:", files.length);
  console.log(files.slice(0, 5));
}
run();
