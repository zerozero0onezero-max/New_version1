// public/app.js — Beatrice bc Dashboard Server
// Binds to process.env.PORT so Replit's WebView proxy points here.
// Also exposes /uptime so the autoUptime feature can ping it.

const express = require("express");
const http = require("http");
const path = require("path");
const os = require("os");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Uptime ping — used by autoUptime to keep the bot alive
app.get("/uptime", (_req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// Full stats endpoint used by index.html
app.get("/api/stats", (_req, res) => {
  try {
    const bot = global.BeatriceBC || {};
    const cfg = bot.ncsetting || bot.config || {};
    const db = global.db || {};

    const uptimeSec = Math.floor(process.uptime());
    const days    = Math.floor(uptimeSec / 86400);
    const hours   = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = Math.floor(uptimeSec % 60);
    let uptimeStr;
    if (days > 0)        uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    else if (hours > 0)  uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    else                 uptimeStr = `${minutes}m ${seconds}s`;

    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;

    res.json({
      online:          true,
      uptime:          uptimeStr,
      prefix:          cfg.prefix       || ".",
      botName:         cfg.botName      || "Beatrice bc",
      uid:             bot.botID        || "Starting...",
      nodeVersion:     process.version,
      language:        cfg.language     || "en",
      commandsLoaded:  bot.commands     ? bot.commands.size  : 0,
      eventsLoaded:    bot.eventCommands ? bot.eventCommands.size : 0,
      threads:         (db.allThreadData || []).length,
      users:           (db.allUserData   || []).length,
      babyActive:      !(bot.babyStfu),
      replyDelay:      cfg.replyDelay   || { enable: false },
      deleteOwnMsgs:   cfg.deleteOwnMessages || { enable: false },
      ram:             `${(usedMem / 1024 / 1024).toFixed(0)} MB / ${(totalMem / 1024 / 1024).toFixed(0)} MB`,
      cpu:             os.loadavg()[0].toFixed(2),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Environment report (for debugging on other hosting)
app.get("/api/env", (_req, res) => {
  const report = (global.envMgr && global.envMgr.report && global.envMgr.report()) || null;
  res.json({ status: "active", uptimeSeconds: Math.round(process.uptime()), env: report });
});

module.exports = async (api) => {
  if (!api) {
    await require("./connectDB.js")();
  }

  // Always bind to PORT so the hosting proxy (Replit, Render, Railway, …) can find us.
  // Fall back to 3000 when PORT is not set.
  const preferred = Number(process.env.PORT) || 3000;

  function listenWithRetry(port, attempt = 0, maxAttempts = 20) {
    server.listen(port, "0.0.0.0");
    server.once("listening", () => {
      const actual = server.address() && server.address().port;
      console.log(`Dashboard listening on port ${actual}`);
    });
    server.once("error", (err) => {
      if (err && err.code === "EADDRINUSE" && attempt < maxAttempts) {
        const next = port + 1;
        console.warn(`[Dashboard] port ${port} in use → trying ${next}`);
        try { server.removeAllListeners("listening"); } catch (_) {}
        try { server.removeAllListeners("error"); } catch (_) {}
        listenWithRetry(next, attempt + 1, maxAttempts);
      } else {
        console.warn(`[Dashboard] could not bind a port: ${err && err.message}`);
      }
    });
  }

  listenWithRetry(preferred);
};
