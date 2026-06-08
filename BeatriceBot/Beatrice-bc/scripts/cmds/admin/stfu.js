// scripts/cmds/admin/stfu.js
//
// stfu      → mutes Beatrice for everyone except the developer.
//             Also clears the per-thread message queue so any stuck
//             media processing is cancelled immediately.
// stfu off  → un-mutes Beatrice.
//
// Developer only (config.babyDeveloperId).

const path = require("path");
const { clearAll } = require(path.join(process.cwd(), "utils", "messageQueue.js"));

function getDeveloperId() {
    try {
        const cfg = (global.BeatriceBC && global.BeatriceBC.config) || {};
        return String(cfg.babyDeveloperId || "").trim();
    } catch (e) { return ""; }
}

module.exports.config = {
    name: "stfu",
    aliases: [],
    version: "2.0.0",
    author: "sekro",
    countDown: 0,
    role: 0,
    usePrefix: false,
    description: "Mute / un-mute the Beatrice AI persona. Developer only.",
    category: "admin",
    guide: {
        en: "stfu        → mute Beatrice + clear stuck queue\nstfu off    → un-mute Beatrice",
    },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const devId = getDeveloperId();
    if (!devId) {
        return api.sendMessage(
            "babyDeveloperId is not configured in config.json — stfu is disabled.",
            event.threadID,
            event.messageID
        );
    }
    if (String(event.senderID) !== devId) return;

    const sub = (args[0] || "").toLowerCase().trim();
    if (!global.BeatriceBC) global.BeatriceBC = {};

    if (sub === "off") {
        global.BeatriceBC.babyStfu = false;
        return api.sendMessage(
            "✅ Beatrice un-muted. She'll respond to everyone again.",
            event.threadID, event.messageID
        );
    }

    // "stfu" or "stfu on" → mute and clear queue
    global.BeatriceBC.babyStfu = true;
    // Clear all pending queued tasks so stuck media processing is dropped
    clearAll();

    return api.sendMessage(
        "🤐 Beatrice muted + queue cleared. Any stuck messages are dropped.\nSend `stfu off` to bring her back.",
        event.threadID, event.messageID
    );
};
