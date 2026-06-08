// scripts/cmds/boxchat/add.js — Add people to a group chat
//
// Anyone (role 0) can request.
// • If the group has approval mode ON and the sender is NOT an admin →
//     bot sends a request message and @tags all active admins.
// • Otherwise the bot attempts to add directly.
//
// Accepts: @tags, UIDs, Facebook profile links (single or multiple).

const { findUid }   = global.utils;
const regExURL      = /^(http|https):\/\/[^ "]+$/;
const sleep         = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
    config: {
        name:        "add",
        version:     "1.0",
        author:      "sekro",
        countDown:   5,
        role:        0,
        usePrefix:   true,
        description: "Add people to this group by @tag, UID, or Facebook profile link.",
        category:    "box chat",
        guide: {
            en:
                "   {pn} @tag — add the tagged person\n" +
                "   {pn} <uid> — add by user ID\n" +
                "   {pn} <profile link> — add by Facebook profile link\n" +
                "   {pn} @tag1 uid2 link3 — add multiple people at once",
        },
    },

    ncStart: async function ({ api, event, args, message }) {
        try {
            // ── Gather thread info ─────────────────────────────────────────────
            const threadInfo   = await api.getThreadInfo(event.threadID);
            const approvalMode = !!threadInfo.approvalMode;
            const adminIDs     = (threadInfo.adminIDs || [])
                .map(a => String(typeof a === "object" ? (a.id || a.userID) : a));
            const memberIDs    = (threadInfo.participantIDs || []).map(String);
            const senderIsAdmin = adminIDs.includes(String(event.senderID));

            // ── Collect UIDs ───────────────────────────────────────────────────
            let uids = [];
            const errors = [];

            // From @mentions
            for (const mid of Object.keys(event.mentions || {})) uids.push(String(mid));

            // From args (UIDs or links)
            for (const arg of args) {
                if (!arg || arg.startsWith("@")) continue;       // skip raw @-names

                if (/^\d{5,}$/.test(arg)) {
                    uids.push(arg);
                } else if (regExURL.test(arg)) {
                    try {
                        const uid = await findUid(arg);
                        if (uid) uids.push(String(uid));
                        else errors.push(`⚠️ No UID found for: ${arg}`);
                    } catch (e) {
                        errors.push(`⚠️ Link error (${arg}): ${e.message}`);
                    }
                }
            }

            // Send errors if any
            if (errors.length) await message.reply(errors.join("\n"));

            // Deduplicate
            uids = [...new Set(uids)];

            if (!uids.length) {
                return message.reply(
                    "📝 Who should I add? Give me:\n" +
                    "• @tag them in the message\n" +
                    "• Their Facebook UID number\n" +
                    "• Their Facebook profile link"
                );
            }

            // Already in group?
            const alreadyIn = uids.filter(id => memberIDs.includes(id));
            const toAdd     = uids.filter(id => !memberIDs.includes(id));

            if (alreadyIn.length) {
                await message.reply(`👥 Already in this group: ${alreadyIn.join(", ")}`);
            }
            if (!toAdd.length) return;

            // ── Approval mode: notify admins ───────────────────────────────────
            if (approvalMode && !senderIsAdmin) {
                const requesterInfo = await api.getUserInfo(event.senderID).catch(() => null);
                const requesterName = requesterInfo?.[event.senderID]?.name || "Someone";

                const mentionList = [];
                const mentionBody = [];
                for (const aid of adminIDs) {
                    try {
                        const info = await api.getUserInfo(aid).catch(() => null);
                        const name = info?.[aid]?.name || "Admin";
                        mentionList.push({ tag: `@${name}`, id: aid });
                        mentionBody.push(`@${name}`);
                    } catch (_) {}
                    await sleep(300);
                }

                const adminStr = mentionBody.join(" ");
                return api.sendMessage(
                    {
                        body: `📥 ${requesterName} is requesting to add:\n${toAdd.join(", ")}\n\n${adminStr}\nCan an admin approve this? ✅`,
                        mentions: mentionList,
                    },
                    event.threadID
                );
            }

            // ── Direct add ────────────────────────────────────────────────────
            await message.reply(`⏳ Adding ${toAdd.length} member(s)…`);

            const added  = [];
            const failed = [];

            for (const uid of toAdd) {
                try {
                    await new Promise((res, rej) => {
                        api.addUserToGroup(uid, event.threadID, err => {
                            if (err) rej(err); else res();
                        });
                    });
                    added.push(uid);
                } catch (e) {
                    const reason = e.message || "failed";
                    failed.push(`${uid} (${reason.slice(0, 60)})`);
                }
                await sleep(600); // avoid rate-limit
            }

            const lines = [];
            if (added.length)  lines.push(`✅ Successfully added ${added.length} member(s).`);
            if (failed.length) lines.push(`❌ Failed:\n• ${failed.join("\n• ")}`);
            if (lines.length)  return message.reply(lines.join("\n"));

        } catch (err) {
            console.error("[add command]", err.message);
            return message.reply(
                "❌ Something went wrong.\n" +
                "Make sure I'm an admin in this group and have permission to add members."
            );
        }
    },
};
