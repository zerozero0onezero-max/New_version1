"use strict";
/**
 * utils/Keys.js — Gemini API Key Store
 *
 * Persistent JSON database for managing Gemini API keys.
 * Stored at: <cwd>/data/gemini-keys.json
 *
 * Each entry: { id, key, status ("active"|"dead"), addedDate, lastUsed }
 * Max 150 keys.
 */

const fs = require("fs");
const path = require("path");

const KEYS_FILE = path.join(process.cwd(), "data", "gemini-keys.json");
const MAX_KEYS = 150;

function _ensureDir() {
    const dir = path.dirname(KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
    try {
        _ensureDir();
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
        }
    } catch (e) {
        console.error("[Keys] load error:", e.message);
    }
    return [];
}

function save(keys) {
    try {
        _ensureDir();
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
    } catch (e) {
        console.error("[Keys] save error:", e.message);
    }
}

/** Return all keys */
function getAll() { return load(); }

/** Return only active keys, sorted by id ascending */
function getActive() {
    return load()
        .filter(k => k.status === "active")
        .sort((a, b) => a.id - b.id);
}

/** Add a new key. Throws if duplicate or max reached. */
function add(keyValue) {
    const keys = load();
    if (keys.length >= MAX_KEYS) throw new Error(`Max ${MAX_KEYS} keys reached`);
    if (keys.find(k => k.key === keyValue)) throw new Error("Key already exists");
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

/** Remove a key by its serial id. Returns the removed entry or null. */
function remove(id) {
    const keys = load();
    const idx = keys.findIndex(k => k.id === Number(id));
    if (idx === -1) return null;
    const [removed] = keys.splice(idx, 1);
    save(keys);
    return removed;
}

/** Get a single key by serial id. */
function getById(id) {
    return load().find(k => k.id === Number(id)) || null;
}

/** Update status of a key by its value. */
function setStatusByValue(keyValue, status) {
    const keys = load();
    const k = keys.find(e => e.key === keyValue);
    if (!k) return;
    k.status = status;
    save(keys);
}

/** Update status of a key by its id. */
function setStatusById(id, status) {
    const keys = load();
    const k = keys.find(e => e.id === Number(id));
    if (!k) return;
    k.status = status;
    save(keys);
}

/** Mark a key as last-used now (by value). */
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
    MAX_KEYS, KEYS_FILE
};
