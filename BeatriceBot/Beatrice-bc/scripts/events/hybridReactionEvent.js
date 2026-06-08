// scripts/events/hybridReactionEvent.js
// Hybrid Reaction Engine event handler.
//
// NOTE: Reactions for baby.js are now fired DIRECTLY from baby.js
// (inside beatriceRespond) to guarantee they fire exactly when Beatrice
// replies. This event handler catches remaining messages that the bot
// receives but doesn't reply to (e.g. general group messages),
// and reacts to them selectively.

const path = require("path");
const { processReaction } = require(path.join(process.cwd(), "utils", "hybridReaction.js"));
const { isBotTargeted } = require(path.join(process.cwd(), "utils", "perception.js"));

module.exports = {
    config: {
        name: "hybridReactionEvent",
        version: "1.1.0",
        author: "Beatrice bc",
        description: "Emoji reaction engine — fires on messages directed at the bot",
        category: "events"
    },

    ncAnyEvent: async ({ api, event }) => {
        // Only react to messages where the bot is the target
        // (baby.js already handles reactions when it replies)
        if (!event || event.type !== "message") return;
        const body = (event.body || "").trim();
        if (!body || body === "SYSTEM_HEARTBEAT_PULSE") return;

        // Only trigger if bot is directly targeted (mention / reply to bot)
        if (!isBotTargeted(api, event)) return;

        // Fire-and-forget
        processReaction(api, event).catch(() => {});
    },

    ncStart: async () => {}
};
