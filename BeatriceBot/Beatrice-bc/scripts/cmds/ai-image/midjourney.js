// scripts/cmds/ai-image/midjourney.js
// Original mj endpoint (midjanuarybyxnil.onrender.com) is dead. Switched to
// pollinations.ai with the high-quality "flux" model. Behaviour: generate up
// to 4 variations and return them. Aliases (midjourney / mj / imagine) kept.

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

async function fetchVariation(prompt, seed) {
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 180000 });
  return Buffer.from(res.data);
}

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "imagine"],
    version: "1.1.0",
    author: "sekro",
    role: 0,
    usePrefix: true,
    description: "Generate AI images from a text prompt (4 variations).",
    guide: "{p}midjourney <prompt>",
    category: "ai",
    cooldowns: 5,
  },

  ncStart: async function ({ api, event, args, message }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return message.reply("❌ Please provide a prompt\nExample: midjourney Naruto Uzumaki");
    }

    api.setMessageReaction("⌛", event.messageID, () => {}, true);
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const baseSeed = Math.floor(Math.random() * 1_000_000);
    const seeds = [baseSeed, baseSeed + 1, baseSeed + 2, baseSeed + 3];
    const filePaths = [];

    try {
      const buffers = await Promise.all(seeds.map((s) => fetchVariation(prompt, s)));
      for (let i = 0; i < buffers.length; i++) {
        const fp = path.join(cacheDir, `mj_${event.senderID}_${baseSeed}_${i + 1}.png`);
        fs.writeFileSync(fp, buffers[i]);
        filePaths.push(fp);
      }

      api.setMessageReaction("✅", event.messageID, () => {}, true);
      return message.reply(
        {
          body: `🎨 4 variations for: "${prompt}"`,
          attachment: filePaths.map((fp) => fs.createReadStream(fp)),
        },
        () => {
          for (const fp of filePaths) {
            try { fs.unlinkSync(fp); } catch {}
          }
        }
      );
    } catch (err) {
      console.error("midjourney error:", err?.message || err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      for (const fp of filePaths) {
        try { fs.unlinkSync(fp); } catch {}
      }
      return message.reply("❌ Failed to generate images. Try again later.");
    }
  },
};
