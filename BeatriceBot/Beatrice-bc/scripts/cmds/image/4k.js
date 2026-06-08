const axios = require("axios");
const path = require("path");

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
    name: "4k",
    aliases: ["upscale", "hd", "enhance"],
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴", //Api by Fahim
    team: "NoobCore",
    shortDescription: "Upscale image to 4K quality",
    longDescription:
      "Upscales a replied  image to high-quality 4K resolution",
    category: "image",
    guide: "{pn} (reply to an image)",
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
          "❌ Please reply to an image to upscale it.",
          event.threadID,
          event.messageID
        );
      }

      processingMsg = await api.sendMessage(
        "⏳ Processing your image...",
        event.threadID,
        null,
        event.messageID
      );

      const BASE_URL = await getFahimApi();
      const apiUrl = `${BASE_URL}/4k?url=${encodeURIComponent(imageUrl)}`;

      const res = await axios.get(apiUrl);

      if (!res.data?.image) {
        throw new Error("Invalid API response");
      }

      const imageStream = await axios.get(res.data.image, {
        responseType: "stream",
      });

      imageStream.data.path = path.join(__dirname, "4k-image.jpg");

      await api.sendMessage(
        {
          body: "✅ Here's your upscaled image!",
          attachment: imageStream.data,
        },
        event.threadID,
        null,
        event.messageID
      );

      if (processingMsg?.messageID) {
        api.unsendMessage(processingMsg.messageID);
      }
    } catch (error) {
      console.error("4K Command Error:", error);

      if (processingMsg?.messageID) {
        api.unsendMessage(processingMsg.messageID);
      }

      return api.sendMessage(
        "❌ Failed to upscale the image. Please try again later.",
        event.threadID,
        event.messageID
      );
    }
  },
};