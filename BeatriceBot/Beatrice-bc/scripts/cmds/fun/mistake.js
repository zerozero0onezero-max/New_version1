const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const noobcore =
  "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

async function getApiV1() {
  const res = await axios.get(noobcore, { timeout: 10000 });
  if (!res.data?.apiv1) {
    throw new Error("apiv1 not found in API JSON");
  }
  return res.data.apiv1;
}

module.exports = {
  config: {
    name: "mistake",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 5,
    role: 0,
    shortDescription: "Funny mistake meme generator",
    longDescription: "Tag or reply to someone to create a mistake meme.",
    guide: {
      en: "{pn} @mention or reply to someone",
    },
  },

  ncStart: async function ({ event, message, api }) {
    let targetID = Object.keys(event.mentions)[0];
    if (event.type === "message_reply" && !targetID) {
      targetID = event.messageReply.senderID;
    }

    if (!targetID) {
      return message.reply(
        "Please tag or reply to someone to create a mistake meme!"
      );
    }

    const tmp = path.join(__dirname, "..", "cache");
    await fs.ensureDir(tmp);
    const outputPath = path.join(
      tmp,
      `mistake_${targetID}_${Date.now()}.png`
    );

    try {
      const BASE_URL = await getApiV1();
      const API_URL = `${BASE_URL}/api/mistake?uid=${targetID}`;

      const response = await axios.get(API_URL, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(outputPath, Buffer.from(response.data));

      const userInfo = await api.getUserInfo(targetID);
      const tagName = userInfo[targetID]?.name || "Someone";

      await message.reply({
        body: `@${tagName}`,
        mentions: [{ tag: `@${tagName}`, id: targetID }],
        attachment: fs.createReadStream(outputPath),
      });

      await fs.unlink(outputPath);
    } catch (err) {
      console.error("❌ Mistake Command Error:", err?.message || err);
      message.reply("⚠️ An error occurred. Please try again later.");
    }
  },
};