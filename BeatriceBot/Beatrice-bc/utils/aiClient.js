"use strict";
/**
 * utils/aiClient.js — Multi-provider AI fallback chain (TEXT only)
 *
 * Chain order for text messages (used when Gemini + Grok both fail):
 *   1. Blackbox AI  (deepseek-v3 — free or keyed)
 *   2. HuggingFace models — smart rotation:
 *        • meta-llama/Meta-Llama-3-8B-Instruct  (smartest)
 *        • mistralai/Mistral-7B-v0.3             (fastest)
 *        • microsoft/Phi-3-mini-4k-instruct      (lightest)
 *
 * Smart routing:
 *   - Remembers the last model that worked → tries it first next time
 *   - Dead models are retried every HF_RETRY_MS (5 min) automatically
 *   - Each call tries ALL models in smart order before giving up
 */

const axios = require("axios");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const TIMEOUT_BLACKBOX = 14000;
const TIMEOUT_HF       = 30000;
const HF_RETRY_MS      = 5 * 60 * 1000; // 5 minutes
const HF_BASE          = "https://api-inference.huggingface.co/models";

// ── HF models with prompt-format helpers ─────────────────────────────────────
const HF_MODELS = [
    {
        id: "meta-llama/Meta-Llama-3-8B-Instruct",
        label: "Llama-3-8B",
        buildPrompt(system, history, user) {
            let p = "<|begin_of_text|>";
            if (system) p += `<|start_header_id|>system<|end_header_id|>\n${system}<|eot_id|>`;
            for (const h of history) {
                const role = h.role === "assistant" ? "assistant" : "user";
                p += `<|start_header_id|>${role}<|end_header_id|>\n${h.content}<|eot_id|>`;
            }
            p += `<|start_header_id|>user<|end_header_id|>\n${user}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;
            return p;
        },
    },
    {
        id: "mistralai/Mistral-7B-v0.3",
        label: "Mistral-7B",
        buildPrompt(system, history, user) {
            const systemPart = system ? `${system}\n\n` : "";
            let conv = "";
            for (const h of history) {
                if (h.role === "user")      conv += `[INST] ${h.content} [/INST] `;
                else                        conv += `${h.content} `;
            }
            return `${conv}[INST] ${systemPart}${user} [/INST]`;
        },
    },
    {
        id: "microsoft/Phi-3-mini-4k-instruct",
        label: "Phi-3-mini",
        buildPrompt(system, history, user) {
            let p = "";
            if (system) p += `<|system|>\n${system}<|end|>\n`;
            for (const h of history) {
                const role = h.role === "assistant" ? "assistant" : "user";
                p += `<|${role}|>\n${h.content}<|end|>\n`;
            }
            p += `<|user|>\n${user}<|end|>\n<|assistant|>\n`;
            return p;
        },
    },
];

// ── Smart model state ─────────────────────────────────────────────────────────
// Tracks which HF models are working and which failed
const _hfState = new Map(); // modelId → { lastFail: timestamp|null, lastSuccess: timestamp|null }

function _getState(modelId) {
    if (!_hfState.has(modelId)) _hfState.set(modelId, { lastFail: null, lastSuccess: null });
    return _hfState.get(modelId);
}

function _markSuccess(modelId) {
    const s = _getState(modelId);
    s.lastFail = null;
    s.lastSuccess = Date.now();
}

function _markFail(modelId) {
    _getState(modelId).lastFail = Date.now();
}

function _isDeadNow(modelId) {
    const s = _getState(modelId);
    if (!s.lastFail) return false;
    return (Date.now() - s.lastFail) < HF_RETRY_MS;
}

// ID of last HF model that succeeded
let _lastGoodHF = null;

// ── Periodic retry loop ───────────────────────────────────────────────────────
// Every 5 min: clear dead flags so models get a fresh chance
function _startRetryLoop() {
    const t = setInterval(() => {
        let cleared = 0;
        for (const [id, state] of _hfState) {
            if (state.lastFail && (Date.now() - state.lastFail) >= HF_RETRY_MS) {
                state.lastFail = null;
                cleared++;
            }
        }
        if (cleared) console.log(`[aiClient] Cleared ${cleared} dead HF model flags (retry window expired)`);
    }, HF_RETRY_MS);
    if (t && typeof t.unref === "function") t.unref();
}
_startRetryLoop();

// ── Helpers ───────────────────────────────────────────────────────────────────
function getHFKey() {
    try {
        const HFKey = require(path.join(process.cwd(), "utils", "HFKey.js"));
        return HFKey.get() || "";
    } catch (_) { return ""; }
}

function getCfgKeys() {
    try {
        const cfg = global.BeatriceBC && (global.BeatriceBC.ncsetting || global.BeatriceBC.config);
        return (cfg && cfg.apiKeys) ? cfg.apiKeys : {};
    } catch (_) { return {}; }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 1. Blackbox AI ────────────────────────────────────────────────────────────
async function _tryBlackbox(messages) {
    const cfgKey = getCfgKeys().blackboxAI || "";
    const envKey = process.env.BLACKBOX_API_KEY || "";
    const apiKey = envKey || cfgKey;

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    try {
        const res = await axios.post(
            "https://api.blackbox.ai/v1/chat/completions",
            {
                model: "deepseek-v3",
                messages,
                max_tokens: 1024,
                temperature: 0.85,
            },
            { timeout: TIMEOUT_BLACKBOX, headers }
        );
        const text = (res.data?.choices?.[0]?.message?.content || "").trim();
        if (text) {
            console.log("[aiClient] Blackbox (deepseek-v3) OK");
            return text;
        }
    } catch (e) {
        console.warn("[aiClient] Blackbox failed:", (e.message || "").slice(0, 80));
    }
    return null;
}

// ── 2. Single HF model request ────────────────────────────────────────────────
async function _tryHFModel(model, system, history, user) {
    const hfKey = getHFKey();
    const headers = { "Content-Type": "application/json" };
    if (hfKey) headers["Authorization"] = `Bearer ${hfKey}`;

    const prompt = model.buildPrompt(system || "", history || [], user);

    try {
        const res = await axios.post(
            `${HF_BASE}/${model.id}`,
            {
                inputs: prompt,
                parameters: {
                    max_new_tokens: 512,
                    temperature: 0.85,
                    return_full_text: false,
                    do_sample: true,
                },
            },
            { timeout: TIMEOUT_HF, headers }
        );

        const status = res.status;
        if (status === 503) {
            // Model loading — temporary, count as soft fail
            _markFail(model.id);
            return null;
        }

        // Response is array or string
        let text = "";
        if (Array.isArray(res.data) && res.data[0]?.generated_text) {
            text = res.data[0].generated_text.trim();
        } else if (typeof res.data === "string") {
            text = res.data.trim();
        } else if (res.data?.generated_text) {
            text = res.data.generated_text.trim();
        }

        // Strip prompt echo if present
        if (text.startsWith(prompt)) text = text.slice(prompt.length).trim();

        if (text) {
            _markSuccess(model.id);
            _lastGoodHF = model.id;
            console.log(`[aiClient] HF ${model.label} OK`);
            return text;
        }
    } catch (e) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
            console.warn(`[aiClient] HF ${model.label}: auth error — check HF token`);
        } else if (status === 503) {
            console.log(`[aiClient] HF ${model.label}: model loading (503) — will retry in ${HF_RETRY_MS / 60000}min`);
        } else {
            console.warn(`[aiClient] HF ${model.label} failed (${status || e.message?.slice(0, 40)})`);
        }
        _markFail(model.id);
    }
    return null;
}

// ── 2a. HF with smart ordering ────────────────────────────────────────────────
async function _tryHF(system, history, user) {
    // Build model order: last successful first, then rest, skip recently dead
    const order = [...HF_MODELS].sort((a, b) => {
        // Promote last good model to front
        if (a.id === _lastGoodHF) return -1;
        if (b.id === _lastGoodHF) return 1;
        return 0;
    });

    for (const model of order) {
        if (_isDeadNow(model.id)) {
            console.log(`[aiClient] HF ${model.label} skipped (dead, retry in ${HF_RETRY_MS / 60000}min)`);
            continue;
        }
        const text = await _tryHFModel(model, system, history, user);
        if (text) return text;
        await _sleep(300);
    }

    // Last resort: try ALL models ignoring dead flags (full fallback sweep)
    for (const model of order) {
        if (!_isDeadNow(model.id)) continue; // already tried above
        const text = await _tryHFModel(model, system, history, user);
        if (text) return text;
    }

    return null;
}

// ── 1.5. Groq inference platform (gsk_ keys) ──────────────────────────────────
const GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
];
async function _tryGroq(messages) {
    try {
        const GroqApiKeys = require(path.join(process.cwd(), "utils", "GroqApiKeys.js"));
        const active = GroqApiKeys.getActive();
        if (!active.length) return null;

        for (const entry of active) {
            for (const model of GROQ_MODELS) {
                try {
                    const res = await axios.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        { model, messages, max_tokens: 1024, temperature: 0.85 },
                        {
                            timeout: 12000,
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${entry.key}`,
                            },
                        }
                    );
                    const text = (res.data?.choices?.[0]?.message?.content || "").trim();
                    if (text) {
                        GroqApiKeys.touchByValue(entry.key);
                        console.log(`[aiClient] Groq (${model}) OK`);
                        return text;
                    }
                } catch (e) {
                    const status = e.response?.status;
                    if (status === 401 || status === 403) {
                        GroqApiKeys.setStatusByValue(entry.key, "dead");
                        console.warn(`[aiClient] Groq key #${entry.id} auth error — marked dead`);
                        break; // try next key
                    }
                    if (status === 429) {
                        console.warn(`[aiClient] Groq (${model}) rate-limited — trying next model`);
                        continue;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("[aiClient] Groq provider error:", (e.message || "").slice(0, 60));
    }
    return null;
}

// ── Main chat function ─────────────────────────────────────────────────────────
/**
 * @param {string} prompt     - User message
 * @param {string} [system]   - System instruction
 * @param {Array}  [history]  - [{role, content}]
 * @returns {Promise<string>}
 */
async function chat(prompt, system = "", history = []) {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    for (const h of history) messages.push(h);
    messages.push({ role: "user", content: prompt });

    // 1. Blackbox AI (deepseek-v3)
    const bbText = await _tryBlackbox(messages);
    if (bbText) return bbText;

    // 1.5. Groq inference platform (llama-3.3-70b / llama-3.1-8b / mixtral)
    const groqText = await _tryGroq(messages);
    if (groqText) return groqText;

    // 2. HuggingFace models (smart rotation)
    const hfText = await _tryHF(system, history, prompt);
    if (hfText) return hfText;

    throw new Error(
        "All AI backends failed — add API keys via .keyadd (Gemini), .grokadd (Grok), .groqadd (Groq), or .hfkeyadd (HuggingFace)"
    );
}

async function ask(question, system = "") {
    return chat(question, system, []);
}

module.exports = { chat, ask };
