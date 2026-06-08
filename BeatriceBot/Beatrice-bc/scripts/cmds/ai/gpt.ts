// This file intentionally uses CommonJS so it loads in the bot without ts-node issues.
// The "ask" command is a lightweight alias for the main gpt5.js command.
const path = require("path");
const aiClient = require(path.join(process.cwd(), "utils", "aiClient.js"));

const config = {
  name: "ask",
  aliases: ["question"],
  version: "2.0",
  author: "Beatrice bc",
  role: 0,
  shortDescription: "Ask AI a question",
  category: "Ai",
  guide: "{p}{n} <question>"
};

async function ncStart({ api, message, args, event }) {
  const question = args.join(" ").trim();
  if (!question) return message.reply("Ask me something!");

  api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
  try {
    const reply = await aiClient.ask(question);
    message.reply(reply, (err, info) => {
      api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
      if (info && global.BeatriceBC && global.BeatriceBC.ncReply) {
        global.BeatriceBC.ncReply.set(info.messageID, { commandName: "ask", author: event.senderID });
      }
    });
  } catch {
    api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
    message.reply("AI is unavailable. Try again later.");
  }
}

async function ncReply({ api, message, event, Reply }) {
  if (event.senderID !== Reply.author) return;
  api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
  try {
    const reply = await aiClient.ask(event.body);
    message.reply(reply, (err, info) => {
      api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
      if (info && global.BeatriceBC && global.BeatriceBC.ncReply) {
        global.BeatriceBC.ncReply.set(info.messageID, { commandName: "ask", author: event.senderID });
      }
    });
  } catch {
    api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
    message.reply("AI error. Try again.");
  }
}

module.exports = { config, ncStart, ncReply };
