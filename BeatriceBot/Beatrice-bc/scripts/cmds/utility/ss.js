const axios = require("axios");

async function getApiBase() {
  try {
    const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
    const res = await axios.get(noobcore);
    return res.data.apiv1;
  } catch (e) {
    console.error("GitHub raw fetch error:", e.message);
    return null;
  }
}

module.exports.config = {
  name: "ss",
  aliases: ["screenshot"],
  version: "1.0",
  author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
  team: "NoobCore",
  role: 0,
  description: "Take a screenshot of a website",
  category: "utility",
  guide: { en: "ss [URL]" },
  coolDowns: 5
};

exports.ncStart = async function ({ api, event, args }) {
  const url = args.join(" ").trim();

  if (!url)
    return api.sendMessage(
      `❌ Please provide a URL.
Example: /ss https://xsaim8x-xxx-api.onrender.com`,
      event.threadID,
      event.messageID
    );

  if (!/^https?:\/\//i.test(url))
    return api.sendMessage(
      "❌ Invalid URL format. Include http:// or https://",
      event.threadID,
      event.messageID
    );

  const waitingMessage = await api.sendMessage(
    "⏳ Taking screenshot, please wait...",
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

    const apiUrl = `${apiBase}/api/ss?url=${encodeURIComponent(url)}`;
    const imageStream = await global.utils.getStreamFromURL(apiUrl);

    await api.sendMessage(
      { body: `✅ Screenshot of ${url}`, attachment: imageStream },
      event.threadID,
      () => api.unsendMessage(waitingMessage.messageID),
      event.messageID
    );
  } catch (err) {
    console.error("❌ SS Command Error:", err.message);
    try { await api.unsendMessage(waitingMessage.messageID); } catch {}
    api.sendMessage(
      "❌ Failed to take screenshot. Please try again later.",
      event.threadID,
      event.messageID
    );
  }
};