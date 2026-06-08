module.exports = {
  config: {
    name: "supportgc",
    aliases: ["supportgroup"],
    version: "1.1",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    countDown: 5,
    role: 0,
    description: {
      en: "Adds the user to the official support group."
    },
    guide: {
      en: "{pn}"
    }
  },

  ncStart: async function ({ api, event, message }) {
    const supportGroupThreadID = "2345731749224307";

    try {

      const info = await api.getThreadInfo(supportGroupThreadID);

      const isMember = info.participantIDs.includes(event.senderID);

      if (isMember) {
        return message.reply(
          "⚠ You are already part of our Support Group."
        );
      }


      await api.addUserToGroup(
        event.senderID,
        supportGroupThreadID
      );

      return message.reply(
        "✅ Access Granted!\nYou are now connected to our Support Group."
      );

    } catch (error) {
      console.error("SupportGC Add Error:", error);

      return message.reply(
        "❌ Unable to add you to the Support Group.\n" +
        "➡ Possible reasons:\n" +
        "• Your profile is private\n" +
        "• You blocked the bot\n" +
        "• Bot is not admin\n\n" +
        "📩 Send friend request to the bot and try again."
      );
    }
  }
};