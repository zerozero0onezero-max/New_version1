const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ownerInfo = {
  name: "NoobCore",
  facebook: "https://facebook.com/NoobCore",
  telegram: "@noobcore404",
  supportGroup: "https://m.me/noobcore404"
};

module.exports = {
  config: {
    name: "botjoin",
    version: "2.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    category: "events"
  },

  ncStart: async function ({ event, api }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const botID = api.getCurrentUserID();
    const addedUsers = logMessageData.addedParticipants;

    const isBotAdded = addedUsers.some(u => u.userFbId === botID);
    if (!isBotAdded) return;

    const nickNameBot = global.BeatriceBC.ncsetting.nickNameBot || global.BeatriceBC.config?.botName || "Beatrice bc";
    const prefix = global.utils.getPrefix(threadID);
    const BOT_UID = botID;

    try {
      await api.changeNickname(nickNameBot, threadID, botID);
    } catch (e) {
      console.warn("⚠️ Nickname change failed:", e.message);
    }

    try {
      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const apiRes = await axios.get(noobcore);
      const baseUrl = apiRes.data.apiv1;

      const apiUrl =
        `${baseUrl}/api/botjoin` +
        `?botuid=${BOT_UID}` +
        `&prefix=${encodeURIComponent(prefix)}`;

      const cacheDir = path.join(__dirname, "..", "cache");
      await fs.ensureDir(cacheDir);
      const imagePath = path.join(cacheDir, `botjoin_${threadID}.png`);

      const imgRes = await axios.get(apiUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, imgRes.data);

      const textMsg = [
        "🎀 𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 🎀",
        `🔹 𝐁𝐨𝐭 𝐩𝐫𝐞𝐟𝐢𝐱: ${prefix}`,
        `🔸 𝐓𝐲𝐩𝐞: ${prefix}help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `👑 𝐎𝐰𝐧𝐞𝐫: ${ownerInfo.name}`,
        `🌐 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: ${ownerInfo.facebook}`,
        `✈️ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: ${ownerInfo.telegram}`,
        `🤖 𝐉𝐨𝐢𝐧 𝐒𝐮𝐩𝐩𝐨𝐫𝐭 𝐆𝐂: ${ownerInfo.supportGroup}`
      ].join("\n");

      await api.sendMessage(
        {
          body: textMsg,
          attachment: fs.createReadStream(imagePath)
        },
        threadID
      );

      fs.unlinkSync(imagePath);

    } catch (err) {
      console.error("⚠️ BotJoin Error:", err.message);

      const fallbackMsg = [
        "🎀 𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 🎀",
        `🔹 𝐁𝐨𝐭 𝐩𝐫𝐞𝐟𝐢𝐱: ${prefix}`,
        `🔸 𝐓𝐲𝐩𝐞: ${prefix}help`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `👑 𝐎𝐰𝐧𝐞𝐫: ${ownerInfo.name}`,
        `🌐 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: ${ownerInfo.facebook}`,
        `✈️ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: ${ownerInfo.telegram}`,
        `🤖 𝐉𝐨𝐢𝐧 𝐒𝐮𝐩𝐩𝐨𝐫𝐭 𝐆𝐂: ${ownerInfo.supportGroup}`
      ].join("\n");

      api.sendMessage(fallbackMsg, threadID);
    }
  }
};