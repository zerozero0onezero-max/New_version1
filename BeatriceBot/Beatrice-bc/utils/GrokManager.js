"use strict";
/**
 * utils/GrokManager.js — Grok (xAI) Key Rotation Engine
 *
 * Primary role: emoji reaction classification (fastest, fires before typing indicator)
 * Secondary role: text chat fallback when all Gemini keys are exhausted
 *
 * API: https://api.x.ai/v1 (OpenAI-compatible)
 * Models: grok-3-mini-fast (reactions), grok-3-mini (chat), grok-3 (fallback)
 */

const axios = require("axios");
const path = require("path");
const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));

const GROK_BASE = "https://api.x.ai/v1";
const PING_INTERVAL_MS = 5 * 60 * 1000;

// Grok models ordered by speed
const GROK_MODELS = [
    "grok-3-mini-fast",
    "grok-3-mini",
    "grok-3",
    "grok-beta",
];

let _grokRotIdx = 0;
let _lastGrokPingAt = null;
let _grokPingLoopStarted = false;

// ── Single Grok request (OpenAI-compatible) ──────────────────────────────────
async function _grokRequest(keyValue, messages, model, maxTokens = 512, temperature = 0.7) {
    const res = await axios.post(
        `${GROK_BASE}/chat/completions`,
        {
            model: model || GROK_MODELS[0],
            messages,
            max_tokens: maxTokens,
            temperature,
        },
        {
            timeout: 9000,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${keyValue}`
            }
        }
    );
    return (res.data?.choices?.[0]?.message?.content || "").trim();
}

// ── Detect dead Grok key ─────────────────────────────────────────────────────
function _isGrokKeyDead(e) {
    const status = e.response?.status;
    return status === 401 || status === 403;
}

// ── Text chat via Grok ───────────────────────────────────────────────────────
async function chatWithGrok(userText, system = "", history = []) {
    const active = GrokKeys.getActive();
    if (!active.length) return null;

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    for (const h of history) messages.push(h);
    messages.push({ role: "user", content: userText });

    for (const entry of active) {
        for (const model of GROK_MODELS) {
            try {
                const text = await _grokRequest(entry.key, messages, model, 1024, 0.8);
                if (text) {
                    GrokKeys.touchByValue(entry.key);
                    return text;
                }
            } catch (e) {
                if (_isGrokKeyDead(e)) {
                    GrokKeys.setStatusByValue(entry.key, "dead");
                    console.warn(`[GrokManager] Key #${entry.id} marked dead (${e.response?.status})`);
                    break;
                }
                if (e.response?.status === 404) continue; // model not found, try next
                break; // other errors: skip to next key
            }
        }
    }
    return null;
}

// ── Fast emoji classification via Grok ─────────────────────────────────────
// Returns one word: anger | laugh | sad | disgust | surprise | love | neutral
async function getEmotionWithGrok(text) {
    const active = GrokKeys.getActive();
    if (!active.length) return null;

    const messages = [
        {
            role: "system",
            content: "You are an emotion classifier. Output ONLY one word from this list: anger, laugh, sad, disgust, surprise, love, neutral. No explanation, no punctuation, just the single word."
        },
        {
            role: "user",
            content: `Classify the emotion of this message: "${(text || "").slice(0, 300)}"`
        }
    ];

    const VALID = ["anger", "laugh", "sad", "disgust", "surprise", "love", "neutral"];

    for (const entry of active) {
        try {
            // Use fastest model for reactions
            const raw = await _grokRequest(entry.key, messages, GROK_MODELS[0], 10, 0.3);
            const emotion = (raw || "").trim().toLowerCase().replace(/[^a-z]/g, "");
            if (VALID.includes(emotion)) {
                GrokKeys.touchByValue(entry.key);
                return emotion;
            }
        } catch (e) {
            if (_isGrokKeyDead(e)) {
                GrokKeys.setStatusByValue(entry.key, "dead");
                console.warn(`[GrokManager] Key #${entry.id} marked dead during emotion (${e.response?.status})`);
            }
            continue;
        }
    }
    return null;
}

// ── Ping a single Grok key ───────────────────────────────────────────────────
async function _pingGrokKey(keyValue) {
    for (const model of GROK_MODELS) {
        try {
            const res = await axios.post(
                `${GROK_BASE}/chat/completions`,
                {
                    model,
                    messages: [{ role: "user", content: "hi" }],
                    max_tokens: 5,
                },
                {
                    timeout: 9000,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${keyValue}`
                    }
                }
            );
            return res.status === 200;
        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) return false;
            if (e.response?.status === 429) return true; // rate limited but alive
            if (e.response?.status === 404) continue;
            return false;
        }
    }
    return false;
}

// ── Ping all Grok keys ───────────────────────────────────────────────────────
async function pingAllGrok() {
    _lastGrokPingAt = new Date();
    const all = GrokKeys.getAll();
    if (!all.length) return { active: 0, dead: 0 };
    const results = await Promise.all(all.map(async entry => {
        const alive = await _pingGrokKey(entry.key);
        GrokKeys.setStatusById(entry.id, alive ? "active" : "dead");
        return alive;
    }));
    _grokRotIdx = 0;
    const active = results.filter(Boolean).length;
    console.log(`[GrokManager] Ping done — ✅ ${active} active / ❌ ${results.length - active} dead`);
    return { active, dead: results.length - active };
}

// ── Start periodic Grok ping loop ────────────────────────────────────────────
function startGrokPingLoop() {
    if (_grokPingLoopStarted) return;
    _grokPingLoopStarted = true;
    const t1 = setTimeout(async () => {
        try { await pingAllGrok(); } catch (e) {}
        const t2 = setInterval(async () => {
            try { await pingAllGrok(); } catch (e) {}
        }, PING_INTERVAL_MS);
        if (t2 && typeof t2.unref === "function") t2.unref();
    }, 90 * 1000); // slightly offset from Gemini ping
    if (t1 && typeof t1.unref === "function") t1.unref();
}

// ── Round-robin Grok key ─────────────────────────────────────────────────────
function getNextGrokKey() {
    const active = GrokKeys.getActive();
    if (!active.length) return null;
    const entry = active[_grokRotIdx % active.length];
    _grokRotIdx = (_grokRotIdx + 1) % active.length;
    return entry.key;
}

// ── Next Grok sync time ──────────────────────────────────────────────────────
function getNextGrokSyncSeconds() {
    if (!_lastGrokPingAt) return Math.round(PING_INTERVAL_MS / 1000);
    return Math.max(0, Math.round((PING_INTERVAL_MS - (Date.now() - _lastGrokPingAt.getTime())) / 1000));
}

// ── Test a new Grok key ──────────────────────────────────────────────────────
async function testGrokKey(keyValue) {
    for (const model of GROK_MODELS) {
        try {
            const res = await axios.post(
                `${GROK_BASE}/chat/completions`,
                {
                    model,
                    messages: [{ role: "user", content: "hi" }],
                    max_tokens: 5,
                },
                {
                    timeout: 15000,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${keyValue}`
                    }
                }
            );
            if (res.status === 200) {
                return { ok: true, model };
            }
        } catch (e) {
            const status = e.response?.status;
            if (status === 401) {
                return { ok: false, model: null, errorCode: 401, errorMsg: "Invalid Grok API key" };
            }
            if (status === 403) {
                return { ok: false, model: null, errorCode: 403, errorMsg: "Permission denied — check your xAI account" };
            }
            if (status === 429) {
                return { ok: true, model, rateLimited: true };
            }
            if (status === 404) continue;
        }
    }
    return { ok: false, model: null, errorCode: 0, errorMsg: "All Grok models failed — key may be invalid or region restricted" };
}

startGrokPingLoop();

module.exports = {
    chatWithGrok,
    getEmotionWithGrok,
    pingAllGrok,
    startGrokPingLoop,
    getNextGrokKey,
    getNextGrokSyncSeconds,
    testGrokKey,
    GROK_MODELS,
};
