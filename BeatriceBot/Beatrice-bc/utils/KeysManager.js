"use strict";
/**
 * utils/KeysManager.js — Smart Gemini Key Rotation Engine
 * Supports Grok as text fallback when all Gemini keys fail.
 */

const axios = require("axios");
const path = require("path");
const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const PING_INTERVAL_MS = 5 * 60 * 1000;

// ========== Updated PREFERRED_MODELS (مرتبة حسب السرعة) ==========
const PREFERRED_MODELS = [
    // Tier 1: Fastest Flash-Lite
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-lite-latest",

    // Tier 2: Fast Flash
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-3-flash-preview",
    "gemini-flash-latest",

    // Tier 3: Powerful Pro
    "gemini-2.5-pro",
    "gemini-3-pro-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-pro-preview-customtools",
    "gemini-pro-latest",

    // Tier 4: Legacy (fallback)
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-pro",
];

const _keyModelCache = new Map();
let _rotIdx = 0;
let _lastPingAt = null;
let _pingLoopStarted = false;

// ── Speed registry (in-memory, resets on restart) ────────────────────────────
// Tracks response time per key to route future requests to the fastest key first.
const _speedReg = new Map(); // keyValue → { sum, count, last, lastAt }
let _lastSuccessKey = null;   // the key that last produced a successful reply

function _recordSpeed(keyValue, ms) {
    const r = _speedReg.get(keyValue) || { sum: 0, count: 0, last: 0, lastAt: 0 };
    r.sum += ms; r.count++; r.last = ms; r.lastAt = Date.now();
    _speedReg.set(keyValue, r);
}
function _avgSpeed(keyValue) {
    const r = _speedReg.get(keyValue);
    if (!r || r.count === 0) return 3000; // assume 3s until measured
    return r.sum / r.count;
}
// Skip a key if its LAST attempt took >55s AND that attempt was within the last 3 minutes
function _isTooSlow(keyValue) {
    const r = _speedReg.get(keyValue);
    if (!r) return false;
    return r.last > 55000 && (Date.now() - r.lastAt) < 3 * 60 * 1000;
}

// ── Model discovery: ask Google which models are available for this key ──────
async function _discoverModel(keyValue) {
    if (_keyModelCache.has(keyValue)) return _keyModelCache.get(keyValue);
    try {
        const listRes = await axios.get(
            `${GEMINI_BASE}/models?key=${keyValue}&pageSize=100`,
            { timeout: 10000 }
        );
        const models = listRes.data?.models || [];
        const availableModelNames = models
            .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
            .map(m => m.name.replace("models/", ""));

        for (const preferred of PREFERRED_MODELS) {
            if (availableModelNames.includes(preferred)) {
                _keyModelCache.set(keyValue, preferred);
                return preferred;
            }
        }

        // Any flash model as secondary fallback
        const fallbackModel = availableModelNames.find(
            n => n.includes("gemini") && n.includes("flash")
        );
        if (fallbackModel) {
            _keyModelCache.set(keyValue, fallbackModel);
            return fallbackModel;
        }

        // Any gemini model as last resort
        const anyGemini = availableModelNames.find(n => n.includes("gemini"));
        if (anyGemini) {
            _keyModelCache.set(keyValue, anyGemini);
            return anyGemini;
        }
    } catch (e) {}

    // Safe default (gemini-2.5-flash)
    const defaultModel = PREFERRED_MODELS[5];
    _keyModelCache.set(keyValue, defaultModel);
    return defaultModel;
}

// ── Dead key detector ────────────────────────────────────────────────────────
function _isKeyDead(e) {
    const status = e.response?.status;
    const msg = (e.response?.data?.error?.message || e.message || "").toLowerCase();
    return (
        (status === 400 && (msg.includes("api_key_invalid") || msg.includes("api key not valid"))) ||
        status === 403
    );
}

// ── Request body builder ─────────────────────────────────────────────────────
function _buildBody({ system, history = [], user, maxTokens = 1024 }) {
    return {
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents: [
            ...history.map(h => ({
                role: h.role === "model" ? "model" : "user",
                parts: [{ text: h.text || "" }]
            })),
            { role: "user", parts: [{ text: user }] }
        ],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.95 }
    };
}

// ── Single key request ───────────────────────────────────────────────────────
async function _requestWithKey(keyValue, opts) {
    // Always prefer the cached/discovered model over opts.model (caller may pass a stale default)
    const model = _keyModelCache.get(keyValue) || (await _discoverModel(keyValue));
    try {
        const res = await axios.post(
            `${GEMINI_BASE}/models/${model}:generateContent?key=${keyValue}`,
            _buildBody(opts),
            { timeout: 9000 }
        );
        return (res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    } catch (e) {
        // If 404, clear cache and rediscover, then retry once
        if (e.response?.status === 404) {
            _keyModelCache.delete(keyValue);
            const newModel = await _discoverModel(keyValue);
            const res2 = await axios.post(
                `${GEMINI_BASE}/models/${newModel}:generateContent?key=${keyValue}`,
                _buildBody(opts),
                { timeout: 9000 }
            );
            return (res2.data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
        }
        throw e;
    }
}

// ── Main chat function: Gemini (speed-sorted) → Grok → aiClient ─────────────
async function chat(opts) {
    const historyMapped = (opts.history || []).map(h => ({
        role: h.role === "model" ? "assistant" : "user",
        content: h.text || ""
    }));

    // 1. Gemini keys — sorted by average speed, last successful key goes first
    let active = Keys.getActive().sort((a, b) => _avgSpeed(a.key) - _avgSpeed(b.key));

    // Promote last successful key to front of the line
    if (_lastSuccessKey) {
        const idx = active.findIndex(e => e.key === _lastSuccessKey);
        if (idx > 0) {
            const [winner] = active.splice(idx, 1);
            active.unshift(winner);
        }
    }

    for (const entry of active) {
        // Skip keys whose last attempt was too slow (>55s within last 3min)
        if (_isTooSlow(entry.key)) {
            console.log(`[KeysManager] Skip key #${entry.id} — last attempt too slow, trying next`);
            continue;
        }
        const t0 = Date.now();
        try {
            const text = await _requestWithKey(entry.key, opts);
            const ms = Date.now() - t0;
            _recordSpeed(entry.key, ms);
            Keys.touchByValue(entry.key);
            if (text) {
                _lastSuccessKey = entry.key;
                console.log(`[KeysManager] Gemini key #${entry.id} OK in ${ms}ms`);
                return text;
            }
        } catch (e) {
            const ms = Date.now() - t0;
            _recordSpeed(entry.key, ms);
            if (_isKeyDead(e)) {
                Keys.setStatusByValue(entry.key, "dead");
                _keyModelCache.delete(entry.key);
                console.warn(`[KeysManager] Key #${entry.id} dead (${e.response?.status || e.message})`);
            }
            continue;
        }
    }

    // 2. Grok as text fallback
    try {
        const GrokManager = require(path.join(process.cwd(), "utils", "GrokManager.js"));
        const grokText = await GrokManager.chatWithGrok(opts.user, opts.system || "", historyMapped);
        if (grokText) { console.log("[KeysManager] Grok fallback OK"); return grokText; }
    } catch (e) {}

    // 3. Blackbox → Pawan → Pollinations (via aiClient)
    const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));
    return await aiClient.chat(opts.user, opts.system || "", historyMapped);
}

// ── Image description ────────────────────────────────────────────────────────
async function describeImageWithGemini(imageBuffer, mimeType = "image/jpeg") {
    const active = Keys.getActive();
    for (const entry of active) {
        try {
            const model = await _discoverModel(entry.key);
            const res = await axios.post(
                `${GEMINI_BASE}/models/${model}:generateContent?key=${entry.key}`,
                {
                    contents: [{
                        role: "user",
                        parts: [
                            { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
                            { text: "Describe this image in one clear concise sentence in English." }
                        ]
                    }],
                    generationConfig: { maxOutputTokens: 100, temperature: 0.3 }
                },
                { timeout: 25000 }
            );
            const text = (res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
            if (text) { Keys.touchByValue(entry.key); return text; }
        } catch (e) {
            if (_isKeyDead(e)) { Keys.setStatusByValue(entry.key, "dead"); _keyModelCache.delete(entry.key); }
            continue;
        }
    }
    return null;
}

// ── Audio transcription ──────────────────────────────────────────────────────
async function transcribeAudioWithGemini(audioBuffer, mimeType = "audio/ogg") {
    const active = Keys.getActive();
    for (const entry of active) {
        try {
            const model = await _discoverModel(entry.key);
            const res = await axios.post(
                `${GEMINI_BASE}/models/${model}:generateContent?key=${entry.key}`,
                {
                    contents: [{
                        role: "user",
                        parts: [
                            { inlineData: { mimeType, data: audioBuffer.toString("base64") } },
                            { text: "Transcribe the speech in this audio. Return only the spoken words." }
                        ]
                    }],
                    generationConfig: { maxOutputTokens: 300, temperature: 0.1 }
                },
                { timeout: 30000 }
            );
            const text = (res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
            if (text) { Keys.touchByValue(entry.key); return text; }
        } catch (e) {
            if (_isKeyDead(e)) { Keys.setStatusByValue(entry.key, "dead"); _keyModelCache.delete(entry.key); }
            continue;
        }
    }
    return null;
}

// ── Single key ping ──────────────────────────────────────────────────────────
async function _pingKey(keyValue) {
    try {
        const model = _keyModelCache.get(keyValue) || PREFERRED_MODELS[5];
        const res = await axios.post(
            `${GEMINI_BASE}/models/${model}:generateContent?key=${keyValue}`,
            _buildBody({ user: "hi", maxTokens: 5 }),
            { timeout: 9000 }
        );
        return res.status === 200;
    } catch (e) {
        if (e.response?.status === 404) {
            _keyModelCache.delete(keyValue);
            try {
                const m = await _discoverModel(keyValue);
                const res2 = await axios.post(
                    `${GEMINI_BASE}/models/${m}:generateContent?key=${keyValue}`,
                    _buildBody({ user: "hi", maxTokens: 5 }),
                    { timeout: 9000 }
                );
                return res2.status === 200;
            } catch (e2) { return false; }
        }
        // 429 = rate limited but alive
        if (e.response?.status === 429) return true;
        return false;
    }
}

// ── Ping all Gemini keys ─────────────────────────────────────────────────────
async function pingAll() {
    _lastPingAt = new Date();
    const all = Keys.getAll();
    if (!all.length) return { active: 0, dead: 0 };
    const results = await Promise.all(all.map(async entry => {
        const alive = await _pingKey(entry.key);
        Keys.setStatusById(entry.id, alive ? "active" : "dead");
        return alive;
    }));
    _rotIdx = 0;
    const active = results.filter(Boolean).length;
    console.log(`[KeysManager] Gemini Ping done — ✅ ${active} active / ❌ ${results.length - active} dead`);
    return { active, dead: results.length - active };
}

// ── Start periodic ping loop ─────────────────────────────────────────────────
function startPingLoop() {
    if (_pingLoopStarted) return;
    _pingLoopStarted = true;
    const t1 = setTimeout(async () => {
        try { await pingAll(); } catch (e) {}
        const t2 = setInterval(async () => {
            try { await pingAll(); } catch (e) {}
        }, PING_INTERVAL_MS);
        if (t2 && typeof t2.unref === "function") t2.unref();
    }, 60 * 1000);
    if (t1 && typeof t1.unref === "function") t1.unref();
}

// ── Round-robin key getter ───────────────────────────────────────────────────
function getNextKey() {
    const active = Keys.getActive();
    if (!active.length) return null;
    const entry = active[_rotIdx % active.length];
    _rotIdx = (_rotIdx + 1) % active.length;
    return entry.key;
}

// ── Next sync time ───────────────────────────────────────────────────────────
function getNextSyncSeconds() {
    if (!_lastPingAt) return Math.round(PING_INTERVAL_MS / 1000);
    return Math.max(0, Math.round((PING_INTERVAL_MS - (Date.now() - _lastPingAt.getTime())) / 1000));
}

// ── Test a new key: tries all preferred models, handles 429 as valid ─────────
async function testKey(keyValue) {
    // First: discover available models from Google
    let discoveredModels = [];
    try {
        const listRes = await axios.get(
            `${GEMINI_BASE}/models?key=${keyValue}&pageSize=100`,
            { timeout: 10000 }
        );
        const models = listRes.data?.models || [];
        discoveredModels = models
            .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
    } catch (e) {
        const status = e.response?.status;
        const msg = (e.response?.data?.error?.message || "").toLowerCase();
        if (status === 400 && (msg.includes("not valid") || msg.includes("invalid"))) {
            return { ok: false, model: null, errorCode: 400, errorMsg: "API key is not valid" };
        }
        if (status === 403) {
            return { ok: false, model: null, errorCode: 403, errorMsg: "Permission denied — enable Gemini API in Google Cloud Console" };
        }
    }

    // Build ordered list: preferred models that are available first, then rest
    const modelsToTry = [];
    for (const preferred of PREFERRED_MODELS) {
        if (discoveredModels.includes(preferred)) modelsToTry.push(preferred);
    }
    // Add any remaining discovered models not in preferred list
    for (const m of discoveredModels) {
        if (!modelsToTry.includes(m)) modelsToTry.push(m);
    }
    // Safety fallback if discovery failed
    if (modelsToTry.length === 0) {
        modelsToTry.push(...PREFERRED_MODELS);
    }

    for (const model of modelsToTry) {
        try {
            const res = await axios.post(
                `${GEMINI_BASE}/models/${model}:generateContent?key=${keyValue}`,
                _buildBody({ user: "hi", maxTokens: 5 }),
                { timeout: 15000 }
            );
            if (res.status === 200) {
                _keyModelCache.set(keyValue, model);
                return { ok: true, model };
            }
        } catch (e) {
            const status = e.response?.status;
            const msg = (e.response?.data?.error?.message || e.message || "").toLowerCase();

            if (status === 400 && (msg.includes("not valid") || msg.includes("invalid") || msg.includes("api_key"))) {
                return { ok: false, model: null, errorCode: 400, errorMsg: "API key is not valid" };
            }
            if (status === 403) {
                return { ok: false, model: null, errorCode: 403, errorMsg: "Permission denied — enable Gemini API in Google Cloud Console" };
            }
            // 429 = rate limited → key is valid
            if (status === 429) {
                _keyModelCache.set(keyValue, model);
                return { ok: true, model, rateLimited: true };
            }
            if (status === 404) continue;
        }
    }

    // ⭐ FINAL FALLBACK: Return available models for diagnosis
    if (discoveredModels.length > 0) {
        return {
            ok: false,
            model: null,
            errorCode: 0,
            errorMsg: "All attempts failed but key could fetch model list. Models may have changed.",
            availableModels: discoveredModels
        };
    }

    return { ok: false, model: null, errorCode: 0, errorMsg: "All models failed — key may be invalid or region restricted" };
}

startPingLoop();

module.exports = {
    chat,
    describeImageWithGemini,
    transcribeAudioWithGemini,
    pingAll,
    startPingLoop,
    getNextKey,
    getNextSyncSeconds,
    testKey,
};
