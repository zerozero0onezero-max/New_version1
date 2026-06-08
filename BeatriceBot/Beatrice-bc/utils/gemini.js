// utils/gemini.js — Gemini interface
//
// Priority chain:
//   1. KeysManager (user-added Gemini keys with rotation + fallback)
//   2. Replit AI Integrations proxy (if env vars present)
//   3. aiClient fallback (Blackbox → Pawan → Pollinations)
//
// Used by:
//   - scripts/cmds/chat/baby.js
//   - scripts/cmds/ai-image/edit.js

const path = require("path");
const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));
const KeysManager = require(path.join(process.cwd(), "utils", "KeysManager.js"));

let _ai = null;

function _hasGeminiEnv() {
    return !!(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL && process.env.AI_INTEGRATIONS_GEMINI_API_KEY);
}

function _hasUserKeys() {
    try {
        const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));
        return Keys.getActive().length > 0;
    } catch (e) { return false; }
}

function getClient() {
    if (_ai) return _ai;
    if (!_hasGeminiEnv()) return null;
    const { GoogleGenAI } = require("@google/genai");
    _ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });
    return _ai;
}

/**
 * Generate a single text completion.
 * @param {Object} opts
 * @param {string} opts.system
 * @param {Array<{role, text}>} opts.history
 * @param {string} opts.user
 * @param {string} [opts.model]
 * @returns {Promise<string>}
 */
async function chat({ system, history = [], user, model = "gemini-1.5-flash" }) {
    // Priority 1: User-added keys via KeysManager
    if (_hasUserKeys()) {
        try {
            const text = await KeysManager.chat({ system, history, user, model });
            if (text) return text;
        } catch (e) {
            console.warn("[gemini] KeysManager failed:", e.message);
        }
    }

    // Priority 2: Replit Gemini integration env vars
    if (_hasGeminiEnv()) {
        try {
            const ai = getClient();
            const contents = [];
            for (const h of history) {
                contents.push({ role: h.role === "model" ? "model" : "user", parts: [{ text: h.text }] });
            }
            contents.push({ role: "user", parts: [{ text: user }] });
            const res = await ai.models.generateContent({
                model,
                contents,
                config: { systemInstruction: system, maxOutputTokens: 1024, temperature: 0.95 },
            });
            const text = (res && typeof res.text === "string" ? res.text : "").trim();
            if (text) return text;
        } catch (e) {
            console.warn("[gemini] Replit proxy failed:", e.message);
        }
    }

    // Priority 3: aiClient fallback
    const historyForAI = history.map(h => ({
        role: h.role === "model" ? "assistant" : "user",
        content: h.text
    }));
    return await aiClient.chat(user, system || "", historyForAI);
}

/**
 * Edit a reference image with a text prompt.
 * Returns a Buffer of the new image.
 */
async function editImage({ prompt, imageBuffer, mimeType = "image/jpeg" }) {
    if (!_hasGeminiEnv()) {
        throw new Error("Image editing requires Gemini integration env vars.");
    }
    const ai = getClient();
    const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{
            role: "user",
            parts: [
                { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
                { text: prompt },
            ],
        }],
    });

    const cands = res?.candidates || [];
    for (const c of cands) {
        for (const p of (c?.content?.parts || [])) {
            if (p.inlineData && p.inlineData.data) {
                return {
                    buffer: Buffer.from(p.inlineData.data, "base64"),
                    mimeType: p.inlineData.mimeType || "image/png",
                };
            }
        }
    }
    throw new Error("Gemini did not return an image.");
}

module.exports = { chat, editImage, getClient };
