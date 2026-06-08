const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "prefix",
    version: "1.3",
    modify: ["NC-Saimx69x & NC-Fahad"],
    author: "NoobCore Team",
    team: "NoobCore",
    countDown: 10,
    role: 0,
    description: "Change the bot prefix in this chat or globally",
    guide: {
      en:
        "👋 Need help with prefixes? Here's what I can do:\n" +
        "╰‣ Type: {pn} <newPrefix>\n" +
        "   ↪ Set a new prefix for this chat only\n" +
        "   ↪ Example: {pn} $\n" +
        "╰‣ Type: {pn} <newPrefix> -g\n" +
        "   ↪ Set a new global prefix (admin only)\n" +
        "   ↪ Example: {pn} ! -g\n" +
        "╰‣ Type: {pn} reset\n" +
        "   ↪ Reset to default prefix from config\n" +
        "╰‣ Type: {pn} refresh\n" +
        "   ↪ Refresh prefix cache for this chat\n" +
        "╰‣ Just type: prefix\n" +
        "   ↪ Shows current prefix info\n" +
        "🤖 I'm NoobCore V3, ready to help!"
    }
  },

  ncStart: async function ({ message, role, args, commandName, event, threadsData, usersData }) {
    const globalPrefix = global.BeatriceBC.ncsetting.prefix;
    const userName = await usersData.getName(event.senderID) || "there";

    if (!args[0]) {
      const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
      return message.reply(
        `👋 Hey ${userName}, did you ask for my prefix?\n` +
        `╭‣ 🌐 Global: ${globalPrefix}\n` +
        `╰‣ 💬 This Chat: ${threadPrefix}\n` +
        `🤖 I'm NoobCore V3\n📂 try "${threadPrefix}help" to see all commands.`
      );
    }

    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(
        `✅ Hey ${userName}, chat prefix has been reset!\n` +
        `╭‣ 🌐 Global: ${globalPrefix}\n` +
        `╰‣ 💬 This Chat: ${globalPrefix}\n` +
        `🤖 I'm NoobCore V3\n📂 try "${globalPrefix}help" to see all commands.`
      );
    }

    if (args[0] === "refresh") {
      try {
        const threadID = event.threadID;
        if (threadsData.cache && threadsData.cache[threadID]) {
          delete threadsData.cache[threadID].data?.prefix;
        }
        const refreshedPrefix = await threadsData.get(threadID, "data.prefix") || globalPrefix;
        return message.reply(
          `🔄 Hey ${userName}, prefix cache has been refreshed!\n` +
          `╭‣ 🌐 Global: ${globalPrefix}\n` +
          `╰‣ 💬 This Chat: ${refreshedPrefix}\n` +
          `🤖 I'm NoobCore V3\n📂 try "${refreshedPrefix}help" to see all commands.`
        );
      } catch (error) {
        return message.reply(`❌ Hey ${userName}, I couldn't refresh the prefix!`);
      }
    }

    const newPrefix = args[0];
    const setGlobal = args[1] === "-g";

    if (setGlobal && role < 2) {
      return message.reply(`⛔ Hey ${userName}, Admin privileges required for global change!`);
    }

    const currentPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
    const confirmMessage = setGlobal 
      ? `⚙️ Hey ${userName}, confirm global prefix change?\n╭‣ Current: ${globalPrefix}\n╰‣ New: ${newPrefix}\n🤖 React to confirm!`
      : `⚙️ Hey ${userName}, confirm chat prefix change?\n╭‣ Current: ${currentPrefix}\n╰‣ New: ${newPrefix}\n🤖 React to confirm!`;
    
    return message.reply(confirmMessage, (err, info) => {
      if (err) return;
      global.BeatriceBC.ncReaction.set(info.messageID, {
        author: event.senderID,
        newPrefix,
        setGlobal,
        commandName
      });
    });
  },

  ncReaction: async function ({ message, event, Reaction, threadsData, usersData }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID !== author) return;
    const userName = await usersData.getName(event.userID) || "there";

    if (setGlobal) {
      try {
        global.BeatriceBC.ncsetting.prefix = newPrefix;
        const configPath = global.client.dirConfig || path.join(process.cwd(), "config.json");
        fs.writeFileSync(configPath, JSON.stringify(global.BeatriceBC.ncsetting, null, 2));
        return message.reply(`✅ Hey ${userName}, global prefix updated to: ${newPrefix}`);
      } catch (error) {
        return message.reply(`❌ Failed to save global prefix config.`);
      }
    }

    try {
      await threadsData.set(event.threadID, newPrefix, "data.prefix");
      return message.reply(`✅ Hey ${userName}, chat prefix updated to: ${newPrefix}`);
    } catch (error) {
      return message.reply(`❌ Database error while saving chat prefix.`);
    }
  },

  ncPrefix: async function ({ event, message, threadsData, usersData }) {
    const triggerText = event.body?.toLowerCase().trim();
    if (!triggerText) return;
    const isTrigger = triggerText === "prefix" || triggerText === "ňč" || triggerText === "nøøbcore";
    if (!isTrigger) return;
    
    const userName = await usersData.getName(event.senderID) || "there";
    const globalPrefix = global.BeatriceBC.ncsetting.prefix;
    const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
    
    return message.reply(
      `👋 Hey ${userName}, did you ask for my prefix?\n` +
      `╭‣ 🌐 Global: ${globalPrefix}\n` +
      `╰‣ 💬 This Chat: ${threadPrefix}\n` +
      `🤖 I'm NoobCore V3\n📂 try "${threadPrefix}help" to see all commands.`
    );
  }
};
