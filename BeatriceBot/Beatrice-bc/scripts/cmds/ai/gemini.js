// scripts/cmds/ai/gemini.js — .gemini / .ai command
//
// Priority: KeysManager (user keys) → nixhost → aiClient (Blackbox → Pollinations)

const axios = require("axios");
const path = require("path");
const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));

const NIX_JSON = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";
let _cachedBase = null;

async function getNixBase() {
    if (_cachedBase) return _cachedBase;
    const res = await axios.get(NIX_JSON, { timeout: 8000 });
    _cachedBase = res.data && res.data.api;
    if (!_cachedBase) throw new Error("Missing 'api' field in nix JSON");
    return _cachedBase;
}

async function askGemini(prompt, imageUrl) {
    // 1. KeysManager (user Gemini keys with rotation)
    try {
        const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));
        if (Keys.getActive().length > 0) {
            const km = require(path.join(process.cwd(), "utils", "KeysManager.js"));
            const system = imageUrl
                ? "You are a helpful AI that can see images. Describe and analyze what you're shown."
                : "You are a helpful AI assistant. Be clear and concise.";
            const userMsg = imageUrl ? `${prompt}\n[Analyze this image: ${imageUrl}]` : prompt;
            const text = await km.chat({ system, user: userMsg });
            if (text) return text;
        }
    } catch (e) {
        console.warn("[gemini cmd] KeysManager failed:", e.message);
    }

    // 2. Nixhost endpoint
    try {
        const base = await getNixBase();
        const url = imageUrl
            ? `${base}/gemini-pro?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`
            : `${base}/gemini?prompt=${encodeURIComponent(prompt)}`;
        const r = await axios.get(url, { timeout: 15000 });
        const reply = r.data?.response || r.data?.reply || r.data?.result;
        if (reply) return reply;
    } catch (e) {
        console.warn("[gemini cmd] nixhost failed:", e.message);
        _cachedBase = null;
    }

    // 3. aiClient fallback (Blackbox → Pollinations)
    const systemMsg = imageUrl
        ? "You are a helpful AI. When given an image URL in the prompt, describe what you imagine or know about it."
        : "You are a helpful AI assistant. Answer clearly and concisely.";
    const q = imageUrl ? `${prompt}\n[Image URL: ${imageUrl}]` : prompt;
    return await aiClient.ask(q, systemMsg);
}

module.exports = {
    config: {
        name: "gemini",
        aliases: ["ai", "chat"],
        version: "2.1.0",
        author: "Beatrice bc",
        countDown: 3,
        usePrefix: true,
        role: 0,
        shortDescription: "Ask AI (text or image)",
        longDescription: "Talk with AI. Reply to an image to ask about it.",
        category: "AI",
        guide: "{p}gemini [question] — reply to an image for vision mode"
    },

    ncStart: async function ({ api, event, args }) {
        const p = args.join(" ").trim();
        if (!p) return api.sendMessage("❌ Please provide a question.", event.threadID, event.messageID);

        api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);

        let imageUrl = null;
        const attach = (event.messageReply?.attachments || []).concat(event.attachments || []);
        for (const att of attach) {
            if (["photo", "sticker", "animated_image"].includes(att.type)) { imageUrl = att.url; break; }
        }

        try {
            const reply = await askGemini(p, imageUrl);
            api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
            api.sendMessage(reply, event.threadID, (err, i) => {
                if (!i) return;
                if (!imageUrl && global.BeatriceBC?.ncReply) {
                    global.BeatriceBC.ncReply.set(i.messageID, { commandName: "gemini", author: event.senderID });
                }
            }, event.messageID);
        } catch (e) {
            api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
            api.sendMessage("⚠️ AI is unavailable right now. Try again later.", event.threadID, event.messageID);
        }
    },

    ncReply: async function ({ api, event, Reply }) {
        if (!Reply || [api.getCurrentUserID()].includes(event.senderID)) return;
        const p = (event.body || "").trim();
        if (!p) return;

        api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
        try {
            const reply = await askGemini(p, null);
            api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
            api.sendMessage(reply, event.threadID, (err, i) => {
                if (!i) return;
                if (global.BeatriceBC?.ncReply) {
                    global.BeatriceBC.ncReply.set(i.messageID, { commandName: "gemini", author: event.senderID });
                }
            }, event.messageID);
        } catch (e) {
            api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
            api.sendMessage("⚠️ AI error. Try again.", event.threadID, event.messageID);
        }
    }
};
