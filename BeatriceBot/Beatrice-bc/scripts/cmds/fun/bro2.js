const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {

  config: {
    name: "bro2",
    aliases: ["minebro", "bleachbro"],
    version: "1.3",
    author: "TOSHIRO EDIT",
    role: 0,
    shortDescription: "Minecraft Bleach Duo",
    category: "fun",
    guide: "{pn} @tag / reply"
  },

  langs: {
    en: {
      noTag: "💎 | Tag someone or reply to a message.",
      fail: "❌ | Failed to generate the image."
    }
  },

  ncStart: async function ({ event, api, usersData, getLang }) {

    const senderID = event.senderID;
    let targetID = Object.keys(event.mentions || {})[0];

    if (!targetID && event.messageReply?.senderID) {
      targetID = event.messageReply.senderID;
    }

    if (!targetID) {
      return api.sendMessage(getLang("noTag"), event.threadID, event.messageID);
    }

    try {

      const [senderName, targetName] = await Promise.all([
        usersData.getName(senderID).catch(() => "Bro1"),
        usersData.getName(targetID).catch(() => "Bro2")
      ]);

      const [senderAvatarUrl, targetAvatarUrl] = await Promise.all([
        usersData.getAvatarUrl(senderID),
        usersData.getAvatarUrl(targetID)
      ]);

      const bgURL =
        "https://raw.githubusercontent.com/Toshiro6t9/Bzsb/refs/heads/main/6f1cb6b55548f87bce35366f6e1363b1.jpg";

      const [senderAvatar, targetAvatar, baseImage] = await Promise.all([
        loadImage(senderAvatarUrl),
        loadImage(targetAvatarUrl),
        loadImage(bgURL)
      ]);

      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      const drawCircleAvatar = (avatar, x, y, size) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();
      };

      drawCircleAvatar(senderAvatar, 488, 299, 110);
      drawCircleAvatar(targetAvatar, 170, 285, 110);

      const tmpDir = path.join(__dirname, "tmp");
      await fs.ensureDir(tmpDir);
      const imgPath = path.join(tmpDir, `bro2_${Date.now()}.png`);

      await fs.writeFile(imgPath, canvas.toBuffer("image/png"));

      api.sendMessage(
        {
          body: `💎 ${senderName} & ${targetName} mining through life together!`,
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID,
        event.messageID
      );

      setTimeout(() => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }, 10000);

    } catch (err) {
      console.error(err);
      api.sendMessage(getLang("fail"), event.threadID, event.messageID);
    }
  }

};
