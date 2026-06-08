const axios = require("axios");
const fs = require("fs");
const path = require("path");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = {
  config: {
    name: "pixel",
    aliases: ["pexel", "img"],
    version: "1.2",
    author: "NC-XNIL",
    countDown: 5,
    role: 0,
    shortDescription: "Search pixel images using raw API URL",
    longDescription: "Fetch images from API URL defined in raw JSON and send as a single album",
    category: "boxchat",
    guide: {
      en: "{pn} <keyword> -<count>"
    }
  },

  langs: {
    en: {
      noQuery: "❌ Please enter a search keyword.\nExample: {pn} nature -10",
      searching: "🔎 Searching images for: %1 ...",
      noResults: "⚠️ No images found for '%1'.",
      error: "❌ Failed to fetch images. Try again later."
    }
  },

  ncStart: async function ({ api, args, message, getLang }) {
    if (!args.length) return message.reply(getLang("noQuery"));

    let count = 10;
    let keywords = [];

    for (const arg of args) {
      if (arg.startsWith("-") && !isNaN(arg.slice(1))) {
        count = Math.min(30, Math.max(1, Number(arg.slice(1))));
      } else {
        keywords.push(arg);
      }
    }

    const query = keywords.join(" ").trim();
    if (!query) return message.reply(getLang("noQuery"));

    await message.reply(getLang("searching", query));

    try {
      const rawURL = "https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json";
      const apiList = await axios.get(rawURL);
      const pixelAPI = apiList.data.Pixel;

      if (!pixelAPI) throw new Error("Pixel API URL not found in raw JSON");

      const apiUrl = `${pixelAPI}?search=${encodeURIComponent(query)}&count=${count}`;
      const res = await axios.get(apiUrl, { timeout: 20000 });
      
      const images = res.data.data || res.data.images;
      if (!images || !Array.isArray(images) || !images.length) {
        return message.reply(getLang("noResults", query));
      }

      const selected = images.slice(0, count);
      const attachments = [];

      for (let i = 0; i < selected.length; i++) {
        const imgUrl = selected[i];
        const imgPath = path.join(__dirname, `pixel_${Date.now()}_${i}.jpg`);
        const img = await axios.get(imgUrl, { responseType: "arraybuffer" });
        await fs.promises.writeFile(imgPath, img.data);
        attachments.push(fs.createReadStream(imgPath));
        await sleep(200);
      }

      await message.reply({
        body: `🖼️ Pixel Images\n🔍 ${query}\n📦 Total: ${attachments.length}`,
        attachment: attachments
      });

      for (const file of attachments) {
        try { fs.unlinkSync(file.path); } catch {}
      }

    } catch (err) {
      console.error("Pixel Error:", err);
      return message.reply(getLang("error"));
    }
  }
};