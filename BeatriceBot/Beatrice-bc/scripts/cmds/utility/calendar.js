const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cacheDirectory = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "calendar",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore", 
    shortDescription: "🗓️ English Calendar",
    longDescription: "Fetches calendar image for Asia/Dhaka",
    guide: { en: "{p}calendar" }
  },

  ncStart: async function ({ api, event }) {
    try {
      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const response = await axios.get(`${apiBase}/api/calendar`, { responseType: "arraybuffer" });
      const imgBuffer = Buffer.from(response.data, "binary");

      await fs.ensureDir(cacheDirectory);
      const filePath = path.join(cacheDirectory, "calendar.png");
      await fs.writeFile(filePath, imgBuffer);

      api.sendMessage(
        { attachment: fs.createReadStream(filePath) },
        event.threadID,
        event.messageID
      );

    } catch (err) {
      console.error("Calendar command error:", err.message);
      api.sendMessage(
        "❌ Failed to fetch calendar image. Please try again later. ",
        event.threadID,
        event.messageID
      );
    }
  }
};