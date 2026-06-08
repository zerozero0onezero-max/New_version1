// scripts/cmds/creator/groqadd.js — Test & add a Groq inference-platform key
//
// Groq (console.groq.com) ≠ Grok (xAI)
// Keys start with "gsk_"
// Models available: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
//
// Usage:  .groqadd gsk_...          — test & add key
//         .groqadd list             — list all keys
//         .groqadd del <id>         — delete key by ID

const axios = require("axios");
const path  = require("path");
const GroqApiKeys = require(path.join(process.cwd(), "utils", "GroqApiKeys.js"));

module.exports.config = {
    name:             "groqadd",
    aliases:          ["groqkey"],
    version:          "1.0.0",
    author:           "sekro",
    countDown:        5,
    role:             3,
    usePrefix:        true,
    description:      "Test and manage Groq inference-platform API keys (gsk_...).",
    category:         "creator",
    guide:            { en: "{pn} <gsk_key>  |  {pn} list  |  {pn} del <id>" },
};

const TEST_MODEL   = "llama-3.1-8b-instant";
const GROQ_ENDPOINT= "https://api.groq.com/openai/v1/chat/completions";

async function testGroqKey(keyValue) {
    try {
        const res = await axios.post(
            GROQ_ENDPOINT,
            {
                model:      TEST_MODEL,
                messages:   [{ role: "user", content: "Say OK" }],
                max_tokens: 5,
                temperature: 0,
            },
            {
                timeout: 12000,
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${keyValue}`,
                },
            }
        );
        const text = (res.data?.choices?.[0]?.message?.content || "").trim();
        return { ok: !!text, model: TEST_MODEL, response: text };
    } catch (e) {
        const status = e.response?.status;
        const msg    = e.response?.data?.error?.message || e.message || "unknown error";
        return { ok: false, errorCode: status, errorMsg: msg.slice(0, 120) };
    }
}

module.exports.ncStart = async ({ api, event, args }) => {
    const sub = (args[0] || "").trim().toLowerCase();

    // ── list ─────────────────────────────────────────────────────────────────
    if (sub === "list") {
        const all = GroqApiKeys.getAll();
        if (!all.length)
            return api.sendMessage("📭 No Groq keys stored yet.\nAdd one: .groqadd gsk_...", event.threadID, event.messageID);

        const lines = all.map(k => {
            const lastUsed = k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "never";
            return `#${k.id} [${k.status}] — ${k.key.slice(0, 12)}... — last used: ${lastUsed}`;
        });
        return api.sendMessage(
            `🔑 Groq Keys (${all.length}/${GroqApiKeys.MAX_KEYS}):\n${lines.join("\n")}`,
            event.threadID, event.messageID
        );
    }

    // ── del <id> ──────────────────────────────────────────────────────────────
    if (sub === "del" || sub === "delete" || sub === "remove") {
        const id = parseInt(args[1] || "", 10);
        if (isNaN(id))
            return api.sendMessage("❌ Usage: .groqadd del <id>\nSee IDs with: .groqadd list", event.threadID, event.messageID);
        const ok = GroqApiKeys.remove(id);
        return api.sendMessage(
            ok ? `✅ Groq key #${id} removed.` : `❌ Key #${id} not found.`,
            event.threadID, event.messageID
        );
    }

    // ── add key ───────────────────────────────────────────────────────────────
    const keyValue = (args[0] || "").trim();

    if (!keyValue) {
        return api.sendMessage(
            "🔑 Groq API Key Manager\n" +
            "━━━━━━━━━━━━━━━━━━━━━━\n" +
            "Add:    .groqadd gsk_...\n" +
            "List:   .groqadd list\n" +
            "Remove: .groqadd del <id>\n\n" +
            "💡 Get a free key at: https://console.groq.com",
            event.threadID, event.messageID
        );
    }

    if (!keyValue.startsWith("gsk_")) {
        return api.sendMessage(
            "❌ Invalid key format.\n🔎 Groq keys start with \"gsk_\"\n💡 Get one at: https://console.groq.com",
            event.threadID, event.messageID
        );
    }

    const existing = GroqApiKeys.getAll().find(k => k.key === keyValue);
    if (existing) {
        return api.sendMessage(
            `⚠️ This Groq key already exists in the pool (ID #${existing.id}).`,
            event.threadID, event.messageID
        );
    }

    if (GroqApiKeys.getAll().length >= GroqApiKeys.MAX_KEYS) {
        return api.sendMessage(
            `🚫 Groq pool is full (max ${GroqApiKeys.MAX_KEYS} keys). Remove one first: .groqadd del <id>`,
            event.threadID, event.messageID
        );
    }

    await api.sendMessage(`🔄 Testing Groq key with ${TEST_MODEL}... ⏳`, event.threadID);

    const result = await testGroqKey(keyValue);

    if (!result.ok) {
        let msg = "❌ Groq key test FAILED — key was NOT added.\n";
        if (result.errorCode === 401) msg += "🔐 Reason: Invalid / expired key.\n💡 Re-copy the full key from: https://console.groq.com";
        else if (result.errorCode === 403) msg += "🚫 Reason: Key has no access to this model.";
        else if (result.errorCode === 429) msg += "⏱️ Reason: Rate limit hit. Try again in a moment.";
        else msg += `🔎 Reason: ${result.errorMsg || "Unknown error"}`;
        return api.sendMessage(msg, event.threadID, event.messageID);
    }

    const addResult = GroqApiKeys.add(keyValue);
    if (!addResult.ok) {
        return api.sendMessage(`⚠️ Key tested OK but could not be saved:\n${addResult.msg}`, event.threadID, event.messageID);
    }

    return api.sendMessage(
        `✅ Groq key ADDED successfully!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID:     #${addResult.id}\n` +
        `🤖 Model:  ${result.model}\n` +
        `💬 Test:   "${result.response}"\n` +
        `📊 Pool:   ${GroqApiKeys.getAll().length}/${GroqApiKeys.MAX_KEYS} keys\n\n` +
        `Groq is now active as a fallback AI (Blackbox → Groq → HuggingFace).`,
        event.threadID, event.messageID
    );
};
