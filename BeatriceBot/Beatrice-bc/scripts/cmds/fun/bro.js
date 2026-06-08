const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {

  config: {
    name: "bro",
    aliases: ["bestie", "nakama"],
    version: "1.2",
    author: "💻𝑵𝑪-𝑻𝑶𝑺𝑯𝑰𝑹𝑶⚡",
    role: 0,
    shortDescription: "Bond image generator",
    category: "fun",
    guide: "{pn} @tag / reply"
  },

  langs: {
    en: {
      noTag: "🤝 | Tag someone or reply to a message.",
      fail: "❌ | Image generate failed.",
      replyMsg: "😏 | Bro bond getting stronger!"
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
        usersData.getName(senderID).catch(() => "Bro"),
        usersData.getName(targetID).catch(() => "Nakama")
      ]);

      const [senderAvatarUrl, targetAvatarUrl] = await Promise.all([
        usersData.getAvatarUrl(senderID),
        usersData.getAvatarUrl(targetID)
      ]);

      const bgURL =
        "https://raw.githubusercontent.com/Toshiro6t9/Bzsb/refs/heads/main/6f676d2d9ecbb564f42e08a0196832e5.jpg";

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

      drawCircleAvatar(senderAvatar, 190, 60, 120);
      drawCircleAvatar(targetAvatar, 400, 98, 120);

      const tmpDir = path.join(__dirname, "tmp");
      await fs.ensureDir(tmpDir);

      const imgPath = path.join(tmpDir, `bro_${senderID}_${targetID}.png`);
      await fs.writeFile(imgPath, canvas.toBuffer("image/png"));

      api.sendMessage(
        {
          body: `🤝 ${senderName} & ${targetName} = Ultimate Duo!`,
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID,
        (err, info) => {
          if (err) return;

          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: "bro",
            author: senderID,
            targetID
          });
        },
        event.messageID
      );

      setTimeout(() => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }, 8000);

    } catch (e) {
      console.error(e);
      api.sendMessage(getLang("fail"), event.threadID, event.messageID);
    }
  },

  ncReply: async function ({ event, api, Reply, getLang }) {

    if (event.senderID !== Reply.author) return;

    api.sendMessage(
      getLang("replyMsg"),
      event.threadID,
      event.messageID
    );
  }

};
