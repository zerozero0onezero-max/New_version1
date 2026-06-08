// ─── Self-Adaptive Environment Manager (must run before any other require) ───
try {
        require("./core/bootstrap/environmentManager.js").init();
} catch (envErr) {
        console.error("[EnvMgr] Bootstrap failed (continuing in degraded mode):", envErr.message);
}

// ─── Self-Healing Watcher ──────────────────────────────────────────────────
// Catches uncaught exceptions and unhandled promise rejections so the bot
// never dies from a transient FCA / network / parser glitch. The error is
// logged, a short cool-down is applied, and the listener is silently
// re-armed on the next heartbeat tick.
process.on("uncaughtException", (err) => {
        try {
                const msg = (err && (err.stack || err.message)) || String(err);
                console.error("[Self-Heal] uncaughtException — recovering instead of crashing:");
                console.error("           " + msg.split("\n").slice(0, 4).join("\n           "));

                // EADDRINUSE on the heartbeat server is handled inline by the
                // listener's `error` handler, so we don't need to do anything here.
                // For any other error, attempt a soft re-arm of the FCA listener.
                if (global.BeatriceBC && typeof global.BeatriceBC.rearmListener === "function") {
                        setTimeout(() => {
                                try { global.BeatriceBC.rearmListener(); }
                                catch (e) { console.error("[Self-Heal] re-arm failed:", e.message); }
                        }, 3000);
                }
        } catch (_) {}
});
process.on("unhandledRejection", (reason) => {
        try {
                const msg = (reason && (reason.stack || reason.message)) || String(reason);
                console.error("[Self-Heal] unhandledRejection (non-fatal):");
                console.error("           " + msg.split("\n").slice(0, 4).join("\n           "));
        } catch (_) {}
});

const log = require('./core/logger/log.js');
const path = require("path");
const axios = require("axios");
const fs = require("fs-extra");
const google = require("googleapis").google;
const nodemailer = require("nodemailer");
const { execSync } = require('child_process');

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

function getConfigPath(baseName, ext = ".json") {
        try {
                const devPath = path.join(__dirname, `${baseName}.dev${ext}`);
                const normalPath = path.join(__dirname, `${baseName}${ext}`);
                if (fs.existsSync(devPath)) {
                        console.log(`☑️ Loaded ${baseName}.dev${ext}`);
                        return devPath;
                } else if (fs.existsSync(normalPath)) {
                        console.log(`☑️ Loaded ${baseName}${ext}`);
                        return normalPath;
                } else {
                        throw new Error(`❌ Missing ${baseName}${ext} or ${baseName}.dev${ext}`);
                }
        } catch (err) {
                throw new Error(err.message);
        }
}

function validJSON(pathDir) {
        try {
                if (!fs.existsSync(pathDir))
                        throw new Error(`File "${pathDir}" not found`);
                execSync(`npx jsonlint "${pathDir}"`, { stdio: 'pipe' });
                return true;
        }
        catch (err) {
                let msgError = err.message;
                msgError = msgError.split("\n").slice(1).join("\n");
                const indexPos = msgError.indexOf("    at");
                msgError = msgError.slice(0, indexPos != -1 ? indexPos - 1 : msgError.length);
                throw new Error(msgError);
        }
}

const dirConfig = getConfigPath("config", ".json");
const dirConfigCommands = getConfigPath("configCommands", ".json");
const dirAccount = getConfigPath("ncstate", ".json");

for (const pathDir of [dirConfig, dirConfigCommands]) {
        try {
                validJSON(pathDir);
        }
        catch (err) {
                log.error("CONFIG", `Invalid JSON file "${pathDir.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
                process.exit(0);
        }
}

const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
        config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.BeatriceBC = {
        startTime: Date.now() - process.uptime() * 1000,
        commands: new Map(),
        eventCommands: new Map(),
        commandFilesPath: [],
        eventCommandsFilesPath: [],
        aliases: new Map(),
        ncFirstChat: [],
        ncPrefix: [],
        ncEvent: [],
        ncReply: new Map(),
        ncReaction: new Map(),
        ncAnyEvent: [],
        ncsetting: config,
        config,
        configCommands,
        envCommands: {},
        envEvents: {},
        envGlobal: {},
        reLoginBot: function () { },
        Listening: null,
        oldListening: [],
        callbackListenTime: {},
        storage5Message: [],
        fcaApi: null,
        botID: null
};

global.db = {
        allThreadData: [],
        allUserData: [],
        allDashBoardData: [],
        allGlobalData: [],
        threadModel: null,
        userModel: null,
        dashboardModel: null,
        globalModel: null,
        threadsData: null,
        usersData: null,
        dashBoardData: null,
        globalData: null,
        receivedTheFirstMessage: {}
};

global.client = {
        dirConfig,
        dirConfigCommands,
        dirAccount,
        countDown: {},
        cache: {},
        database: {
                creatingThreadData: [],
                creatingUserData: [],
                creatingDashBoardData: [],
                creatingGlobalData: []
        },
        commandBanned: configCommands.commandBanned
};

const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

global.temp = {
        createThreadData: [],
        createUserData: [],
        createThreadDataError: [],
        filesOfGoogleDrive: {
                arraybuffer: {},
                stream: {},
                fileNames: {}
        },
        contentScripts: {
                cmds: {},
                events: {}
        }
};

const watchAndReloadConfig = (dir, type, prop, logName) => {
        let lastModified = fs.statSync(dir).mtimeMs;
        let isFirstModified = true;
        fs.watch(dir, (eventType) => {
                if (eventType === type) {
                        const oldConfig = global.BeatriceBC[prop];
                        setTimeout(() => {
                                try {
                                        if (isFirstModified) {
                                                isFirstModified = false;
                                                return;
                                        }
                                        if (lastModified === fs.statSync(dir).mtimeMs) return;
                                        global.BeatriceBC[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
                                        log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
                                }
                                catch (err) {
                                        log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
                                        global.BeatriceBC[prop] = oldConfig;
                                }
                                finally {
                                        lastModified = fs.statSync(dir).mtimeMs;
                                }
                        }, 200);
                }
        });
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

global.BeatriceBC.envGlobal = global.BeatriceBC.configCommands.envGlobal;
global.BeatriceBC.envCommands = global.BeatriceBC.configCommands.envCommands;
global.BeatriceBC.envEvents = global.BeatriceBC.configCommands.envEvents;

const getText = global.utils.getText;

(async () => {
        const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
        const currentVersion = require("./package.json").version;
        if (compareVersion(version, currentVersion) === 1)
                utils.log.master("NEW VERSION", getText(
                        "NoobCore",
                        "newVersionDetected",
                        colors.gray(currentVersion),
                        colors.hex("#eb6a07", version),
                        colors.hex("#eb6a07", "node update")
                ));

        const parentIdGoogleDrive = "";
        utils.drive.parentID = parentIdGoogleDrive;

        require(`./core/login/login.js`);
})();

// ─────────────────────────────────────────────────────────────────────
// Self-Waking Heartbeat System
// ─────────────────────────────────────────────────────────────────────
// Every 4m30s a synthetic message containing SYSTEM_HEARTBEAT_PULSE is
// fed into the bot's own message handler. handlerEvents.js
// short-circuits on that exact body so nothing is ever sent to a real
// chat — the call only keeps the listener loop warm so the hosting
// environment doesn't idle the process out.
//
// NOTE: The public/app.js dashboard binds to process.env.PORT so that
// Replit's WebView proxy sees the dashboard rather than a plain-text
// stub. We intentionally do NOT bind a second HTTP server here.
// ─────────────────────────────────────────────────────────────────────
(async function startSelfWakingHeartbeat() {
        // ─── Heartbeat pulse (only fires when api is fully ready) ────────────
        function isApiReady() {
                const ctx = global.BeatriceBC;
                if (!ctx || !ctx.fcaApi) return false;
                const api = ctx.fcaApi;
                if (typeof api.getCurrentUserID !== "function") return false;
                if (typeof ctx.callBackListen !== "function") return false;
                try { return Boolean(api.getCurrentUserID()); } catch (_) { return false; }
        }

        const HEARTBEAT_INTERVAL_MS = 270000; // 4 minutes 30 seconds
        setInterval(() => {
                try {
                        if (!isApiReady()) {
                                console.log("[Heartbeat] Pulse skipped — api not yet ready.");
                                return;
                        }
                        const api = global.BeatriceBC.fcaApi;
                        const callBackListen = global.BeatriceBC.callBackListen;
                        const selfID = api.getCurrentUserID();
                        const mockEvent = {
                                type: "message",
                                body: "SYSTEM_HEARTBEAT_PULSE",
                                threadID: selfID,
                                senderID: selfID,
                                userID: selfID,
                                messageID: `heartbeat_${Date.now()}`,
                                isGroup: false,
                                attachments: [],
                                mentions: {},
                                participantIDs: [selfID]
                        };
                        callBackListen(null, mockEvent);
                        console.log("[Heartbeat] Pulse sent to maintain uptime.");
                } catch (err) {
                        console.error("[Heartbeat] Pulse error:", err.message);
                }
        }, HEARTBEAT_INTERVAL_MS);
})();

function compareVersion(version1, version2) {
        const v1 = version1.split(".");
        const v2 = version2.split(".");
        for (let i = 0; i < 3; i++) {
                if (parseInt(v1[i]) > parseInt(v2[i])) return 1;
                if (parseInt(v1[i]) < parseInt(v2[i])) return -1;
        }
        return 0;
}
