// scripts/cmds/creator/keylist.js — List all Gemini keys with pagination
//
// Usage: .keylist [page]
// Navigate: reply with a page number

const path = require("path");
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));
const KeysManager = require(path.join(process.cwd(), "utils", "KeysManager.js"));

const PER_PAGE = 10;

module.exports.config = {
    name: "keylist",
    aliases: ["keys"],
    version: "1.1.0",
    author: "sekro",
    countDown: 3,
    role: 3,
    usePrefix: true,
    description: "List all Gemini API keys with pagination.",
    category: "creator",
    guide: { en: "{pn} [page]  — reply with a page number to navigate" },
};

function _mask(key) { return `${key.slice(0, 4)}...${key.slice(-4)}`; }
function _pad(n) { return String(n).padStart(2, "0"); }

function _buildPage(all, page, totalPages, nextSyncSec) {
    const start = (page - 1) * PER_PAGE;
    const slice = all.slice(start, start + PER_PAGE);
    const active = all.filter(k => k.status === "active").length;
    const dead = all.length - active;
    const mins = Math.floor(nextSyncSec / 60);
    const secs = nextSyncSec % 60;
    const syncLabel = mins > 0 ? `in ${mins}m ${secs}s` : `in ${secs}s`;

    // Grok stats
    let grokActive = 0, grokTotal = 0;
    try {
        const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));
        const grokAll = GrokKeys.getAll();
        grokTotal = grokAll.length;
        grokActive = grokAll.filter(k => k.status === "active").length;
    } catch (e) {}

    const rows = slice.map(k => {
        const icon = k.status === "active" ? "✔️" : "❌";
        return `│ ${_pad(k.id)}• [ ${_mask(k.key)} ]  ➔  ${icon} ${k.status.toUpperCase()}`;
    });

    return [
        "━━━━━━━━━━━━━━━━━━━━━━",
        "     🔑 [[ Beatrice KeyCenter ]] 🔑",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "╭───────╼ ⚡ ╾───────╮",
        "│ 👑 Gemini Core Index",
        "│",
        ...rows,
        "│",
        "├───────╼ 📊 ╾───────┤",
        `│ 💎 Gemini: 🟢 ${active} active | 🔴 ${dead} dead`,
        `│ ⚡ Grok:   🟢 ${grokActive} active | 🔴 ${grokTotal - grokActive} dead`,
        `│ 🔄 Next Sync: ${syncLabel}`,
        "╰───────╼ 🛡️ ╾───────╯",
        `[ ⬅️ Prev ]  [ Page ${page}/${totalPages} ]  [ Next ➡️ ]`,
        "",
        `📌 Reply with a page number (1-${totalPages}) to navigate`,
        `📌 Use .groklist to manage Grok keys`
    ].join("\n");
}

function _registerNav(msgID, senderID, totalPages) {
    if (!global.BeatriceBC) global.BeatriceBC = {};
    if (!global.BeatriceBC.ncReply) global.BeatriceBC.ncReply = new Map();
    global.BeatriceBC.ncReply.set(msgID, {
        commandName: "keylist", author: senderID, type: "keylist-nav", totalPages,
    });
    setTimeout(() => {
        try { global.BeatriceBC.ncReply.delete(msgID); } catch (e) {}
    }, 10 * 60 * 1000);
}

module.exports.ncStart = async ({ api, event, args }) => {
    const all = Keys.getAll();
    if (!all.length) {
        return api.sendMessage(
            "📭 No keys in the pool yet!\n\nAdd keys with: .keyadd <key> 🔑",
            event.threadID, event.messageID
        );
    }

    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    let page = Math.max(1, Math.min(parseInt(args[0] || "1", 10) || 1, totalPages));
    const nextSyncSec = KeysManager.getNextSyncSeconds();
    const msg = _buildPage(all, page, totalPages, nextSyncSec);

    api.sendMessage(msg, event.threadID, (err, info) => {
        if (err || !info) return;
        _registerNav(info.messageID, event.senderID, totalPages);
    }, event.messageID);
};

module.exports.ncReply = async ({ api, event, Reply }) => {
    if (!Reply || Reply.type !== "keylist-nav") return;

    const pageInput = parseInt((event.body || "").trim(), 10);
    if (isNaN(pageInput)) return;

    const all = Keys.getAll();
    if (!all.length) return api.sendMessage("📭 Pool is empty now!", event.threadID);

    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const page = Math.max(1, Math.min(pageInput, totalPages));
    const nextSyncSec = KeysManager.getNextSyncSeconds();
    const msg = _buildPage(all, page, totalPages, nextSyncSec);

    api.sendMessage(msg, event.threadID, (err, info) => {
        if (err || !info) return;
        _registerNav(info.messageID, event.senderID, totalPages);
    }, event.messageID);
};
