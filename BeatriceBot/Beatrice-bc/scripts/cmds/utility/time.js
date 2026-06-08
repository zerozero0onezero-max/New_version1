const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "time",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    role: 0,
    countDown: 3,
    shortDescription: "Fetches stylish time card",
    category: "tools",
    guide: "/time - Get current  time card"
  },

  ncStart: async ({ message }) => {
    try {
      const wait = await message.reply("⚡ Fetching time card...");

      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const response = await axios.get(`${apiBase}/api/time`, { responseType: "stream" });

      const tmpDir = path.join(__dirname, "cache");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const filePath = path.join(tmpDir, `time_card_${Date.now()}.png`);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.unsend(wait.messageID);
      return message.reply({ attachment: fs.createReadStream(filePath) });

    } catch (err) {
      console.error("Time command error:", err.message);
      return message.reply("❌ Failed to fetch time card. Please try again later");
    }
  }
};