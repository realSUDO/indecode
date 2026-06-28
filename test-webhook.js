const crypto = require("crypto");
const secret = "6b91d11d45e1a1ca59a3d0d4ef1fc457c4f330acfc55b3830df0adb9b344378a";
const payload = JSON.stringify({
  action: "opened",
  repository: { full_name: "realSUDO/test" },
  pull_request: { number: 999, title: "Test PR", user: { login: "testuser" }, head: { sha: "abc" }, base: { ref: "main" } },
  installation: { id: 12345 }
});
const hmac = crypto.createHmac("sha256", secret);
const digest = "sha256=" + hmac.update(payload).digest("hex");
console.log(digest);
