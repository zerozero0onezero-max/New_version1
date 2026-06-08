const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const DIG_ASSETS = path.join(
  __dirname,
  "../../../node_modules/discord-image-generation/src/assets"
);
const GAY_OVERLAY = path.join(DIG_ASSETS, "gay.png");

module.exports = {
  config: {
    name: "gay",
    version: "1.3",
    author: "NC-TOSHIRO",
    countDown: 1,
    role: 0,
    shortDescription: "Apply rainbow gay effect",
    longDescription: "Add rainbow overlay effect on avatar",
    category: "fun",
    guide: "{pn} [mention | reply | self]",
    atai: true
  },

  ncStart: async function ({ event, message, usersData }) {
    try {
      let uid;

      if (event.messageReply) {
        uid = event.messageReply.senderID;
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      } else {
        uid = event.senderID;
      }

      const avatarURL = await usersData.getAvatarUrl(uid);

      const [avatarImg, gayOverlay] = await Promise.all([
        loadImage(avatarURL),
        loadImage(GAY_OVERLAY)
      ]);

      const size = 512;
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(avatarImg, 0, 0, size, size);
      ctx.drawImage(gayOverlay, 0, 0, size, size);

      const outPath = path.join(__dirname, "tmp", `${uid}_gay.png`);
      await fs.ensureDir(path.dirname(outPath));
      await fs.writeFile(outPath, canvas.toBuffer("image/png"));

      message.reply(
        { attachment: fs.createReadStream(outPath) },
        () => { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); }
      );

    } catch (e) {
      console.error(e);
      message.reply("❌ Effect apply kora jay nai");
    }
  }
};
