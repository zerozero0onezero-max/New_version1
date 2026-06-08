const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const AMV_API_URL = "https://toshiro-editz-api.vercel.app/search/amv";

async function getStreamFromURL(url) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 120000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return response.data;
}

module.exports = {

  config: {
    name: "amv",
    aliases: ["anieditz", "aniedit"],
    version: "5.6",
    author: "💻𝑵𝑪-𝑻𝑶𝑺𝑯𝑰𝑹𝑶⚡",
    role: 0,
    shortDescription: "Get anime edit",
    category: "anime",
    guide: "{pn} [query]"
  },

  ncStart: async function ({ api, event, args, langs }) {


    const l = langs?.en || {
      searching: "🔍 Searching AMV...",
      notFound: "❌ No AMV found for your query.",
      fail: "❌ Failed to fetch AMV.",
      timeout: "⏱️ Timeout! Try again."
    };

    api.setMessageReaction("✨", event.messageID, event.threadID, () => {}, true);

    const query = args.join(" ").trim() || "random";

    try {

      api.sendMessage(l.searching, event.threadID, event.messageID);

      const res = await axios.get(
        `${AMV_API_URL}?keyword=${encodeURIComponent(query)}`,
        { timeout: 60000 }
      );

      const data = res.data;

      if (!data?.success || !data?.downloadUrl) {
        api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
        return api.sendMessage(l.notFound, event.threadID, event.messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const filePath = path.join(cacheDir, `amv_${Date.now()}.mp4`);
      const videoUrl = data.downloadUrl.replace("http://", "https://");

      const stream = await getStreamFromURL(videoUrl);
      const writer = fs.createWriteStream(filePath);
      stream.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const stats = fs.statSync(filePath);
      if (stats.size === 0) throw new Error("Empty file");

      
      const styledBody = `┏━━━━━━━━━━━━━┓
🎬 Anime Edit Incoming!
💠 Title: ${data.title || "Unknown"}
📊 Size: ${data.size || "Unknown"}
💖 Watch & feel the hype!
┗━━━━━━━━━━━━━┛`;

      api.sendMessage(
        {
          body: styledBody,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        () => {
          
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        },
        event.messageID
      );

      api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);

    } catch (err) {
      console.error("[AMV CMD ERROR]", err.message);
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);

      if (err.code === "ECONNABORTED") {
        return api.sendMessage(l.timeout, event.threadID, event.messageID);
      }

      api.sendMessage(l.fail, event.threadID, event.messageID);
    }
  }

};
