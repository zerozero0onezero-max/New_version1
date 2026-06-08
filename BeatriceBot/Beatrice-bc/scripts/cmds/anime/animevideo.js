const axios = require("axios");

module.exports = {
  config: {
    name: "animevideo",
    aliases: ["animevid", "anivid"],
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    role: 0,
    countDown: 5,
    description: "Sends a random anime video.",
  },

  ncStart: async function ({ api, event }) {
    try {
      const processingMessage = await api.sendMessage(
        "⏳ Please wait few seconds...",
        event.threadID,
        event.messageID
      );

      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const res = await axios.get(`${apiBase}/api/animevideo`);

      if (!res.data || !res.data.url) {
        await api.unsendMessage(processingMessage.messageID);
        return api.sendMessage(
          "❌ Oops! Something went wrong, please try again later.",
          event.threadID,
          event.messageID
        );
      }

      const videoUrl = res.data.url;

      const msg = {
        body: "🎬 Here's a random anime video for you! 😊💖",
        attachment: await global.utils.getStreamFromURL(videoUrl),
      };
      await api.sendMessage(msg, event.threadID, event.messageID);

      await api.unsendMessage(processingMessage.messageID);

    } catch (error) {
      console.error(error);
      await api.sendMessage(
        "❌ Oops! Something went wrong, please try again later.",
        event.threadID,
        event.messageID
      );
    }
  },
};