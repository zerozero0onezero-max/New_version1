const { spawn } = require("child_process");
try { require("ts-node/register"); } catch (e) { /* ts-node optional */ }

const log = require("./core/logger/log.js");
const autoPushToGitHub = require("./git");
const config = require("./config.json");

const fileState = new Map();
const uploadQueue = new Map();

let autoPushInterval = null;
let isRunning = false;

// ── Crash-loop guard ────────────────────────────────────────────────────────
// If the bot crashes more than MAX_CRASHES times within CRASH_WINDOW_MS it
// waits CRASH_COOLDOWN_MS before the next restart so it never spiral-loops.
const MAX_CRASHES     = 5;
const CRASH_WINDOW_MS = 60 * 1000;      // 1 minute
const CRASH_COOLDOWN_MS = 30 * 1000;    // 30 seconds cool-down
const crashTimes = [];

function shouldCoolDown() {
  const now = Date.now();
  while (crashTimes.length && now - crashTimes[0] > CRASH_WINDOW_MS)
    crashTimes.shift();
  crashTimes.push(now);
  return crashTimes.length > MAX_CRASHES;
}

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
    // exit code 0 with a config/fatal error means "don't restart" only when
    // it was an explicit user-action error (invalid JSON, etc.).
    // For every other exit — including 0 from transient network errors — we
    // restart so the bot recovers automatically on any hosting.
    if (code === 0) {
      log.warn(`⚠️ Bot exited cleanly (code 0). Restarting in 5s to recover from transient errors...`);
      setTimeout(startProject, 5000);
      return;
    }

    if (code === 2) {
      log.info("🔄 Restarting Bot (requested by process)...");
      startProject();
      return;
    }

    // Any other code (1, SIGTERM, etc.) — restart with crash-loop guard
    const delay = shouldCoolDown() ? CRASH_COOLDOWN_MS : 3000;
    log.warn(`⚠️ Bot exited with code ${code}. Restarting in ${delay / 1000}s...`);
    setTimeout(startProject, delay);
  });

  child.on("error", (err) => {
    log.error("❌ Failed to start project:", err.message);
    setTimeout(startProject, 5000);
  });
}

startProject();
startAutoPushLoop();
