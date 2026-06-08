const axios = require("axios");

async function getApiBase() {
  try {
    const noobcore =
      "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
    const res = await axios.get(noobcore);
    return res.data.apiv1;
  } catch (e) {
    console.error("noobcore  fetch error:", e.message);
    return null;
  }
}

module.exports.config = {
  name: "art",
  version: "1.0",
  author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
  team: "NoobCore", 
  role: 0,
  description: "Convert an image into full anime-style artwork",
  category: "ai",
  guide: { en: "art (reply to an image)" },
  coolDowns: 5
};

exports.ncStart = async function ({ api, event }) {
  const repliedImage = event.messageReply?.attachments?.[0];

  if (!repliedImage || repliedImage.type !== "photo") {
    return api.sendMessage(
      "🖼️ Please reply to an image and type /art.",
      event.threadID,
      event.messageID
    );
  }

  const waitingMessage = await api.sendMessage(
    "🎨 Generating anime-style artwork, please wait...",
    event.threadID,
    event.messageID
  );

  try {
    const apiBase = await getApiBase();
    if (!apiBase) {
      await api.unsendMessage(waitingMessage.messageID);
      return api.sendMessage(
        "❌ Failed to fetch API base. Please try again later.",
        event.threadID,
        event.messageID
      );
    }

    const apiUrl =
      `${apiBase}/api/art?image=` +
      encodeURIComponent(repliedImage.url);

    const imageStream = await global.utils.getStreamFromURL(apiUrl);

    await api.sendMessage(
      {
        body: "✨ Here’s your artwork.",
        attachment: imageStream
      },
      event.threadID,
      () => api.unsendMessage(waitingMessage.messageID),
      event.messageID
    );
  } catch (err) {
    console.error("ART Command Error:", err.message);
    try {
      await api.unsendMessage(waitingMessage.messageID);
    } catch {}
    api.sendMessage(
      "❌ Failed to generate artwork. Please try again later.",
      event.threadID,
      event.messageID
    );
  }
};