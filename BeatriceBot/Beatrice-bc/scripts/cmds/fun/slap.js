const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const DIG_ASSETS = path.join(
  __dirname,
  "../../../node_modules/discord-image-generation/src/assets"
);
const SLAP_BG = path.join(DIG_ASSETS, "batslap.png");

module.exports = {
  config: {
    name: "slap",
    aliases: ["botslap"],
    version: "1.4",
    author: "NC-TOSHIRO",
    countDown: 5,
    role: 0,
    shortDescription: "Batslap image",
    longDescription: "Create a batslap image using avatars",
    category: "fun",
    guide: {
      en: "{pn} @mention"
    },
    atai: true
  },

  langs: {
    en: {
      noTag: "❌ Please mention or reply to a user to slap."
    }
  },

  ncStart: async function ({ event, message, usersData, getLang }) {
    try {
      const senderID = event.senderID;
      let targetID = event.mentions && Object.keys(event.mentions)[0];
      if (!targetID && event.messageReply?.senderID) targetID = event.messageReply.senderID;

      if (!targetID) {
        return message.reply(getLang("noTag"));
      }

      const [senderAvatarURL, targetAvatarURL] = await Promise.all([
        usersData.getAvatarUrl(senderID),
        usersData.getAvatarUrl(targetID)
      ]);

      const [bgImage, senderAvatar, targetAvatar] = await Promise.all([
        loadImage(SLAP_BG),
        loadImage(senderAvatarURL),
        loadImage(targetAvatarURL)
      ]);

      const canvas = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

      const drawCircle = (img, x, y, size) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      };

      drawCircle(senderAvatar, 490, 98,  310);
      drawCircle(targetAvatar, 810, 360, 280);

      const outPath = path.join(
        __dirname,
        "tmp",
        `${senderID}_${targetID}_batslap.png`
      );

      await fs.ensureDir(path.dirname(outPath));
      await fs.writeFile(outPath, canvas.toBuffer("image/png"));

      message.reply(
        {
          body: "😵‍💫",
          attachment: fs.createReadStream(outPath)
        },
        () => { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); }
      );

    } catch (err) {
      console.error("BATSLAP ERROR:", err);
      message.reply("❌ Batslap effect failed.");
    }
  }
};
