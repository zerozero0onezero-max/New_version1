const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "jail",
    version: "1.1",
    author: "NC-TOSHIRO",
    role: 0,
    category: "fun",
    atai: true,
    guide: "{pn} [mention | reply | self]"
  },

  ncStart: async ({ event, message, usersData }) => {
    try {
      const uid = event.messageReply
        ? event.messageReply.senderID
        : event.mentions && Object.keys(event.mentions).length
        ? Object.keys(event.mentions)[0]
        : event.senderID;

      const avatarURL = await usersData.getAvatarUrl(uid);

      const apiURL = `https://api.popcat.xyz/jail?image=${encodeURIComponent(avatarURL)}`;
      const res = await axios.get(apiURL, { responseType: "arraybuffer", timeout: 15000 });

      const p = path.join(__dirname, "tmp", `${uid}_jail.png`);
      await fs.ensureDir(path.dirname(p));
      await fs.writeFile(p, res.data);

      message.reply({ attachment: fs.createReadStream(p) }, () => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    } catch {
      message.reply("❌ Jail effect failed");
    }
  }
};
