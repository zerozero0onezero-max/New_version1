// scripts/cmds/creator/keyadd.js — Test & add a Gemini API key
// Usage: .keyadd AIzaSy...

const path = require("path");
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));
const KeysManager = require(path.join(process.cwd(), "utils", "KeysManager.js"));

module.exports.config = {
    name: "keyadd",
    version: "1.2.0",
    author: "sekro",
    countDown: 5,
    role: 3,
    usePrefix: true,
    description: "Test a Gemini API key and add it to the rotation pool.",
    category: "creator",
    guide: { en: "{pn} <api-key>  e.g: {pn} AIzaSy..." },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const keyValue = (args[0] || "").trim();

    if (!keyValue) {
        return api.sendMessage(
            "🔑 Usage: .keyadd <api-key>\nExample: .keyadd AIzaSy...",
            event.threadID, event.messageID
        );
    }

    if (!keyValue.startsWith("AIza")) {
        return api.sendMessage(
            "❌ Invalid key format.\n🔎 Gemini keys start with \"AIza...\"\nGet one free at: https://aistudio.google.com",
            event.threadID, event.messageID
        );
    }

    const all = Keys.getAll();
    if (all.find(k => k.key === keyValue)) {
        return api.sendMessage(
            "⚠️ This key already exists in the pool!",
            event.threadID, event.messageID
        );
    }

    if (all.length >= Keys.MAX_KEYS) {
        return api.sendMessage(
            `🚫 Pool is full! Maximum is ${Keys.MAX_KEYS} keys.`,
            event.threadID, event.messageID
        );
    }

    await api.sendMessage("🔄 Testing key across all available models... ⏳", event.threadID);

    const result = await KeysManager.testKey(keyValue);

    // Key is INVALID
    if (!result.ok) {
        const errLine = result.errorMsg
            ? `\n🔎 Reason: ${result.errorMsg}`
            : "";
        const codeHint = result.errorCode === 400
            ? "\n\n💡 Make sure you copied the FULL key from:\nhttps://aistudio.google.com/app/apikey"
            : result.errorCode === 403
            ? "\n\n💡 Enable the Generative Language API in:\nhttps://console.cloud.google.com/apis/library"
            : "\n\n💡 Key might be restricted to specific IPs or regions.";

        return api.sendMessage(
            [
                "❌ Key test FAILED 💀",
                errLine,
                codeHint,
            ].join("\n"),
            event.threadID, event.messageID
        );
    }

    // Key is VALID (even if quota exceeded)
    const entry = Keys.add(keyValue);
    const masked = `${keyValue.slice(0, 6)}...${keyValue.slice(-4)}`;
    const date = new Date(entry.addedDate).toLocaleDateString("en-GB");

    const quotaNote = result.rateLimited
        ? "\n⚠️ Note: Rate-limited during test (per-minute limit). Key added as ACTIVE — sync will verify shortly."
        : "";

    return api.sendMessage(
        [
            "✅ Key added successfully! 🎉🔑",
            quotaNote,
            "",
            `🆔 Serial: #${entry.id}`,
            `🔑 Key: [ ${masked} ]`,
            `🤖 Model: ${result.model || "auto"}`,
            `📅 Added: ${date}`,
            `📊 Status: ${result.rateLimited ? "⚠️ RATE LIMITED (syncing...)" : "✔️ ACTIVE"}`,
            "",
            `🗂️ Total keys: ${Keys.getAll().length} / ${Keys.MAX_KEYS}`,
            `🟢 Active: ${Keys.getActive().length}`,
        ].join("\n"),
        event.threadID, event.messageID
    );
};
