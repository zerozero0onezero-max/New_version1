// scripts/events/welcome.js — Welcome event with AI fallback
//
// Logic:
//   1. If admin set a custom welcome via .setwelcome → use that (original behaviour)
//   2. If no custom text → Beatrice generates a sarcastic AI welcome in English
//   3. If AI fails → plain fallback text

const path = require("path");
const { getPrefix } = global.utils;

// ── AI welcome generator ────────────────────────────────────────────────────
async function generateWelcome(userName, groupName, memberCount) {
    const system = [
        "You are Beatrice — a sarcastic, sharp 16-year-old girl on Facebook Messenger.",
        "ALWAYS reply in ENGLISH ONLY. No Arabic, no other language.",
        "Be witty, Gen-Z, funny. 1-2 sentences max.",
        "Use mild humour like: 'Great, now I have to deal with more people 💀'",
        "You can use: ngl, lowkey, no cap, bruh, bestie, fr fr, oof, slay",
        "Address the new member by name. Keep it short and punchy.",
    ].join("\n");

    const prompt = `Someone named "${userName}" just joined "${groupName}". They are member #${memberCount}. Write a short sarcastic welcome message tagging them.`;

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
    const fallbacks = [
        `Great, now I have to deal with ${userName} too 💀`,
        `Oh wonderful, ${userName} decided to show up 🙄`,
        `${userName} joined — no cap nobody asked but welcome I guess 🦦`,
        `Another one 😐 Welcome to the chaos, ${userName}`,
        `${userName} is here now. lowkey didn't miss anyone but ok 💀`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ── Main event ──────────────────────────────────────────────────────────────
module.exports = {
    config: {
        name: "welcome",
        version: "3.0",
        author: "sekro / Beatrice bc",
        category: "events",
    },

    ncStart: async function ({ api, event, threadsData }) {
        if (event.logMessageType !== "log:subscribe") return;

        const { threadID, logMessageData } = event;
        const { addedParticipants } = logMessageData;

        const botID = String(api.getCurrentUserID());

        // If the bot itself was added → set nickname and stop
        if (addedParticipants.some(u => u.userFbId === botID)) {
            const nickNameBot = global.BeatriceBC?.config?.nickNameBot;
            if (nickNameBot) {
                try { await api.changeNickname(nickNameBot, threadID, botID); } catch (e) {}
            }
            return;
        }

        // Check if welcome messages are enabled
        const { data, settings } = await threadsData.get(threadID);
        if (settings.sendWelcomeMessage === false) return;

        // Get group info once for all new members
        let groupName = "the group";
        let memberCount = 0;
        try {
            const info = await api.getThreadInfo(threadID);
            groupName = info.threadName || "the group";
            memberCount = info.participantIDs.length;
        } catch (e) {}

        for (const user of addedParticipants) {
            const userId = user.userFbId;
            const fullName = user.fullName || "someone";

            try {
                // ── Path A: Admin has set a custom welcome message ──────────
                if (data.welcomeMessage) {
                    const { getTime } = global.utils;
                    const hours = parseInt(getTime("HH"), 10);
                    const session = hours <= 10 ? "morning" : hours <= 12 ? "noon" : hours <= 18 ? "afternoon" : "evening";
                    const multiple = addedParticipants.length > 1 ? "you guys" : "you";

                    let msg = data.welcomeMessage
                        .replace(/\{userName\}/g, fullName)
                        .replace(/\{userNameTag\}/g, fullName)
                        .replace(/\{boxName\}|\{threadName\}/g, groupName)
                        .replace(/\{multiple\}/g, multiple)
                        .replace(/\{session\}/g, session);

                    const form = { body: msg };
                    if (msg.includes(fullName)) {
                        form.mentions = [{ tag: fullName, id: userId }];
                    }

                    // Add any file attachments set by admin
                    if (data.welcomeAttachment) {
                        const { drive } = global.utils;
                        form.attachment = (await Promise.allSettled(
                            data.welcomeAttachment.map(f => drive.getFile(f, "stream"))
                        )).filter(r => r.status === "fulfilled").map(r => r.value);
                    }

                    await api.sendMessage(form, threadID);
                    continue;
                }

                // ── Path B: No custom message → Beatrice AI welcome ─────────
                const aiMsg = await generateWelcome(fullName, groupName, memberCount);
                await api.sendMessage(
                    { body: aiMsg, mentions: [{ tag: fullName, id: userId }] },
                    threadID
                );

            } catch (err) {
                // Silent fail per user
            }
        }
    },
};
