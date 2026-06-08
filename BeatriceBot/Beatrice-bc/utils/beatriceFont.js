// Beatrice font helper
// Converts ASCII letters/digits into the mathematical monospace Unicode block
// used throughout Beatrice bc replies, e.g. "Hello" -> "𝙷𝚎𝚕𝚕𝚘"
//
// IMPORTANT:
//   - This module ONLY changes the visible glyphs of A–Z / a–z / 0–9.
//   - Every other character (emoji, Arabic, punctuation, code-block markers, URLs)
//     is preserved untouched.
//   - All public helpers are wrapped in try/catch so a font-conversion failure
//     never blocks an outgoing message — the original text is returned instead.

function toBeatriceFont(text) {
        if (text == null) return text;
        try {
                const str = String(text);
                let out = "";
                for (const ch of str) {
                        const code = ch.codePointAt(0);
                        if (code >= 0x41 && code <= 0x5a) {
                                out += String.fromCodePoint(0x1d670 + (code - 0x41));
                        } else if (code >= 0x61 && code <= 0x7a) {
                                out += String.fromCodePoint(0x1d68a + (code - 0x61));
                        } else if (code >= 0x30 && code <= 0x39) {
                                out += String.fromCodePoint(0x1d7f6 + (code - 0x30));
                        } else {
                                out += ch;
                        }
                }
                return out;
        } catch (_) {
                return text;
        }
}

// Backwards-compat alias used by scripts/cmds/chat/baby.js. We deliberately
// stopped wrapping the text in "✨ … ✨" — the AI was emitting that on every
// reply because of this helper. Now `styled()` just applies the font.
function styled(text) {
        return toBeatriceFont(text);
}

/**
 * transformOutgoing — turns whatever the bot is about to send into the
 * monospace style. Handles every shape FCA accepts:
 *   • string                        →   styled string
 *   • { body, ... }                 →   { body: styled(body), ... }
 *   • { body, attachment, mentions} →   body styled, the rest untouched
 *   • Buffer / Stream / Readable    →   returned as-is
 *
 * Always safe: if anything throws, the original input is returned.
 */
function transformOutgoing(msg) {
        try {
                if (msg == null) return msg;
                if (typeof msg === "string") return toBeatriceFont(msg);
                if (Buffer.isBuffer(msg)) return msg;
                if (typeof msg !== "object") return msg;

                // Streams (e.g. fs.createReadStream) — leave alone
                if (typeof msg.pipe === "function") return msg;

                if (typeof msg.body === "string") {
                        // Shallow clone so we don't mutate caller's object
                        const out = Object.assign({}, msg, { body: toBeatriceFont(msg.body) });
                        return out;
                }
                return msg;
        } catch (_) {
                return msg;
        }
}

module.exports = { toBeatriceFont, styled, transformOutgoing };
