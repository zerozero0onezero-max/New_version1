const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "kiss",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore", 
    countDown: 5,
    role: 0,
    description:
      "💋 Create a romantic kiss image between you and your tagged partner! Just tag or reply to someone 💞",
    category: "love",
    guide: {
      en: "{pn} @tag or reply — Generate kiss image 💋"
    }
  },

  langs: {
    en: {
      noTag: "Please tag someone or reply to their message to use this command 💋",
      fail: "❌ | Couldn't generate kiss image,  Please try again later."
    }
  },

  ncStart: async function ({ event, message, usersData, args, getLang }) {
    const uid1 = event.senderID;
    let uid2 = Object.keys(event.mentions || {})[0];
    if (!uid2 && event.messageReply?.senderID) uid2 = event.messageReply.senderID;
    if (!uid2) return message.reply(getLang("noTag"));

    try {
      const [name1, name2] = await Promise.all([
        usersData.getName(uid1).catch(() => "Unknown"),
        usersData.getName(uid2).catch(() => "Unknown")
      ]);

      const [avatar1, avatar2] = await Promise.all([
        usersData.getAvatarUrl(uid1),
        usersData.getAvatarUrl(uid2)
      ]);

      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const apiURL = `${apiBase}/api/kiss?boy=${encodeURIComponent(avatar1)}&girl=${encodeURIComponent(avatar2)}`;

      const response = await axios.get(apiURL, { responseType: "arraybuffer" });

      const savePath = path.join(__dirname, "tmp");
      await fs.ensureDir(savePath);
      const imgPath = path.join(savePath, `${uid1}_${uid2}_kiss.jpg`);
      await fs.writeFile(imgPath, response.data);

      const text = `💋 ${name1} just kissed ${name2}! ❤️`;
      await message.reply({
        body: text,
        attachment: fs.createReadStream(imgPath)
      });

      setTimeout(() => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }, 5000);

    } catch (err) {
      console.error("❌ Kiss command error:", err);
      return message.reply(getLang("fail"));
    }
  }
};
