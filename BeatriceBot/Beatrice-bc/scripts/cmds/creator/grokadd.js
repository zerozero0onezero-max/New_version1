// scripts/cmds/creator/grokadd.js — Test & add a Grok (xAI) API key
// Usage: .grokadd xai-...

const path = require("path");
const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));
const GrokManager = require(path.join(process.cwd(), "utils", "GrokManager.js"));

module.exports.config = {
    name: "grokadd",
    version: "1.0.0",
    author: "sekro",
    countDown: 5,
    role: 3,
    usePrefix: true,
    description: "Test a Grok (xAI) API key and add it to the rotation pool.",
    category: "creator",
    guide: { en: "{pn} <api-key>  e.g: {pn} xai-..." },
};

module.exports.ncStart = async ({ api, event, args }) => {
    const keyValue = (args[0] || "").trim();

    if (!keyValue) {
        return api.sendMessage(
            "🔑 Usage: .grokadd <api-key>\nExample: .grokadd xai-...\nGet a free key at: https://console.x.ai",
            event.threadID, event.messageID
        );
    }

    if (!keyValue.startsWith("xai-")) {
        return api.sendMessage(
            "❌ Invalid key format.\n🔎 Grok keys start with \"xai-\"\nGet one at: https://console.x.ai",
            event.threadID, event.messageID
        );
    }

    const all = GrokKeys.getAll();
    if (all.find(k => k.key === keyValue)) {
        return api.sendMessage(
            "⚠️ This Grok key already exists in the pool!",
            event.threadID, event.messageID
        );
    }

    if (all.length >= GrokKeys.MAX_GROK_KEYS) {
        return api.sendMessage(
            `🚫 Grok pool is full! Maximum is ${GrokKeys.MAX_GROK_KEYS} keys.`,
            event.threadID, event.messageID
        );
    }

    await api.sendMessage("🔄 Testing Grok key... ⏳", event.threadID);

    const result = await GrokManager.testGrokKey(keyValue);

    if (!result.ok) {
        const errLine = result.errorMsg ? `\n🔎 Reason: ${result.errorMsg}` : "";
        const codeHint = result.errorCode === 401
            ? "\n\n💡 Make sure you copied the full key from:\nhttps://console.x.ai"
            : result.errorCode === 403
            ? "\n\n💡 Check your xAI account permissions at:\nhttps://console.x.ai"
            : "\n\n💡 Key might be restricted or expired.";

        return api.sendMessage(
            ["❌ Grok key test FAILED 💀", errLine, codeHint].join("\n"),
            event.threadID, event.messageID
        );
    }

    const entry = GrokKeys.add(keyValue);
    const masked = `${keyValue.slice(0, 8)}...${keyValue.slice(-4)}`;
    const date = new Date(entry.addedDate).toLocaleDateString("en-GB");
    const quotaNote = result.rateLimited
        ? "\n⚠️ Note: Rate-limited during test. Key added as ACTIVE — sync will verify shortly."
        : "";

    return api.sendMessage(
        [
            "✅ Grok key added successfully! 🎉🔑",
            quotaNote,
            "",
            `🆔 Serial: #${entry.id}`,
            `🔑 Key: [ ${masked} ]`,
            `🤖 Model: ${result.model || "auto"}`,
            `📅 Added: ${date}`,
            `📊 Status: ${result.rateLimited ? "⚠️ RATE LIMITED (syncing...)" : "✔️ ACTIVE"}`,
            "",
            `🗂️ Total Grok keys: ${GrokKeys.getAll().length} / ${GrokKeys.MAX_GROK_KEYS}`,
            `🟢 Active: ${GrokKeys.getActive().length}`,
        ].join("\n"),
        event.threadID, event.messageID
    );
};
