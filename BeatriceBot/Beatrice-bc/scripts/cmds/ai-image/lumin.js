const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

module.exports = {
  config: {
    name: "lumin",
    version: "1.1",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 5,
    role: 0,
    description: {
      en: "Generate an AI image using Luminar style",
    },
    guide: {
      en: "{pn} <prompt>\nExample: {pn} futuristic dragon flying in space",
    },
  },

  ncStart: async function ({ message, event, args, api, commandName }) {
    const prefix = global.utils?.getPrefix
      ? global.utils.getPrefix(event.threadID)
      : global.BeatriceBC?.config?.prefix || "/";

    const prompt = args.join(" ").trim();
    if (!prompt) {
      return message.reply(
        `⚠️ Please provide a prompt.\nExample: ${prefix}${commandName} futuristic dragon flying in space`
      );
    }

    api.setMessageReaction("🎨", event.messageID, () => {}, true);
    const waitingMsg = await message.reply(
      "🎨 Generating your image... Please wait..."
    );

    const cacheDir = path.join(__dirname, "cache");
    const imgPath = path.join(cacheDir, `lumin_${event.senderID}_${Date.now()}.png`);

    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 180000
      });

      await fs.ensureDir(cacheDir);
      fs.writeFileSync(imgPath, response.data);

      await message.reply(
        {
          body: `✅ Here is your generated image.\n📝 Prompt: ${prompt}`,
          attachment: fs.createReadStream(imgPath),
        },
        () => {
          try { fs.unlinkSync(imgPath); } catch {}
          if (waitingMsg?.messageID) api.unsendMessage(waitingMsg.messageID);
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        }
      );
    } catch (error) {
      console.error("lumin generation error:", error?.message || error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("⚠️ Failed to generate image. Please try again later.");
      if (waitingMsg?.messageID) api.unsendMessage(waitingMsg.messageID);
      try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch {}
    }
  },
};
