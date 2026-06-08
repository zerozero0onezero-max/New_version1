const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "wanted",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 5,
    role: 0,
    description: "Make a wanted poster 😎",
    guide: {
      en: "{pn} @tag or reply or just run (your own avatar)"
    }
  },

  ncStart: async function ({ event, message, usersData }) {
    try {
      let targetID;

      if (Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      } else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      } else {
        targetID = event.senderID;
      }

      const userInfo = await usersData.getName(targetID);
      const avatarURL = await usersData.getAvatarUrl(targetID);

      const apiBaseRes = await axios.get("https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json");
      const apiBase = apiBaseRes.data?.apiv1;
      if (!apiBase) return message.reply("❌ API base URL missing.");

      const apiURL = `${apiBase}/api/wanted?url=${encodeURIComponent(avatarURL)}`;
      const imgPath = path.join(__dirname, "tmp", `${targetID}_wanted.png`);

      const response = await axios.get(apiURL, { responseType: "arraybuffer" });
      await fs.outputFile(imgPath, response.data);

      await message.reply({
        body: `🎯 Target: ${userInfo}`,
        attachment: fs.createReadStream(imgPath)
      });

      fs.unlinkSync(imgPath);

    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to generate wanted poster. Please try again later.");
    }
  }
};