// scripts/cmds/creator/keysRemove.js — Remove a Gemini key by serial ID
//
// Usage: .keydel 3

const path = require("path");
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));

module.exports.config = {
    name: "keydel",
    aliases: ["keyremove", "keydelete"],
    version: "1.1.0",
    author: "sekro",
    countDown: 3,
    role: 3,
    usePrefix: true,
    description: "Remove a Gemini API key from the pool by its serial number.",
    category: "creator",
    guide: { en: "{pn} <id>  e.g: {pn} 3" },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const id = parseInt((args[0] || "").trim(), 10);

    if (isNaN(id)) {
        return api.sendMessage(
            "🗑️ Usage: .keydel <serial number>\nExample: .keydel 3\n\nUse .keylist to see serial numbers 📋",
            event.threadID, event.messageID
        );
    }

    const entry = Keys.getById(id);
    if (!entry) {
        return api.sendMessage(
            `❌ No key found with serial #${id}\n📋 Use .keylist to see existing keys`,
            event.threadID, event.messageID
        );
    }

    const masked = `${entry.key.slice(0, 6)}...${entry.key.slice(-4)}`;
    const wasActive = entry.status === "active";

    Keys.remove(id);

    return api.sendMessage(
        [
            "🗑️ Key removed successfully!",
            "",
            `🆔 Removed serial: #${id}`,
            `🔑 Key: [ ${masked} ]`,
            `📊 Previous status: ${wasActive ? "✔️ ACTIVE" : "❌ DEAD"}`,
            "",
            `🗂️ Remaining keys: ${Keys.getAll().length}`,
            `🟢 Active: ${Keys.getActive().length}`
        ].join("\n"),
        event.threadID, event.messageID
    );
};
