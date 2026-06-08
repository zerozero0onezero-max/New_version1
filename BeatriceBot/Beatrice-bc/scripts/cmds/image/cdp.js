const axios = require("axios");

module.exports = {
  config: {
    name: "cdp",
    aliases: ["coupledp"],
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 5,
    role: 0,
    shortDescription: "Random Couple DP",
    longDescription: "Send random couple DP",
    category: "image",
    guide: "{pn}"
  },

  ncStart: async function ({ api, event }) {
    try {
      const noobcore = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
      const apiRes = await axios.get(noobcore);
      const baseUrl = apiRes.data.saimx69x;

      const res = await axios.get(`${baseUrl}/api/cdp2`);
      const { boy, girl } = res.data;

      api.sendMessage(
        {
          body: "𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 𝐜𝐝𝐩! 😘✨️",
          attachment: await Promise.all([
            global.utils.getStreamFromURL(girl),
            global.utils.getStreamFromURL(boy)
          ])
        },
        event.threadID,
        event.messageID
      );

    } catch (e) {
      api.sendMessage("❌ 𝐎𝐩𝐩𝐬! 𝐒𝐨𝐦𝐞𝐭𝐡𝐢𝐧𝐠 𝐰𝐞𝐧𝐭 𝐰𝐫𝐨𝐧𝐠. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐭𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐥𝐚𝐭𝐞𝐫.", event.threadID, event.messageID);
      console.error(e.message);
    }
  }
};
