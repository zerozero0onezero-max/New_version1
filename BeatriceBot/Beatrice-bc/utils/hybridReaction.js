"use strict";
/**
 * utils/hybridReaction.js — Dual AI Emoji Reaction Engine v2.0
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  System 1 — Background / General (Group Context)                │
 * │  • Fires for EVERY message in a group (fire-and-forget)         │
 * │  • Buffers last 10 messages per thread                          │
 * │  • Every 10 msgs (or 5 min), asks aiClient (Blackbox/HF/Groq)  │
 * │    which messages deserve reactions and what emoji              │
 * │  • NOT personality-influenced — neutral observer                │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  System 2 — Direct Chat (Bot-Targeted Messages)                 │
 * │  • 70% reaction rate on messages directed at the bot            │
 * │  • Uses Grok → Gemini for fast emotion classification           │
 * │  • Reads UserProfile for personality-aware emoji choice         │
 * │  • Detects hidden insults/sarcasm → overrides System 1's emoji  │
 * │  • Setting reaction again auto-replaces System 1's reaction     │
 * └─────────────────────────────────────────────────────────────────┘
 */

const path = require("path");

// ── Emoji palette ──────────────────────────────────────────────────────────────
const EMOJI_MAP = {
    anger:    ["👺", "👿", "😾", "😡", "🤬", "💢"],
    laugh:    ["😆", "😂", "😹", "🤣", "💀", "😭💀"],
    sad:      ["😥", "😭", "😢", "😦", "😵", "🫂"],
    disgust:  ["😖", "🤢", "🤮", "🦧", "😤", "💀"],
    surprise: ["🫣", "😶", "😮", "😲", "😳", "👁️"],
    love:     ["🥰", "😻", "💕", "😊", "✨", "🫶"],
    neutral:  ["👽", "😐", "🙃", "🙄", "🙂", "🫠", "🤓", "💤"],
    cold:     ["😐", "🙄", "💀", "😾", "👁️", "🤡", "😑"],
    sarcastic:["💀", "😭", "🙄", "😏", "👀", "💅", "🤨"],
    warm:     ["💖", "🥰", "😍", "✨", "💕", "🫶", "😘"],
};

const VALID_EMOTIONS = ["anger", "laugh", "sad", "disgust", "surprise", "love", "neutral"];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Reaction dedup tracker (per msgID, 5-min TTL) ─────────────────────────────
const _reacted = new Map();
function _alreadyReacted(msgID) { return _reacted.has(msgID); }
function _markReacted(msgID) {
    _reacted.set(msgID, 1);
    setTimeout(() => _reacted.delete(msgID), 5 * 60 * 1000);
}

// ── Quick emotion screen ──────────────────────────────────────────────────────
function quickEmotionScreen(text) {
    const t = (text || "").toLowerCase();

    if (/stupid|dumb|idiot|shut up|shut ur|ugly|useless|annoying|worthless|garbage|trash|i hate|f(u|uck) (you|u)|b+itch|beach|wtf|kys|die|kill yourself|go to hell|i'?m (mad|angry|furious)|يلعن|كلب|حمار|غبي|اخرس|مجنون/.test(t))
        return "anger";
    if (/love (you|u|ya|her)|miss (you|u|ya)|you'?re (great|amazing|cute|pretty|beautiful|sweet|the best|awesome)|good (girl|job)|i like you|you'?re (nice|so (sweet|kind|cool))|appreciate you|بحبك|حبيبي|احبك|ماشاءالله عليك/.test(t))
        return "love";
    if (/\bcry(ing)?\b|i'?m sad|so sad|depress(ed)?|heart(broken|break)|i'?m (hurt|broken|lost)|feel(ing)? (bad|terrible|awful|empty)|alone|lonely|miss you|حزين|زعلان|وحيد|مكسور/.test(t))
        return "sad";
    if (/gross|ew+|disgusting|nasty|that'?s sick|vomit|puke|revolting|so (bad|trash|garbage|cringe)|yikes|ewww|قرف|مقرف|يييه/.test(t))
        return "disgust";
    if (/no way|what the (f|h)|omg|oh my (god|lord|gosh)|are you (serious|kidding)|unbelievable|can't believe|wait what|bro what|\?!!|shocked|استنى|ما صدقت|مستحيل|جدي|صراحة/.test(t))
        return "surprise";
    if (/lmao|lmfao|hahah+|heheh+|hilarious|you'?re (funny|a joke|clown|so dumb)|i'?m dead|💀{2,}|😂{2,}|😭{2,}|that'?s (funny|hilarious)|كسرتني|هههه+|خخخ+/.test(t))
        return "laugh";
    const strongEmojis = (text.match(/[😡🤬😾👿👺😭😢😥😵🤣😂😆😹🥰😻💕🫣😮😲😳🤢🤮💀]/gu) || []);
    if (strongEmojis.length >= 2) return "neutral";
    if (Math.random() < 0.25) return "neutral";
    return null;
}

// ── Hidden-meaning / insult detectors (System 2 override) ────────────────────
const HIDDEN_INSULT_RE = /بوت\b.*ههه|ههه.*بوت\b|lol{3,}|you('?re)? (so )?(dumb|stupid|useless|cringe)|مو شي|ضحكتني|عبيط|مضحك عليك|انت بوت بس|هههه{4,}/i;
const SARCASM_RE       = /يا سلام|لا مو هيك|اكيد|طبعاً!+|sure sure|yeah right|oh wow|كأنك تعرف/i;

// ── AI emotion classifier: Grok → Gemini → hint ──────────────────────────────
async function classifyEmotionAI(text, hintEmotion) {
    const truncated = (text || "").slice(0, 300);

    try {
        const GrokManager = require(path.join(process.cwd(), "utils", "GrokManager.js"));
        const activeGrok  = require(path.join(process.cwd(), "utils", "GrokKeys.js")).getActive();
        if (activeGrok.length > 0) {
            const emotion = await GrokManager.getEmotionWithGrok(truncated);
            if (emotion && VALID_EMOTIONS.includes(emotion)) return emotion;
        }
    } catch (_) {}

    try {
        const km         = require(path.join(process.cwd(), "utils", "KeysManager.js"));
        const activeKeys = require(path.join(process.cwd(), "utils", "Keys.js")).getActive();
        if (activeKeys.length > 0) {
            const sys = "You are an emotion classifier. Output ONLY one word from: anger, laugh, sad, disgust, surprise, love, neutral.";
            const raw = await km.chat({ system: sys, user: `Classify: "${truncated}"` });
            const em  = (raw || "").trim().toLowerCase().replace(/[^a-z]/g, "");
            if (VALID_EMOTIONS.includes(em)) return em;
        }
    } catch (_) {}

    return hintEmotion || "neutral";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM 1 — Background / General Group Reactions
// ═══════════════════════════════════════════════════════════════════════════════
const _groupBuf        = new Map(); // threadID → [{msgID, body, ts}]
const _groupReactedAt  = new Map(); // threadID → timestamp of last batch
const GROUP_BATCH_SIZE = 10;
const GROUP_BATCH_MS   = 5 * 60 * 1000; // also trigger every 5 min if ≥ 3 msgs

/**
 * processGroupReaction(api, event)
 * Call from ncAnyEvent for every group message — fire-and-forget (no await needed).
 * Batches messages; when batch is ready, asks aiClient which deserve reactions.
 */
async function processGroupReaction(api, event) {
    try {
        if (event.isGroup === false) return;
        const { threadID, messageID, body } = event;
        if (!messageID || !body || !body.trim()) return;

        // Buffer this message
        let buf = _groupBuf.get(threadID) || [];
        buf.push({ msgID: messageID, body: body.slice(0, 200), ts: Date.now() });
        while (buf.length > GROUP_BATCH_SIZE) buf.shift();
        _groupBuf.set(threadID, buf);

        // Decide if batch should fire
        const lastAt    = _groupReactedAt.get(threadID) || 0;
        const timePast  = Date.now() - lastAt;
        const fullBatch = buf.length >= GROUP_BATCH_SIZE;
        const timedBatch= timePast > GROUP_BATCH_MS && buf.length >= 3;
        if (!fullBatch && !timedBatch) return;

        _groupReactedAt.set(threadID, Date.now());
        const snapshot = [...buf];

        // Fire-and-forget AI analysis
        setImmediate(async () => {
            try {
                const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));
                const msgLines = snapshot.map((m, i) => `${i}. "${m.body}"`).join("\n");

                const result = await aiClient.chat(
                    `These are recent group chat messages. Decide which ones deserve an emoji reaction.\nOnly react to messages with clear emotion, humor, surprise, sadness, or strong content.\nSkip boring/plain messages.\nReply with ONLY a compact JSON array like: [{"index":0,"emoji":"😂"},{"index":3,"emoji":"😡"}]\nIf nothing deserves a reaction, reply with: []\n\nMessages:\n${msgLines}`,
                    "You are a silent emoji reactor for a group chat. Output pure JSON only, no explanation.",
                    []
                );

                // Parse JSON safely
                const match = (result || "").match(/\[[\s\S]*?\]/);
                if (!match) return;
                let reactions;
                try { reactions = JSON.parse(match[0]); } catch (_) { return; }
                if (!Array.isArray(reactions)) return;

                for (const r of reactions) {
                    const msg = snapshot[r.index];
                    if (!msg || !r.emoji) continue;
                    if (_alreadyReacted(msg.msgID)) continue;
                    _markReacted(msg.msgID);
                    await new Promise(res => setTimeout(res, 150 + Math.random() * 600));
                    try {
                        if (typeof api.setMessageReaction === "function")
                            api.setMessageReaction(r.emoji, msg.msgID, () => {}, true);
                    } catch (_) {}
                }
            } catch (_) {}
        });
    } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM 2 — Direct Chat Reactions (messages directed at the bot)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * processDirectReaction(api, event, senderUID)
 * Call from beatriceRespond — fire-and-forget.
 * 70% reaction rate, personality-aware, insult-override capable.
 * If System 1 already reacted, this call will REPLACE that emoji automatically.
 */
async function processDirectReaction(api, event, senderUID) {
    try {
        const msgID = event.messageID;
        if (!msgID) return;

        const body = (event.body || "").trim();
        if (!body || body === "SYSTEM_HEARTBEAT_PULSE" || body === "[auto-join]") return;

        // 70% rate
        if (Math.random() > 0.70) return;

        _markReacted(msgID); // mark early to prevent System 1 duplication

        // Read personality from UserProfile
        let personality = "sarcastic";
        let isGirl      = false;
        try {
            const UserProfile = require(path.join(process.cwd(), "utils", "UserProfile.js"));
            const profile     = UserProfile.get(String(senderUID || event.senderID));
            personality = profile.personality || "sarcastic";
            isGirl      = profile.gender === "female";
        } catch (_) {}

        let emoji;

        // ── Hidden insult / rude detection → cold dismissive emoji ───────────
        const hasHiddenInsult = HIDDEN_INSULT_RE.test(body);
        const hasSarcasm      = SARCASM_RE.test(body);

        if (hasHiddenInsult) {
            emoji = _pick(EMOJI_MAP.cold);
        } else if (hasSarcasm && personality === "sarcastic") {
            emoji = _pick(EMOJI_MAP.sarcastic);
        } else {
            // Quick screen + AI classification
            const hint = quickEmotionScreen(body);
            if (!hint) {
                // No emotional signal at 70% rate — still react with neutral
                emoji = _pick(EMOJI_MAP.neutral);
            } else if (hint === "neutral") {
                emoji = _pick(EMOJI_MAP.neutral);
            } else {
                const emotion = await classifyEmotionAI(body, hint);
                // Personality-aware selection
                if (personality === "friendly" && isGirl && emotion === "love") {
                    emoji = _pick(EMOJI_MAP.warm);
                } else if (personality === "sarcastic" && emotion === "laugh") {
                    emoji = _pick(["💀", "😭", "😂", "🙄"]);
                } else {
                    emoji = _pick(EMOJI_MAP[emotion] || EMOJI_MAP.neutral);
                }
            }
        }

        if (!emoji) return;

        // Small delay — reaction arrives just before or with the AI reply
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        if (typeof api.setMessageReaction === "function")
            api.setMessageReaction(emoji, msgID, () => {}, true);

    } catch (_) {}
}

// ── Backward-compatible alias ─────────────────────────────────────────────────
async function processReaction(api, event) {
    return processDirectReaction(api, event, event?.senderID);
}

module.exports = {
    processReaction,
    processGroupReaction,
    processDirectReaction,
    quickEmotionScreen,
};
