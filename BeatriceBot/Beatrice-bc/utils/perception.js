"use strict";
/**
 * utils/perception.js — Media Perception Module
 *
 * Image chain:  Gemini (KeysManager) → Blackbox AI → HF vision models (smart rotation)
 * Audio chain:  Gemini (KeysManager) → Grok Whisper → HF Whisper (smart rotation)
 *
 * Smart routing:
 *   - Remembers last working model per type (image / audio)
 *   - Dead models auto-retry every 5 minutes
 */

const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const HF_BASE          = "https://router.huggingface.co/hf-inference/models";
const HF_RETRY_MS      = 5 * 60 * 1000;
const IMG_TIMEOUT      = 28000;
const AUDIO_TIMEOUT    = 40000;
const BLACKBOX_TIMEOUT = 18000;
const GROK_TIMEOUT     = 30000;

// ── HF vision models ──────────────────────────────────────────────────────────
const HF_IMAGE_MODELS = [
    { id: "Salesforce/blip-image-captioning-large",   label: "BLIP-large"    },
    { id: "nlpconnect/vit-gpt2-image-captioning",     label: "ViT-GPT2"      },
    { id: "microsoft/Phi-3-vision-128k-instruct",     label: "Phi-3-Vision"  },
];

// ── HF audio models ───────────────────────────────────────────────────────────
const HF_AUDIO_MODELS = [
    { id: "openai/whisper-large-v3", label: "Whisper-v3" },
];

// ── Smart state ───────────────────────────────────────────────────────────────
const _deadUntil = new Map(); // modelId → timestamp

function _isDead(id) {
    const t = _deadUntil.get(id);
    return !!t && Date.now() < t;
}
function _markDead(id) { _deadUntil.set(id, Date.now() + HF_RETRY_MS); }
function _markAlive(id) { _deadUntil.delete(id); }

let _lastGoodImage = null;
let _lastGoodAudio = null;

// Periodic retry: clear dead flags
const _retryT = setInterval(() => {
    const now = Date.now();
    for (const [id, until] of _deadUntil) {
        if (now >= until) _deadUntil.delete(id);
    }
}, HF_RETRY_MS);
if (_retryT && typeof _retryT.unref === "function") _retryT.unref();

// ── Key helpers ───────────────────────────────────────────────────────────────
function getHFKey() {
    try {
        const HFKey = require(path.join(process.cwd(), "utils", "HFKey.js"));
        return HFKey.get() || "";
    } catch (_) { return ""; }
}

function hfHeaders() {
    const k = getHFKey();
    return k ? { Authorization: `Bearer ${k}` } : {};
}

function getCfgKeys() {
    try {
        const cfg = global.BeatriceBC && (global.BeatriceBC.ncsetting || global.BeatriceBC.config);
        return (cfg && cfg.apiKeys) ? cfg.apiKeys : {};
    } catch (_) { return {}; }
}

function getGrokKey() {
    try {
        const GrokKeys = require(path.join(process.cwd(), "utils", "GrokKeys.js"));
        const active = GrokKeys.getActive();
        return active.length > 0 ? active[0].key : "";
    } catch (_) { return ""; }
}

let _km;
function getKM() {
    if (!_km) _km = require(path.join(process.cwd(), "utils", "KeysManager.js"));
    return _km;
}

// ── Image: Blackbox AI (deepseek-v3) ─────────────────────────────────────────
async function _blackboxDescribeImage(imageBuffer, contentType) {
    const cfgKey = getCfgKeys().blackboxAI || "";
    const apiKey = process.env.BLACKBOX_API_KEY || cfgKey;
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    try {
        const base64 = imageBuffer.toString("base64");
        const res = await axios.post(
            "https://api.blackbox.ai/v1/chat/completions",
            {
                model: "deepseek-v3",
                messages: [{
                    role: "user",
                    content: [
                        { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } },
                        { type: "text", text: "Describe this image in one clear concise sentence." }
                    ]
                }],
                max_tokens: 150,
            },
            { timeout: BLACKBOX_TIMEOUT, headers }
        );
        const text = (res.data?.choices?.[0]?.message?.content || "").trim();
        if (text) { console.log("[perception] Blackbox image OK"); return text; }
    } catch (e) {
        console.warn("[perception/Blackbox image] failed:", (e.message || "").slice(0, 60));
    }
    return null;
}

// ── Image: HF vision model ───────────────────────────────────────────────────
async function _hfDescribeImage(modelId, label, imageBuffer, contentType) {
    if (_isDead(modelId)) { console.log(`[perception] HF ${label} skipped (dead)`); return null; }
    try {
        let res;
        if (modelId.includes("Phi-3-vision")) {
            // Phi-3 vision uses a different input format (multimodal chat)
            const base64 = imageBuffer.toString("base64");
            res = await axios.post(
                `${HF_BASE}/${modelId}`,
                {
                    inputs: {
                        messages: [{
                            role: "user",
                            content: [
                                { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } },
                                { type: "text", text: "Describe this image in one sentence." }
                            ]
                        }]
                    }
                },
                { timeout: IMG_TIMEOUT, headers: { "Content-Type": "application/json", ...hfHeaders() }, maxBodyLength: Infinity }
            );
        } else {
            // BLIP / ViT-GPT2 use raw image bytes
            res = await axios.post(
                `${HF_BASE}/${modelId}`,
                imageBuffer,
                {
                    timeout: IMG_TIMEOUT,
                    headers: { "Content-Type": contentType, ...hfHeaders() },
                    maxBodyLength: Infinity,
                }
            );
        }

        const caption =
            res.data?.[0]?.generated_text ||
            res.data?.generated_text ||
            (typeof res.data === "string" ? res.data : null);

        if (caption && caption.trim()) {
            _markAlive(modelId);
            _lastGoodImage = modelId;
            console.log(`[perception] HF ${label} OK`);
            return caption.trim();
        }
    } catch (e) {
        const status = e.response?.status;
        if (status === 503) {
            console.log(`[perception] HF ${label}: loading (503)`);
        } else {
            console.warn(`[perception] HF ${label} failed (${status || e.message?.slice(0, 40)})`);
        }
        _markDead(modelId);
    }
    return null;
}

// ── Image description (full chain) ───────────────────────────────────────────
async function describeImage(imageUrl) {
    let imgBuffer = null;
    let contentType = "image/jpeg";

    try {
        const res = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
        imgBuffer = Buffer.from(res.data);
        contentType = res.headers["content-type"] || "image/jpeg";
    } catch (e) {
        console.warn("[perception] Image download failed:", e.message);
        return null;
    }

    // 1. Gemini Vision
    try {
        const km = getKM();
        const caption = await km.describeImageWithGemini(imgBuffer, contentType);
        if (caption) { imgBuffer = null; return caption; }
    } catch (e) {
        console.warn("[perception/Gemini vision] failed:", e.message);
    }

    // 2. Blackbox AI
    const bbCaption = await _blackboxDescribeImage(imgBuffer, contentType);
    if (bbCaption) { imgBuffer = null; return bbCaption; }

    // 3. HuggingFace vision models (smart order)
    const imgModels = [...HF_IMAGE_MODELS].sort((a, b) => {
        if (a.id === _lastGoodImage) return -1;
        if (b.id === _lastGoodImage) return 1;
        return 0;
    });

    for (const model of imgModels) {
        const text = await _hfDescribeImage(model.id, model.label, imgBuffer, contentType);
        if (text) { imgBuffer = null; return text; }
    }
    // Sweep ignoring dead flags
    for (const model of imgModels) {
        if (!_isDead(model.id)) continue;
        const text = await _hfDescribeImage(model.id, model.label, imgBuffer, contentType);
        if (text) { imgBuffer = null; return text; }
    }

    imgBuffer = null;
    return null;
}

// ── Audio: Grok Whisper ───────────────────────────────────────────────────────
async function _grokWhisper(audioBuffer, contentType) {
    const grokKey = getGrokKey();
    if (!grokKey) return null;

    try {
        const form = new FormData();
        const ext = contentType.includes("ogg") ? "ogg"
            : contentType.includes("mp4") ? "mp4"
            : contentType.includes("mpeg") ? "mp3"
            : contentType.includes("wav") ? "wav"
            : "ogg";
        form.append("file", audioBuffer, { filename: `audio.${ext}`, contentType });
        form.append("model", "whisper-large-v3");
        form.append("response_format", "json");

        const res = await axios.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            form,
            {
                timeout: GROK_TIMEOUT,
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${grokKey}`,
                },
                maxBodyLength: Infinity,
            }
        );
        const text = res.data?.text || "";
        if (text.trim()) {
            console.log("[perception] Grok Whisper OK");
            return text.trim();
        }
    } catch (e) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
            console.warn("[perception/Grok Whisper] auth error");
        } else {
            console.warn("[perception/Grok Whisper] failed:", (e.message || "").slice(0, 60));
        }
    }
    return null;
}

// ── Audio: HF Whisper ─────────────────────────────────────────────────────────
async function _hfTranscribe(modelId, label, audioBuffer, contentType) {
    if (_isDead(modelId)) { console.log(`[perception] HF ${label} skipped (dead)`); return null; }
    try {
        const form = new FormData();
        form.append("file", audioBuffer, { filename: "audio.ogg", contentType });
        const res = await axios.post(
            `${HF_BASE}/${modelId}`,
            form,
            {
                timeout: AUDIO_TIMEOUT,
                headers: { ...form.getHeaders(), ...hfHeaders() },
                maxBodyLength: Infinity,
            }
        );
        const text = res.data?.text || res.data?.[0]?.text || (typeof res.data === "string" ? res.data : null);
        if (text && text.trim()) {
            _markAlive(modelId);
            _lastGoodAudio = modelId;
            console.log(`[perception] HF ${label} OK`);
            return text.trim();
        }
    } catch (e) {
        const status = e.response?.status;
        console.warn(`[perception] HF ${label} failed (${status || e.message?.slice(0, 40)})`);
        _markDead(modelId);
    }
    return null;
}

// ── Audio transcription (full chain) ─────────────────────────────────────────
async function transcribeAudio(audioUrl) {
    let audioBuffer = null;
    let contentType = "audio/ogg";

    try {
        const res = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 30000 });
        audioBuffer = Buffer.from(res.data);
        contentType = res.headers["content-type"] || "audio/ogg";
    } catch (e) {
        console.warn("[perception] Audio download failed:", e.message);
        return null;
    }

    // 1. Gemini Audio
    try {
        const km = getKM();
        const text = await km.transcribeAudioWithGemini(audioBuffer, contentType);
        if (text) { audioBuffer = null; return text; }
    } catch (e) {
        console.warn("[perception/Gemini audio] failed:", e.message);
    }

    // 2. Grok Whisper (api.groq.com)
    const grokText = await _grokWhisper(audioBuffer, contentType);
    if (grokText) { audioBuffer = null; return grokText; }

    // 3. HuggingFace Whisper (smart order)
    const audioModels = [...HF_AUDIO_MODELS].sort((a, b) => {
        if (a.id === _lastGoodAudio) return -1;
        if (b.id === _lastGoodAudio) return 1;
        return 0;
    });

    for (const model of audioModels) {
        const text = await _hfTranscribe(model.id, model.label, audioBuffer, contentType);
        if (text) { audioBuffer = null; return text; }
    }
    // Sweep ignoring dead flags
    for (const model of audioModels) {
        if (!_isDead(model.id)) continue;
        const text = await _hfTranscribe(model.id, model.label, audioBuffer, contentType);
        if (text) { audioBuffer = null; return text; }
    }

    audioBuffer = null;
    return null;
}

// ── Attachment helpers ─────────────────────────────────────────────────────────
function getAudioAttachment(event) {
    const attachments = [
        ...(event.attachments || []),
        ...(event.messageReply?.attachments || [])
    ];
    return attachments.find(a => a.type === "audio" || a.type === "voice") || null;
}

function getImageAttachment(event) {
    const attachments = [
        ...(event.messageReply?.attachments || []),
        ...(event.attachments || [])
    ];
    return attachments.find(a => ["photo", "sticker", "animated_image"].includes(a.type)) || null;
}

function isBotTargeted(api, event) {
    try {
        const botID = String(api.getCurrentUserID());
        if (event.mentions && Object.prototype.hasOwnProperty.call(event.mentions, botID)) return true;
        const replyID = event.messageReply?.senderID || event.messageReply?.userID;
        if (replyID && String(replyID) === botID) return true;
        return false;
    } catch (e) { return false; }
}

module.exports = {
    describeImage, transcribeAudio,
    getAudioAttachment, getImageAttachment, isBotTargeted,
};
