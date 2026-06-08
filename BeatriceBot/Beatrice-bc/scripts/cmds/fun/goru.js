const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const jimp = require("jimp");

module.exports = {
  config: {
    name: "goru",
    version: "1.0.3",
    author: "NoobCore Team", // by ARIJIT
    countDown: 5,
    role: 0,
    shortDescription: "Expose someone as a Goru!",
    longDescription: "Puts the tagged/replied user's face on a cow's body (fun meme)",
    guide: {
      en: "{pn} @mention or reply to someone to make them a cow 😂",
    },
  },

  ncStart: async function ({ event, message, api }) {
    let targetID = Object.keys(event.mentions)[0];
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    }

    if (!targetID) {
      return message.reply("❗ Tag or reply to someone to turn them into a goru!");
    }

    if (targetID === event.senderID) {
      return message.reply("❗ Bro, why would you cow yourself?");
    }

    const baseFolder = path.join(__dirname, "goru_cache");
    if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);

    const bgPath = path.join(baseFolder, "cow_bg.jpg");
    const uniqueID = `${targetID}_${Date.now()}`;
    const avatarPath = path.join(baseFolder, `avatar_${uniqueID}.png`);
    const outputPath = path.join(baseFolder, `goru_result_${uniqueID}.png`);

    try {
      // Download cow background if not already cached
      const cowImgUrl = "https://i.ibb.co/PZxMpPmC/0a428ef73ef4.jpg";
      if (!fs.existsSync(bgPath)) {
        const res = await axios.get(cowImgUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(bgPath, res.data);
      }

      // Download user's avatar from Facebook
      const avatarBuffer = (
        await axios.get(
          `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
          { responseType: "arraybuffer" }
        )
      ).data;
      await fs.writeFile(avatarPath, avatarBuffer);

      // Process avatar
      const avatarImg = await jimp.read(avatarPath);
      avatarImg.circle().resize(130, 130);
      await avatarImg.writeAsync(avatarPath);

      // Load background cow image
      const bg = await jimp.read(bgPath);
      bg.resize(600, 800);

      const avatarCircle = await jimp.read(avatarPath);

      // Custom placement: center of cow's head
      const x = 145; // Adjust this if needed
      const y = 100;  // Adjust this if needed

      bg.composite(avatarCircle, x, y);

      // Output final image
      const finalBuffer = await bg.getBufferAsync(jimp.MIME_PNG);
      fs.writeFileSync(outputPath, finalBuffer);

      const userInfo = await api.getUserInfo(targetID);
      const tagName = userInfo[targetID]?.name || "Someone";

      await message.reply(
        {
          body: `🤣😹\n${tagName} এখন একদম আসল গরু হয়েছে বিদেশী গরু! 🐮✨`,
          mentions: [{ tag: tagName, id: targetID }],
          attachment: fs.createReadStream(outputPath),
        },
        () => {
          try {
            fs.unlinkSync(avatarPath);
            fs.unlinkSync(outputPath);
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        }
      );
    } catch (err) {
      console.error("❌ Goru Command Error:", err);
      return message.reply("⚠️ সমস্যা হইসে ভাই! আবার try করো।");
    }
  },
};