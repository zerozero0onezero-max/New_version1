const path = require("path");
const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));

module.exports = {
  config: {
    name: "gpt",
    aliases: ["chatgpt", "gpt5"],
    version: "2.0.0",
    author: "Beatrice bc",
    role: 0,
    category: "Ai",
    shortDescription: "GPT AI chat",
    guide: "{p}{n} <question>"
  },

  ncStart: async function ({ api, message, args, event }) {
    const Q = args.join(" ").trim();
    if (!Q) return message.reply("Please ask a question 🍌");

    api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);

    try {
      const answer = await aiClient.ask(Q);
      const cleaned = answer.replace(/\*/g, "");

      message.reply(cleaned, (err, info) => {
        api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
        if (info && global.BeatriceBC && global.BeatriceBC.ncReply) {
          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: "gpt",
            author: event.senderID
          });
        }
      });
    } catch (e) {
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      message.reply("❌ AI unavailable. Try again later 😈");
    }
  },

  ncReply: async function ({ api, message, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);

    try {
      const answer = await aiClient.ask(event.body);
      const cleaned = answer.replace(/\*/g, "");

      message.reply(cleaned, (err, info) => {
        api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
        if (info && global.BeatriceBC && global.BeatriceBC.ncReply) {
          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: "gpt",
            author: event.senderID
          });
        }
      });
    } catch (e) {
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      message.reply("❌ AI error 😈");
    }
  }
};
