module.exports = {
  config: {
    name: "out",
    version: "1.4",
    author: "NC-AZAD",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Bot leave group with confirmation"
    },
    longDescription: {
      en: "Ask Yes/No before bot leaves the group"
    },
    category: "boxchat",
    guide: {
      en: "{pn}"
    }
  },

  ncStart: async function ({ api, event, message, commandName }) {
    message.reply(
      "🔐 𝗖𝗢𝗡𝗙𝗜𝗥𝗠 𝗔𝗖𝗧𝗜𝗢𝗡\n\n" +
      "⚠️ 𝗗𝗼 𝘆𝗼𝘂 𝘄𝗮𝗻𝘁 𝗺𝗲 𝘁𝗼 𝗹𝗲𝗮𝘃𝗲 𝘁𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽?\n\n" +
      "🟢 Reply: Yes\n" +
      "🔴 Reply: No\n\n" +
      "⏳ Auto cancel in 20 seconds.",
      (err, info) => {
        global.BeatriceBC.ncReply.set(info.messageID, {
          commandName,
          author: event.senderID,
          messageID: info.messageID,
          threadID: event.threadID,
          timeout: setTimeout(() => {
            api.unsendMessage(info.messageID);
          }, 20000)
        });
      }
    );
  },

  ncReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const input = event.body.trim().toLowerCase();
    clearTimeout(Reply.timeout);

    if (input === "yes") {
      await api.sendMessage(
        "👋 𝗬𝗲𝘀 𝗰𝗼𝗻𝗳𝗶𝗿𝗺𝗲𝗱!\n" +
        "𝗜 𝗮𝗺 𝗹𝗲𝗮𝘃𝗶𝗻𝗴 𝘁𝗵𝗲 𝗴𝗿𝗼𝘂𝗽...\n\n" +
        "🤍 𝗔𝗹𝗹𝗮𝗵 𝗛𝗮𝗳𝗲𝘇!",
        event.threadID
      );

      setTimeout(() => {
        api.removeUserFromGroup(api.getCurrentUserID(), event.threadID);
      }, 2000);
    } else {
      await api.sendMessage(
        "❎ 𝗔𝗰𝘁𝗶𝗼𝗻 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱!\n" +
        "𝗜 𝘄𝗶𝗹𝗹 𝘀𝘁𝗮𝘆 𝗶𝗻 𝘁𝗵𝗲 𝗴𝗿𝗼𝘂𝗽 🙂",
        event.threadID
      );
    }

    api.unsendMessage(Reply.messageID);
  }
};