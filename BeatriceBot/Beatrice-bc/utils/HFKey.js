"use strict";
/**
 * utils/HFKey.js — HuggingFace API Token Store
 *
 * Single token stored in data/hf-key.json
 * Priority: process.env.HUGGINGFACE_API_KEY → data/hf-key.json → config.json apiKeys.huggingFace
 */

const fs = require("fs");
const path = require("path");

const HF_KEY_FILE = path.join(process.cwd(), "data", "hf-key.json");

function _ensureDir() {
    const dir = path.dirname(HF_KEY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
    try {
        _ensureDir();
        if (fs.existsSync(HF_KEY_FILE)) {
            const data = JSON.parse(fs.readFileSync(HF_KEY_FILE, "utf-8"));
            return data.token || "";
        }
    } catch (e) {}
    return "";
}

function _save(token) {
    try {
        _ensureDir();
        fs.writeFileSync(
            HF_KEY_FILE,
            JSON.stringify({ token, updatedAt: new Date().toISOString() }, null, 2),
            "utf-8"
        );
    } catch (e) {
        console.error("[HFKey] save error:", e.message);
    }
}

/** Get active HF token from any source */
function get() {
    if (process.env.HUGGINGFACE_API_KEY) return process.env.HUGGINGFACE_API_KEY;
    const stored = load();
    if (stored) return stored;
    try {
        const cfg = global.BeatriceBC && (global.BeatriceBC.ncsetting || global.BeatriceBC.config);
        return (cfg && cfg.apiKeys && cfg.apiKeys.huggingFace) || "";
    } catch (_) { return ""; }
}

/** Set / update the HF token */
function set(token) {
    _save(token);
    // Also sync to config.json so it persists across restarts
    try {
        const cfgPath = path.join(process.cwd(), "config.json");
        if (fs.existsSync(cfgPath)) {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
            if (!cfg.apiKeys) cfg.apiKeys = {};
            cfg.apiKeys.huggingFace = token;
            fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), "utf-8");
        }
    } catch (e) {}
}

/** Returns true if a token is available */
function hasKey() { return !!get(); }

module.exports = { get, set, hasKey, HF_KEY_FILE };
