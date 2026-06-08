"use strict";
/**
 * utils/GrokKeys.js — Grok (xAI) API Key Store
 *
 * Persistent JSON database for managing Grok API keys.
 * Stored at: <cwd>/data/grok-keys.json
 *
 * Each entry: { id, key, status ("active"|"dead"), addedDate, lastUsed }
 * Max 20 keys.
 */

const fs = require("fs");
const path = require("path");

const GROK_KEYS_FILE = path.join(process.cwd(), "data", "grok-keys.json");
const MAX_GROK_KEYS = 20;

function _ensureDir() {
    const dir = path.dirname(GROK_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
    try {
        _ensureDir();
        if (fs.existsSync(GROK_KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(GROK_KEYS_FILE, "utf-8"));
        }
    } catch (e) {
        console.error("[GrokKeys] load error:", e.message);
    }
    return [];
}

function save(keys) {
    try {
        _ensureDir();
        fs.writeFileSync(GROK_KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
    } catch (e) {
        console.error("[GrokKeys] save error:", e.message);
    }
}

function getAll() { return load(); }

function getActive() {
    return load()
        .filter(k => k.status === "active")
        .sort((a, b) => a.id - b.id);
}

function add(keyValue) {
    const keys = load();
    if (keys.length >= MAX_GROK_KEYS) throw new Error(`Max ${MAX_GROK_KEYS} Grok keys reached`);
    if (keys.find(k => k.key === keyValue)) throw new Error("Grok key already exists");
    const id = keys.length > 0 ? Math.max(...keys.map(k => k.id)) + 1 : 1;
    const entry = {
        id,
        key: keyValue,
        status: "active",
        addedDate: new Date().toISOString(),
        lastUsed: null
    };
    keys.push(entry);
    save(keys);
    return entry;
}

function remove(id) {
    const keys = load();
    const idx = keys.findIndex(k => k.id === Number(id));
    if (idx === -1) return null;
    const [removed] = keys.splice(idx, 1);
    save(keys);
    return removed;
}

function getById(id) {
    return load().find(k => k.id === Number(id)) || null;
}

function setStatusByValue(keyValue, status) {
    const keys = load();
    const k = keys.find(e => e.key === keyValue);
    if (!k) return;
    k.status = status;
    save(keys);
}

function setStatusById(id, status) {
    const keys = load();
    const k = keys.find(e => e.id === Number(id));
    if (!k) return;
    k.status = status;
    save(keys);
}

function touchByValue(keyValue) {
    const keys = load();
    const k = keys.find(e => e.key === keyValue);
    if (!k) return;
    k.lastUsed = new Date().toISOString();
    save(keys);
}

module.exports = {
    getAll, getActive, add, remove, getById,
    setStatusByValue, setStatusById, touchByValue,
    MAX_GROK_KEYS, GROK_KEYS_FILE
};
