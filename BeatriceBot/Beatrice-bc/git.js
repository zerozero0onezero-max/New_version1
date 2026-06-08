const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const ignore = require("ignore");

async function autoPushGit({
  token,
  owner,
  repo,
  branch = "main",
  rootDir = ".",
  fileState,
  uploadQueue
}) {
  if (!token) throw new Error("GitHub token required");

  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "auto-push-bot"
    }
  });

  // ================= GLOBAL HEAD CACHE =================
  if (!global.__AUTO_GIT_HEAD__) {
    global.__AUTO_GIT_HEAD__ = null;
  }

  // ================= helpers =================

  const sha1 = buf => crypto.createHash("sha1").update(buf).digest("hex");

  function getCommitMessage(stats) {
    const time = new Date().toLocaleTimeString();

    if (stats.add && !stats.mod && !stats.del)
      return `✨ Add ${stats.add} file(s) • ${time}`;

    if (stats.mod && !stats.add && !stats.del)
      return `🛠️ Update ${stats.mod} file(s) • ${time}`;

    if (stats.del && !stats.add && !stats.mod)
      return `🗑️ Delete ${stats.del} file(s) • ${time}`;

    return `🚀 Sync ${stats.total} file(s) • ${time}`;
  }

  async function fastForwardIfBehind(remoteHead) {
    const localHead = global.__AUTO_GIT_HEAD__;
    if (!localHead) return;

    if (localHead !== remoteHead) {
      console.log("⬇️ Remote ahead — resyncing...");
      fileState.clear();
      uploadQueue.clear();
    }
  }

  // ================= gitignore =================

  const ig = ignore();
  const gitignorePath = path.join(rootDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf8"));
  }

  // ================= scan files =================

  function getAllFiles(dir, root = dir, list = []) {
    for (const file of fs.readdirSync(dir)) {
      if (file === ".git") continue;

      const full = path.join(dir, file);
      const rel = path.relative(root, full).replace(/\\/g, "/");

      if (ig.ignores(rel)) continue;

      const stat = fs.statSync(full);
      if (stat.isDirectory()) getAllFiles(full, root, list);
      else list.push({ full, relativePath: rel });
    }
    return list;
  }

  console.log("🔍 Scanning...");
  const files = getAllFiles(rootDir);

  let added = 0;
  let modified = 0;
  let deleted = 0;

  const currentSet = new Set(files.map(f => f.relativePath));

  // ================= detect add/modify =================

  for (const file of files) {
    const buf = fs.readFileSync(file.full);
    const hash = sha1(buf);
    const oldHash = fileState.get(file.relativePath);

    if (oldHash === hash) continue;
    if (uploadQueue.has(file.relativePath)) continue;

    uploadQueue.set(file.relativePath, {
      ...file,
      hash,
      content: buf.toString("base64")
    });

    if (!oldHash) added++;
    else modified++;
  }

  // ================= detect delete =================

  for (const oldPath of fileState.keys()) {
    if (!currentSet.has(oldPath) && !uploadQueue.has(oldPath)) {
      uploadQueue.set(oldPath, {
        relativePath: oldPath,
        delete: true
      });
      deleted++;
    }
  }

  const total = added + modified + deleted;

  console.log(`🧠 Add:${added} Mod:${modified} Del:${deleted}`);

  if (uploadQueue.size === 0) {
    console.log("😴 No changes");
    return;
  }

  // =====================================================
  // 🔥 CHECK REMOTE HEAD (safe sync)
  // =====================================================

  const refCheck = await api.get(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const remoteHead = refCheck.data.object.sha;

  await fastForwardIfBehind(remoteHead);
  global.__AUTO_GIT_HEAD__ = remoteHead;

  console.log("🚀 Creating single batch commit...");

  // ================= get latest commit =================

  const latestCommitSha = remoteHead;

  const commitData = await api.get(
    `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`
  );
  const baseTree = commitData.data.tree.sha;

  // ================= create tree =================

  const treeItems = [];

  for (const file of uploadQueue.values()) {
    // 🗑️ delete
    if (file.delete) {
      treeItems.push({
        path: file.relativePath,
        mode: "100644",
        type: "blob",
        sha: null
      });
      continue;
    }

    // 📄 add/update
    const blob = await api.post(`/repos/${owner}/${repo}/git/blobs`, {
      content: file.content,
      encoding: "base64"
    });

    treeItems.push({
      path: file.relativePath,
      mode: "100644",
      type: "blob",
      sha: blob.data.sha
    });
  }

  const newTree = await api.post(`/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseTree,
    tree: treeItems
  });

  // ================= commit =================

  const message = getCommitMessage({
    add: added,
    mod: modified,
    del: deleted,
    total
  });

  const newCommit = await api.post(`/repos/${owner}/${repo}/git/commits`, {
    message,
    tree: newTree.data.sha,
    parents: [latestCommitSha]
  });

  await api.patch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    sha: newCommit.data.sha
  });

  global.__AUTO_GIT_HEAD__ = newCommit.data.sha;

  // ================= update state =================

  for (const [k, file] of uploadQueue) {
    if (file.delete) fileState.delete(file.relativePath);
    else fileState.set(file.relativePath, file.hash);

    uploadQueue.delete(k);
  }

  console.log(`🎉 Commit pushed → ${message}`);
}

module.exports = autoPushGit;