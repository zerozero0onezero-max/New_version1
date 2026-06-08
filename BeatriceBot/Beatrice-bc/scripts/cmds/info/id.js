// scripts/cmds/info/id.js — Quick Facebook ID lookup
// Returns the Facebook user ID of yourself, a @tagged user, or a replied user.

module.exports = {
    config: {
        name:        "id",
        aliases:     ["myid", "whoami"],
        version:     "1.0",
        author:      "sekro",
        countDown:   3,
        role:        0,
        usePrefix:   true,
        description: "Get your Facebook user ID — or someone else's via @tag or reply.",
        category:    "info",
        guide: {
            en:
                "   {pn} — your own ID\n" +
                "   {pn} @tag — ID of tagged person(s)\n" +
                "   {pn} (reply to a message) — ID of that sender\n" +
                "   {pn} <uid> — look up any numeric UID",
        },
    },

    ncStart: async function ({ api, event, args, message }) {
        try {
            // ── Reply to someone's message ─────────────────────────────────────
            if (event.messageReply) {
                const uid    = event.messageReply.senderID;
                const fbData = await api.getUserInfo(uid).catch(() => null);
                const name   = fbData?.[uid]?.name || "User";
                return message.reply(`🆔 ${name}'s ID: ${uid}`);
            }

            // ── @mentions ──────────────────────────────────────────────────────
            const mentionIDs = Object.keys(event.mentions || {});
            if (mentionIDs.length > 0) {
                const lines = [];
                for (const uid of mentionIDs) {
                    const fbData = await api.getUserInfo(uid).catch(() => null);
                    const name   = fbData?.[uid]?.name || event.mentions[uid] || "User";
                    lines.push(`👤 ${name}: ${uid}`);
                }
                return message.reply(`🆔 User IDs:\n${lines.join("\n")}`);
            }

            // ── Numeric UID argument ───────────────────────────────────────────
            if (args[0] && /^\d{5,}$/.test(args[0])) {
                const uid    = args[0];
                const fbData = await api.getUserInfo(uid).catch(() => null);
                const name   = fbData?.[uid]?.name || "User";
                return message.reply(`🆔 ${name}'s ID: ${uid}`);
            }

            // ── Default: caller's own ID ───────────────────────────────────────
            return message.reply(`🆔 Your ID: ${event.senderID}`);

        } catch (err) {
            console.error("[id command]", err.message);
            return message.reply("❌ Could not fetch ID. Please try again.");
        }
    },
};
