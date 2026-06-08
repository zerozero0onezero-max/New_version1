const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "cat",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    version: "1.0",
    role: 0,
    category: "image",
    shortDescription: { en: "🐱 Send a random cat image" },
    longDescription: { en: "Fetches a random cat image." },
    guide: { en: "{p}{n} — Shows a random cat image" }
  },

  ncStart: async function({ api, event }) {
    try {
      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const apiUrl = `${apiBase}/api/cat`;
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const tempPath = path.join(cacheDir, `cat_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, buffer);

      await api.sendMessage(
        {
          body: "🐱 Here's a random cat for you!",
          attachment: fs.createReadStream(tempPath)
        },
        event.threadID,
        () => fs.unlinkSync(tempPath),
        event.messageID
      );

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Failed to fetch cat image.\n" + err.message, event.threadID, event.messageID);
    }
  }
};