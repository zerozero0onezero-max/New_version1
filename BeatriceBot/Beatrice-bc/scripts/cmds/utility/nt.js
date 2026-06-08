const axios = require("axios");


let API_BASE = null;

async function getApiBase() {
  try {
    if (API_BASE) return API_BASE;

    const rawRes = await axios.get(
      "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json"
    );

    API_BASE = rawRes.data?.nt || null;
    return API_BASE;
  } catch (err) {
    console.error("❌ Failed to load API_BASE:", err.message);
    return null;
  }
}


const REWARD_MONEY = 1000;
const REWARD_EXP = 100;


module.exports = {
  config: {
    name: "nt",
    version: "1.0.3",
    author: "Team NoobCore",
    role: 0,
    usePrefix: true,
    description: "AI baby question & teach system",
    guide: "Use nt and reply with your answer",
    cooldowns: 0
  },

  ncStart: async function ({ event, message }) {
    try {
      const apiBase = await getApiBase();
      if (!apiBase)
        return message.reply("❌ API not available right now.");

      const [listRes, randomRes] = await Promise.all([
        axios.get(`${apiBase}/baby?list=all`),
        axios.get(`${apiBase}/baby?random=1`)
      ]);

      const total = Array.isArray(listRes.data?.keys)
        ? listRes.data.keys.length
        : 0;

      const question = randomRes.data?.question || "Hello";

      return message.reply(
        `🧠 Here's Your Question:\n\n${question}\n\n📦 Available: ${total}\n💬 Reply this message with your answer.`,
        (err, info) => {
          if (err) return;

          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            question
          });
        }
      );
    } catch (err) {
      console.error("[NT ERROR]", err);
      return message.reply("❌ API Error! Please try again later.");
    }
  },

  ncReply: async function ({ event, Reply, message, usersData }) {
    const { senderID, body } = event;
    if (!body || senderID !== Reply.author) return;

    try {
      const apiBase = await getApiBase();
      if (!apiBase)
        return message.reply("❌ API not available right now.");

      const userName = await usersData.getName(senderID);

      const res = await axios.get(
        `${apiBase}/baby?teach=${encodeURIComponent(
          Reply.question
        )}&reply=${encodeURIComponent(body)}&senderID=${senderID}`
      );

      if (res.status !== 200)
        return message.reply("❌ Failed to save reply.");

      /* ===== REWARD SYSTEM ===== */
      const userData = (await usersData.get(senderID)) || {};

      await usersData.set(senderID, {
        money: (userData.money || 0) + REWARD_MONEY,
        exp: (userData.exp || 0) + REWARD_EXP
      });

      const text =
        `✅ Reply saved successfully!\n\n` +
        `🧠 Question: ${Reply.question}\n` +
        `💬 Answer: ${body}\n\n` +
        `👤 Teacher: ${userName}\n` +
        `📚 Total Teachs: ${res.data?.teachs || 1}\n\n` +
        `💰 Earned: +${REWARD_MONEY}$\n` +
        `⭐ EXP: +${REWARD_EXP}`;

      await message.reply(text);

      setTimeout(() => {
        this.ncStart({ event, message });
      }, 2000);

    } catch (err) {
      console.error("[NT SAVE ERROR]", err);
      return message.reply("❌ Error saving reply.");
    }
  }
};