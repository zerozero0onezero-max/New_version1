const { spawn } = require("child_process");
try { require("ts-node/register"); } catch (e) { /* ts-node optional */ }

const log = require("./core/logger/log.js");
const autoPushToGitHub = require("./git");
const config = require("./config.json");

const fileState = new Map();
const uploadQueue = new Map();

let autoPushInterval = null;
let isRunning = false; // 🔒 prevent overlap

async function runAutoPush() {
  if (isRunning) {
    log.warn("⏳ Auto push still running — skip");
    return;
  }

  isRunning = true;

  try {
    await autoPushToGitHub({
      token: config.autogit.GITHUB_TOKEN,
      owner: config.autogit.owner,
      repo: config.autogit.repo,
      branch: config.autogit.branch || "main",
      rootDir: ".",
      fileState,
      uploadQueue
    });
  } catch (err) {
    console.error("❌ Auto push error:", err.message);
  } finally {
    isRunning = false;
  }
}

function startAutoPushLoop() {
  if (!config.autogit?.enable) {
    log.info("⏹️ AutoGit disabled in config");
    return;
  }

  if (autoPushInterval) return;

  const INTERVAL = (config.autogit.interval || 60) * 1000;

  runAutoPush();

  autoPushInterval = setInterval(() => {
    runAutoPush();
  }, INTERVAL);

  log.info(`📡 AutoGit started (${INTERVAL / 1000}s)`);
}

function startProject() {
  const child = spawn("node", ["NoobCore.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (code) => {
    if (code === 2) {
      log.info("🔄 Restarting Project...");
      startProject();
    } else {
      log.warn(`⚠️ Project exited with code ${code}`);
    }
  });

  child.on("error", (err) => {
    log.error("❌ Failed to start project:", err.message);
  });
}

startProject();
startAutoPushLoop();
