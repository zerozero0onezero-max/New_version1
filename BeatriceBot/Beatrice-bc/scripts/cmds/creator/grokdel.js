// scripts/cmds/creator/grokdel.js — Remove a Grok key by serial ID
// Usage: .grokdel 2

const path = require("path");
const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));

module.exports.config = {
    name: "grokdel",
    aliases: ["grokremove", "grokdelete"],
    version: "1.0.0",
    author: "sekro",
    countDown: 3,
    role: 3,
    usePrefix: true,
    description: "Remove a Grok API key from the pool by its serial number.",
    category: "creator",
    guide: { en: "{pn} <id>  e.g: {pn} 2" },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const id = parseInt((args[0] || "").trim(), 10);

    if (isNaN(id)) {
        return api.sendMessage(
            "🗑️ Usage: .grokdel <serial number>\nExample: .grokdel 2\n\nUse .groklist to see serial numbers 📋",
            event.threadID, event.messageID
        );
    }

    const entry = GrokKeys.getById(id);
    if (!entry) {
        return api.sendMessage(
            `❌ No Grok key found with serial #${id}\n📋 Use .groklist to see existing keys`,
            event.threadID, event.messageID
        );
    }

    const masked = `${entry.key.slice(0, 8)}...${entry.key.slice(-4)}`;
    const wasActive = entry.status === "active";

    GrokKeys.remove(id);

    return api.sendMessage(
        [
            "🗑️ Grok key removed successfully!",
            "",
            `🆔 Removed serial: #${id}`,
            `🔑 Key: [ ${masked} ]`,
            `📊 Previous status: ${wasActive ? "✔️ ACTIVE" : "❌ DEAD"}`,
            "",
            `🗂️ Remaining Grok keys: ${GrokKeys.getAll().length}`,
            `🟢 Active: ${GrokKeys.getActive().length}`
        ].join("\n"),
        event.threadID, event.messageID
    );
};
