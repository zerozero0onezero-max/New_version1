// scripts/cmds/creator/groklist.js — List all Grok keys with pagination
// Usage: .groklist [page]

const path = require("path");
const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));
const GrokManager = require(path.join(process.cwd(), "utils", "GrokManager.js"));
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));

const PER_PAGE = 10;

module.exports.config = {
    name: "groklist",
    aliases: ["grokkeys"],
    version: "1.0.0",
    author: "sekro",
    countDown: 3,
    role: 3,
    usePrefix: true,
    description: "List all Grok API keys with status and pagination.",
    category: "creator",
    guide: { en: "{pn} [page]  — reply with a page number to navigate" },
};

function _mask(key) { return `${key.slice(0, 6)}...${key.slice(-4)}`; }
function _pad(n) { return String(n).padStart(2, "0"); }

function _buildPage(all, page, totalPages, nextSyncSec) {
    const start = (page - 1) * PER_PAGE;
    const slice = all.slice(start, start + PER_PAGE);
    const active = all.filter(k => k.status === "active").length;
    const dead = all.length - active;
    const mins = Math.floor(nextSyncSec / 60);
    const secs = nextSyncSec % 60;
    const syncLabel = mins > 0 ? `in ${mins}m ${secs}s` : `in ${secs}s`;

    // Also show Gemini stats for comparison
    const geminiAll = Keys.getAll();
    const geminiActive = geminiAll.filter(k => k.status === "active").length;

    const rows = slice.map(k => {
        const icon = k.status === "active" ? "✔️" : "❌";
        return `│ ${_pad(k.id)}• [ ${_mask(k.key)} ]  ➔  ${icon} ${k.status.toUpperCase()}`;
    });

    return [
        "━━━━━━━━━━━━━━━━━━━━━━",
        "     ⚡ [[ Grok KeyCenter ]] ⚡",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "╭───────╼ 🤖 ╾───────╮",
        "│ 👑 Grok (xAI) Key Index",
        "│",
        ...rows,
        "│",
        "├───────╼ 📊 ╾───────┤",
        `│ 🟢 Active: ${active} | 🔴 Dead: ${dead}`,
        `│ 🔄 Next Sync: ${syncLabel}`,
        "├───────╼ 🔑 ╾───────┤",
        `│ 💎 Gemini keys: ${geminiActive} active / ${geminiAll.length} total`,
        "╰───────╼ 🛡️ ╾───────╯",
        `[ ⬅️ Prev ]  [ Page ${page}/${totalPages} ]  [ Next ➡️ ]`,
        "",
        `📌 Reply with a page number (1-${totalPages}) to navigate`
    ].join("\n");
}

function _registerNav(msgID, senderID, totalPages) {
    if (!global.BeatriceBC) global.BeatriceBC = {};
    if (!global.BeatriceBC.ncReply) global.BeatriceBC.ncReply = new Map();
    global.BeatriceBC.ncReply.set(msgID, {
        commandName: "groklist", author: senderID, type: "groklist-nav", totalPages,
    });
    setTimeout(() => {
        try { global.BeatriceBC.ncReply.delete(msgID); } catch (e) {}
    }, 10 * 60 * 1000);
}

module.exports.ncStart = async ({ api, event, args }) => {
    const all = GrokKeys.getAll();
    if (!all.length) {
        return api.sendMessage(
            "📭 No Grok keys in the pool yet!\n\nAdd keys with: .grokadd xai-... 🔑\nGet free keys at: https://console.x.ai",
            event.threadID, event.messageID
        );
    }

    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const page = Math.max(1, Math.min(parseInt(args[0] || "1", 10) || 1, totalPages));
    const nextSyncSec = GrokManager.getNextGrokSyncSeconds();
    const msg = _buildPage(all, page, totalPages, nextSyncSec);

    api.sendMessage(msg, event.threadID, (err, info) => {
        if (err || !info) return;
        _registerNav(info.messageID, event.senderID, totalPages);
    }, event.messageID);
};

module.exports.ncReply = async ({ api, event, Reply }) => {
    if (!Reply || Reply.type !== "groklist-nav") return;

    const pageInput = parseInt((event.body || "").trim(), 10);
    if (isNaN(pageInput)) return;

    const all = GrokKeys.getAll();
    if (!all.length) return api.sendMessage("📭 Grok pool is empty now!", event.threadID);

    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const page = Math.max(1, Math.min(pageInput, totalPages));
    const nextSyncSec = GrokManager.getNextGrokSyncSeconds();
    const msg = _buildPage(all, page, totalPages, nextSyncSec);

    api.sendMessage(msg, event.threadID, (err, info) => {
        if (err || !info) return;
        _registerNav(info.messageID, event.senderID, totalPages);
    }, event.messageID);
};
