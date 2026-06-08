module.exports = {
  config: {
    name: "botnickname",
    aliases: ["botnick"],
    version: "1.5",
    author: "NC-AZAD | NC-XNIL",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Change bot nickname in all group chats"
    },
    longDescription: {
      en: "Change the bot nickname in every group where the bot exists"
    },
    category: "boxchat",
    guide: {
      en: "{pn} <new nickname>"
    },
    envConfig: {
      delayPerGroup: 300
    }
  },

  langs: {
    en: {
      missingNickname: "❌ Please enter a new nickname for the bot.",
      startChange:
        "╔═⌠ 🤖 BOT NICKNAME ⌡═╗\n" +
        "║ 📝 New Nickname : %1\n" +
        "║ 👥 Total Groups : %2\n" +
        "╚═════════════╝",
      success:
        "╔══ ⌠ ✅ SUCCESS ⌡ ══╗\n" +
        "║ Nickname Updated!\n" +
        "║ 📝 %1\n" +
        "╚════════════════╝",
      partial:
        "⚠️ Nickname updated, but failed in some groups:\n%1",
      done: "🎉 All done!"
    }
  },

  ncStart: async function ({ api, args, message, getLang }) {
    try {
      const newNickname = args.join(" ").trim();
      if (!newNickname)
        return message.reply(getLang("missingNickname"));

      const botID = api.getCurrentUserID();
      const delay = this.config.envConfig.delayPerGroup || 300;

      // 🔹 Fetch inbox threads directly from Facebook
      const inbox = await api.getThreadList(200, null, ["INBOX"]);

      // 🔹 Filter only group chats
      const groupThreads = inbox.filter(t => t.isGroup);

      await message.reply(
        getLang("startChange", newNickname, groupThreads.length)
      );

      const failed = [];

      for (const thread of groupThreads) {
        try {
          await api.changeNickname(
            newNickname,
            thread.threadID,
            botID
          );
          await new Promise(r => setTimeout(r, delay));
        } catch (err) {
          failed.push(thread.threadID);
        }
      }

      if (failed.length === 0) {
        await message.reply(
          getLang("success", newNickname)
        );
      } else {
        await message.reply(
          getLang("partial", failed.join(", "))
        );
      }

      await message.reply(getLang("done"));
    } catch (e) {
      console.error(e);
      message.reply("❌ Error occurred while changing nickname.");
    }
  }
};