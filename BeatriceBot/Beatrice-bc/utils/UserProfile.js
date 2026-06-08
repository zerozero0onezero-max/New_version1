"use strict";
/**
 * utils/UserProfile.js — Per-user profile manager for Beatrice
 *
 * Stores per user:
 *   - name, gender (from Facebook API), birthday (from FB), age (asked directly)
 *   - personality: "dynamic" | "sarcastic" | "friendly"
 *   - msgCount, last 10 messages for classification, firstEncounter
 *
 * Auto-resets every hour: message context + personality class
 *   (user info — gender, birthday, age, name — is KEPT permanently)
 */

const fs   = require("fs");
const path = require("path");

const PROFILE_FILE = path.join(process.cwd(), "data", "user-profiles.json");
const HOUR_MS      = 60 * 60 * 1000;

const _store  = new Map(); // uid → profile
let   _loaded = false;

// ── Default profile ───────────────────────────────────────────────────────────
function _defaultProfile(uid) {
    return {
        uid,
        name:               null,
        gender:             null,        // "male" | "female" | null
        birthday:           null,        // "MM-DD"
        age:                null,
        ageAsked:           false,
        ageAskCount:        0,
        personality:        "dynamic",   // "dynamic" | "sarcastic" | "friendly"
        msgCount:           0,
        msgs:               [],          // last 10 msgs for classification
        firstEncounter:     true,
        firstSeen:          Date.now(),
        lastSeen:           Date.now(),
        lastContextReset:   Date.now(),
        birthdayWishedYear: null,
    };
}

// ── Persistence ───────────────────────────────────────────────────────────────
function _load() {
    if (_loaded) return;
    _loaded = true;
    try {
        if (fs.existsSync(PROFILE_FILE)) {
            const raw = JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8"));
            for (const [uid, p] of Object.entries(raw)) {
                _store.set(uid, { ..._defaultProfile(uid), ...p });
            }
            console.log(`[UserProfile] Loaded ${_store.size} profiles`);
        }
    } catch (e) {
        console.warn("[UserProfile] load error:", e.message);
    }
}

function _save() {
    try {
        const dir = path.dirname(PROFILE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const obj = {};
        for (const [uid, p] of _store) obj[uid] = p;
        fs.writeFileSync(PROFILE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
        console.warn("[UserProfile] save error:", e.message);
    }
}

// Auto-save every 30 s
const _saveT = setInterval(_save, 30000);
if (_saveT?.unref) _saveT.unref();

// Hourly context reset (clears msgs + re-classifies; keeps user data)
const _resetT = setInterval(() => {
    const now = Date.now();
    let n = 0;
    for (const [, p] of _store) {
        if (now - (p.lastContextReset || 0) >= HOUR_MS) {
            p.msgs             = [];
            p.lastContextReset = now;
            // Reset classification so it re-evaluates next 10 messages
            // but DON'T reset permanent "sarcastic" forced by rude behaviour
            if (p._rudeLocked) {
                // Keep sarcastic; just clear msgs
            } else {
                p.personality = "dynamic";
            }
            n++;
        }
    }
    if (n) console.log(`[UserProfile] Hourly reset: cleared context for ${n} users`);
}, 10 * 60 * 1000);
if (_resetT?.unref) _resetT.unref();

// ── Public API ────────────────────────────────────────────────────────────────
function get(uid) {
    _load();
    uid = String(uid);
    if (!_store.has(uid)) _store.set(uid, _defaultProfile(uid));
    return _store.get(uid);
}

function set(uid, updates) {
    const p = get(uid);
    Object.assign(p, updates);
    p.lastSeen = Date.now();
}

function addMessage(uid, role, text) {
    const p = get(uid);
    p.msgs.push({ role, text: (text || "").slice(0, 300) });
    while (p.msgs.length > 10) p.msgs.shift();
    if (role === "user") {
        p.msgCount = (p.msgCount || 0) + 1;
        p.lastSeen = Date.now();
    }
}

function getPersonality(uid) { return get(uid).personality || "dynamic"; }
function setPersonality(uid, personality, rudeLocked = false) {
    const p = get(uid);
    p.personality = personality;
    if (rudeLocked) p._rudeLocked = true;
}

/**
 * Returns "today" | "soon" | null
 */
function checkBirthday(uid) {
    const p = get(uid);
    if (!p.birthday) return null;
    const [mm, dd] = p.birthday.split("-").map(Number);
    if (!mm || !dd) return null;
    const now  = new Date();
    const nowM = now.getMonth() + 1;
    const nowD = now.getDate();
    if (nowM === mm && nowD === dd) return "today";
    const t1 = new Date(now); t1.setDate(t1.getDate() + 1);
    const t2 = new Date(now); t2.setDate(t2.getDate() + 2);
    if ((t1.getMonth() + 1 === mm && t1.getDate() === dd) ||
        (t2.getMonth() + 1 === mm && t2.getDate() === dd)) return "soon";
    return null;
}

/**
 * Update profile from api.getUserInfo() result
 * @param {string} uid
 * @param {object} fb - the fbData[uid] object
 */
function updateFromFBData(uid, fb) {
    if (!fb) return;
    const p = get(uid);
    p._fbFetched = true;

    if (fb.name && !p.name) p.name = fb.name;

    if (!p.gender) {
        const g = fb.gender;
        if (g === 2 || g === "MALE")   p.gender = "male";
        else if (g === 1 || g === "FEMALE") p.gender = "female";
    }

    // Birthday: Facebook may return "birthday" as "MM/DD/YYYY" or "MM/DD"
    if (fb.birthday && !p.birthday) {
        try {
            const m = String(fb.birthday).match(/(\d{1,2})[\/\-](\d{1,2})/);
            if (m) {
                p.birthday = `${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
            }
        } catch (_) {}
    }
}

module.exports = {
    get, set, addMessage,
    getPersonality, setPersonality,
    checkBirthday, updateFromFBData,
};
