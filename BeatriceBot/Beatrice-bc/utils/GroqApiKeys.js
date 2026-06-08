"use strict";
/**
 * utils/GroqApiKeys.js — Storage for Groq inference-platform API keys (gsk_…)
 *
 * Groq (console.groq.com) is different from Grok (xAI).
 * Keys always start with "gsk_".
 * Data stored in: data/groq-api-keys.json
 */

const fs   = require("fs");
const path = require("path");

const GROQ_KEYS_FILE = path.join(process.cwd(), "data", "groq-api-keys.json");
const MAX_KEYS       = 20;

function _ensureDir() {
    const dir = path.dirname(GROQ_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
    try {
        _ensureDir();
        if (fs.existsSync(GROQ_KEYS_FILE))
            return JSON.parse(fs.readFileSync(GROQ_KEYS_FILE, "utf-8"));
    } catch (e) { console.error("[GroqApiKeys] load error:", e.message); }
    return [];
}

function save(keys) {
    try {
        _ensureDir();
        fs.writeFileSync(GROQ_KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
    } catch (e) { console.error("[GroqApiKeys] save error:", e.message); }
}

function getAll()    { return load(); }
function getActive() { return load().filter(k => k.status === "active").sort((a, b) => a.id - b.id); }

function add(keyValue) {
    if (!keyValue || !String(keyValue).startsWith("gsk_"))
        return { ok: false, msg: "Groq keys must start with gsk_  — get one at https://console.groq.com" };
    const keys = load();
    if (keys.length >= MAX_KEYS) return { ok: false, msg: `Max ${MAX_KEYS} Groq keys allowed` };
    if (keys.find(k => k.key === keyValue)) return { ok: false, msg: "Key already exists" };
    const id = keys.length ? Math.max(...keys.map(k => k.id)) + 1 : 1;
    keys.push({ id, key: keyValue, status: "active", addedDate: Date.now(), lastUsed: null });
    save(keys);
    return { ok: true, id };
}

function remove(id) {
    const keys = load();
    const idx  = keys.findIndex(k => k.id === id);
    if (idx === -1) return false;
    keys.splice(idx, 1);
    save(keys);
    return true;
}

function setStatusByValue(keyValue, status) {
    const keys = load();
    const k    = keys.find(e => e.key === keyValue);
    if (!k) return;
    k.status = status;
    save(keys);
}

function touchByValue(keyValue) {
    const keys = load();
    const k    = keys.find(e => e.key === keyValue);
    if (!k) return;
    k.lastUsed = Date.now();
    save(keys);
}

module.exports = { getAll, getActive, add, remove, setStatusByValue, touchByValue, MAX_KEYS };
