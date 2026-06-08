module.exports = {
  config: {
    name: "info",
    version: "1.0",
    author: "💻𝑵𝑪-𝑿𝑵𝑰𝑳6𝒙⚡",
    countDown: 5,
    role: 0, // 0 use for everyone, 1 use for box admin, 2 use for bot admin, 3 use for bot Creator
    premium: false, // ture use only premium user
    usePrefix: true, // false use without prefix
    shortDescription: {
      en: "Show bot information"
    },
    description: {
      en: "Display detailed information about NoobCore Bot"
    },
    category: "utility",
    guide: {
      en: "{prefix}info"
    }
  },

  langs: {
    en: {
      infoMessage:
`╔════════════════════╗
   🤖 NOOBCORE BOT INFO
╚════════════════════╝

📌 Bot Name: NoobCore-v3
⚡ Version: 3.0
👨‍💻 Developer: Noob Programmer
🌐 Platform: Facebook Messenger
🧠 System: Modular Command + Event Driven
🔄 Multi AppState: Enabled

Reply with:
1️⃣ - Show Prefix
2️⃣ - Show Admin List
3️⃣ - Show Creator ID

React ❤️ to get uptime status.
`
    }
  },

  ncStart: async function ({ api, event }) {
    const message = this.langs.en.infoMessage;

    await api.sendMessage(message, event.threadID, (error, info) => {
      if (error) return console.log(error);

      // Reply handler
      global.BeatriceBC.ncReply.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID
      });

      // Reaction handler
      global.BeatriceBC.ncReaction.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID
      });

    }, event.messageID);
  },

  // Handle Reply
  ncReply: async function ({ api, event }) {
    const { body, threadID, messageID } = event;
    const ncsetting = global.BeatriceBC.ncsetting;

    if (body === "1") {
      return api.sendMessage(
        `🔹 Current Prefix: ${ncsetting.prefix}`,
        threadID,
        messageID
      );
    }

    if (body === "2") {
      return api.sendMessage(
        `👮 Admin List:\n${ncsetting.adminBot.join("\n")}`,
        threadID,
        messageID
      );
    }

    if (body === "3") {
      return api.sendMessage(
        `👑 Creator ID:\n${ncsetting.creator.join("\n")}`,
        threadID,
        messageID
      );
    }
  },

  // Handle Reaction
  ncReaction: async function ({ api, event }) {
    if (event.reaction !== "❤") return;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return api.sendMessage(
      `⏳ Bot Uptime:\n${hours}h ${minutes}m ${seconds}s`,
      event.threadID,
      event.messageID
    );
  }
};