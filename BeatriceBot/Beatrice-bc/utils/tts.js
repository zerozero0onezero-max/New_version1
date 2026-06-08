"use strict";
/**
 * utils/tts.js — Google TTS Voice Output
 *
 * Uses the `google-tts-api` npm package (unofficial Google Translate TTS).
 * Converts text to MP3 audio, returned as a Buffer.
 *
 * Limits:
 *   - maxBytes: 10 MB — returns null if audio would exceed this.
 *   - Text longer than ~200 chars is split into chunks and merged.
 *
 * Language auto-detected:
 *   - Arabic text → "ar"
 *   - English/other → "en"
 */

const axios = require("axios");
const path = require("path");

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

let _gtts;
function getGtts() {
    if (!_gtts) _gtts = require("google-tts-api");
    return _gtts;
}

/**
 * Detect language from text.
 * Returns "ar" for Arabic, "en" for everything else.
 */
function detectLang(text) {
    return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

/**
 * Convert text to MP3 Buffer using Google TTS.
 *
 * @param {string} text   - Text to convert (any length).
 * @param {string} [lang] - Language code ("ar", "en", etc.). Auto-detected if omitted.
 * @returns {Promise<Buffer|null>} MP3 buffer, or null if over 10 MB or on error.
 */
async function speak(text, lang) {
    if (!text || !text.trim()) return null;

    const useLang = lang || detectLang(text);
    const gtts = getGtts();

    try {
        // getAllAudioBase64 handles chunking for long text
        const results = await gtts.getAllAudioBase64(text, {
            lang: useLang,
            slow: false,
            host: "https://translate.google.com",
            timeout: 15000,
        });

        // Merge all base64 chunks into one Buffer
        const buffers = results.map(r => Buffer.from(r.base64, "base64"));
        const merged = Buffer.concat(buffers);

        // Enforce 10 MB limit
        if (merged.length > MAX_BYTES) {
            console.warn(`[tts] Audio too large (${(merged.length / 1024 / 1024).toFixed(1)} MB) — skipping TTS`);
            return null;
        }

        return merged;
    } catch (e) {
        console.warn("[tts] TTS failed:", e.message);
        return null;
    }
}

/**
 * Send an audio reply in a thread.
 * Returns true if audio was sent, false if fell back to text.
 *
 * @param {object} api        - FCA API
 * @param {object} event      - Incoming event
 * @param {string} text       - Text to speak
 * @param {string} [lang]     - Override language
 */
async function sendVoiceReply(api, event, text, lang) {
    try {
        const buf = await speak(text, lang || detectLang(text));
        if (!buf) return false;

        const { Readable } = require("stream");
        const stream = Readable.from(buf);
        stream.path = "beatrice_reply.mp3"; // FCA needs .path for mime detection

        await new Promise((resolve, reject) => {
            api.sendMessage(
                { attachment: stream },
                event.threadID,
                (err) => { err ? reject(err) : resolve(); },
                event.messageID
            );
        });
        return true;
    } catch (e) {
        console.warn("[tts] sendVoiceReply failed:", e.message);
        return false;
    }
}

module.exports = { speak, sendVoiceReply, detectLang, MAX_BYTES };
