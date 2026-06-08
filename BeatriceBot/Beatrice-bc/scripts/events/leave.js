// scripts/events/leave.js — Leave event with AI fallback
//
// Logic:
//   1. If admin set a custom leave message via .setleave → use that (original behaviour)
//   2. If no custom text → Beatrice generates a sarcastic AI goodbye in English
//   3. If AI fails → plain fallback text

const path = require("path");
const { getTime } = global.utils;

// ── AI leave generator ───────────────────────────────────────────────────────
async function generateLeave(userName, groupName, wasKicked) {
    const system = [
        "You are Beatrice — a sarcastic, sharp 16-year-old girl on Facebook Messenger.",
        "ALWAYS reply in ENGLISH ONLY. No Arabic, no other language.",
        "Be witty, Gen-Z, a little rude but funny. 1-2 sentences max.",
        "Use mild words like: bitch (as friendly insult), beach, bruh, fr, bestie, no cap",
        "Keep it short and punchy.",
    ].join("\n");

    const leaveType = wasKicked ? "was kicked from" : "left";
    const prompt = `"${userName}" just ${leaveType} the group "${groupName}". Write a short sarcastic farewell comment about them leaving. Address them by name.`;

    try {
        const Keys = require(path.join(process.cwd(), "utils", "Keys.js"));
        if (Keys.getActive().length > 0) {
            const km = require(path.join(process.cwd(), "utils", "KeysManager.js"));
            const text = await km.chat({ system, user: prompt });
            if (text) return text;
        }
    } catch (e) {}

    try {
        const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));
        const text = await aiClient.ask(prompt, system);
        if (text) return text;
    } catch (e) {}

    // Hard fallback
    const kickFallbacks = [
        `${userName} got yeeted out 💀 should've behaved`,
        `Bye ${userName}, you had it coming ngl 👋`,
        `And ${userName} has been removed. Not surprised fr 💀`,
    ];
    const leaveFallbacks = [
        `${userName} left the group 👋 nobody's crying tho`,
        `And just like that, ${userName} is gone. The bitch left 💀`,
        `${userName} left — whoever that was, ok bye 🙄`,
        `${userName} dipped fr 💀 the drama 👋`,
        `There goes ${userName}. Lowkey didn't notice they were here 💀`,
    ];

    const pool = wasKicked ? kickFallbacks : leaveFallbacks;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ── Main event ───────────────────────────────────────────────────────────────
module.exports = {
    config: {
        name: "leave",
        version: "3.0",
        author: "sekro / Beatrice bc",
        category: "events",
    },

    langs: {
        en: {
            defaultLeaveMessage: "{userName} {type} the group",
        },
    },

    ncStart: async ({ threadsData, event, api, usersData, getLang }) => {
        if (event.logMessageType !== "log:unsubscribe") return;

        const { threadID } = event;
        const threadData = await threadsData.get(threadID);

        if (threadData.settings.sendLeaveMessage === false) return;

        const { leftParticipantFbId } = event.logMessageData;
        if (String(leftParticipantFbId) === String(api.getCurrentUserID())) return;

        const userName = await usersData.getName(leftParticipantFbId).catch(() => "someone");
        const wasKicked = String(leftParticipantFbId) !== String(event.author);
        const threadName = threadData.threadName || "the group";

        // ── Path A: Admin has set a custom leave message ────────────────────
        if (threadData.data.leaveMessage) {
            const hours = parseInt(getTime("HH"), 10);
            const session = hours <= 10 ? "morning" : hours <= 12 ? "noon" : hours <= 18 ? "afternoon" : "evening";
            const leaveType = wasKicked ? "was kicked from" : "left";

            let msg = threadData.data.leaveMessage
                .replace(/\{userName\}|\{userNameTag\}/g, userName)
                .replace(/\{type\}/g, leaveType)
                .replace(/\{threadName\}|\{boxName\}/g, threadName)
                .replace(/\{time\}/g, getTime("HH:mm"))
                .replace(/\{session\}/g, session);

            const form = { body: msg };
            if (threadData.data.leaveMessage.includes("{userNameTag}")) {
                form.mentions = [{ tag: userName, id: leftParticipantFbId }];
            }

            if (threadData.data.leaveAttachment) {
                const { drive } = global.utils;
                form.attachment = (await Promise.allSettled(
                    threadData.data.leaveAttachment.map(f => drive.getFile(f, "stream"))
                )).filter(r => r.status === "fulfilled").map(r => r.value);
            }

            return api.sendMessage(form, threadID);
        }

        // ── Path B: No custom message → Beatrice AI goodbye ─────────────────
        try {
            const aiMsg = await generateLeave(userName, threadName, wasKicked);
            api.sendMessage(
                { body: aiMsg, mentions: [{ tag: userName, id: leftParticipantFbId }] },
                threadID
            );
        } catch (e) {
            // Silently skip
        }
    },
};
