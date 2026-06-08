const axios = require("axios");

const noobcore =
  "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

async function getFahimApi() {
  const res = await axios.get(noobcore, { timeout: 10000 });
  if (!res.data?.fahim) {
    throw new Error("fahim API not found");
  }
  return res.data.fahim;
}

module.exports = {
  config: {
    name: "rbg",
    version: "1.0",
    author: "NC-Saimx69x", //Api by Fahim
    team: "NoobCore", 
    shortDescription: "Remove background from image",
    longDescription: "Removes background from replied  image",
    guide: "{pn} (reply to image)",
  },

  ncStart: async function ({ api, event }) {
    let imageUrl = "";
    let processingMsg;

    try {
      if (
        event.type === "message_reply" &&
        event.messageReply?.attachments?.length
      ) {
        imageUrl = event.messageReply.attachments[0].url;
      } else if (event.attachments?.length) {
        imageUrl = event.attachments[0].url;
      } else {
        return api.sendMessage(
          "❌ Please reply to  an image.",
          event.threadID,
          event.messageID
        );
      }

      processingMsg = await api.sendMessage(
        "⏳ Removing background, please wait...",
        event.threadID,
        null,
        event.messageID
      );

      const BASE_URL = await getFahimApi();
      const apiUrl = `${BASE_URL}/rbg?url=${encodeURIComponent(imageUrl)}`;

      const response = await axios.get(apiUrl, {
        responseType: "stream",
      });

      await api.sendMessage(
        {
          body: "✅ Background removed successfully!",
          attachment: response.data,
        },
        event.threadID,
        null,
        event.messageID
      );

      if (processingMsg?.messageID) {
        api.unsendMessage(processingMsg.messageID);
      }
    } catch (error) {
      console.error("RBG Command Error:", error);

      if (processingMsg?.messageID) {
        api.unsendMessage(processingMsg.messageID);
      }

      return api.sendMessage(
        "❌ Failed to remove background. Please try again later.",
        event.threadID,
        event.messageID
      );
    }
  },
};