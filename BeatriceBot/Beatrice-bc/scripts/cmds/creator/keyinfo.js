// scripts/cmds/creator/keyinfo.js — Show details of a key by serial ID
//
// Usage: .keyinfo 2

const path = require("path");
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));

module.exports.config = {
    name: "keyinfo",
    version: "1.1.0",
    author: "sekro",
    countDown: 3,
    role: 3,
    usePrefix: true,
    description: "Show full details of a Gemini API key by its serial number.",
    category: "creator",
    guide: { en: "{pn} <id>" },
};

function _fmt(iso) {
    if (!iso) return "Never used ⏳";
    try {
        return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) { return iso; }
}

module.exports.ncStart = async ({ api, event, args }) => {
    const id = parseInt((args[0] || "").trim(), 10);

    if (isNaN(id)) {
        return api.sendMessage("ℹ️ Usage: .keyinfo <id>  —  e.g: .keyinfo 2", event.threadID, event.messageID);
    }

    const entry = Keys.getById(id);
    if (!entry) {
        return api.sendMessage(
            `❌ No key with serial #${id}\n📋 Use .keylist to see the list`,
            event.threadID, event.messageID
        );
    }

    const masked = `${entry.key.slice(0, 8)}...${entry.key.slice(-6)}`;
    const statusIcon = entry.status === "active" ? "✅ ACTIVE" : "❌ DEAD";

    return api.sendMessage(
        [
            "━━━━━━━━━━━━━━━━━━━━",
            "  🔑 Key Details",
            "━━━━━━━━━━━━━━━━━━━━",
            `🆔 Serial: #${entry.id}`,
            `🔑 Key: [ ${masked} ]`,
            `📊 Status: ${statusIcon}`,
            `📅 Added: ${_fmt(entry.addedDate)}`,
            `⏱️ Last used: ${_fmt(entry.lastUsed)}`,
            "━━━━━━━━━━━━━━━━━━━━"
        ].join("\n"),
        event.threadID, event.messageID
    );
};
