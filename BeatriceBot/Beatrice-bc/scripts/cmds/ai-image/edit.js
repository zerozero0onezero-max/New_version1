// scripts/cmds/ai-image/edit.js
// Image editing via Gemini's nano-banana model (gemini-2.5-flash-image)
// through the Replit AI Integrations proxy. Replaces the dead Kay/Saimx69x
// onrender.com endpoint.

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { editImage } = require(path.join(process.cwd(), "utils", "gemini.js"));

module.exports = {
  config: {
    name: "edit",
    version: "2.0",
    author: "sekro",
    countDown: 5,
    role: 0,
    shortDescription: "Edit an image using a text prompt.",
    longDescription: "Reply to a photo and describe how to change it.",
    guide: "{p}edit <prompt> (reply to an image)",
  },

  ncStart: async function ({ api, event, args, message }) {
    const repliedImage = event.messageReply?.attachments?.[0];
    const prompt = args.join(" ").trim();

    if (!repliedImage || repliedImage.type !== "photo") {
      return message.reply(
        "❌ Please reply to an image to edit it.\n\nExample:\n/edit make it anime style"
      );
    }
    if (!prompt) {
      return message.reply("❌ Please provide an edit prompt.");
    }

    const processingMsg = await message.reply("🖌️ Editing image...");
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const imgPath = path.join(cacheDir, `${Date.now()}_edit.png`);

    try {
      // Download the source photo.
      const srcRes = await axios.get(repliedImage.url, {
        responseType: "arraybuffer",
        timeout: 60000,
      });
      const srcBuf = Buffer.from(srcRes.data);
      const srcMime =
        srcRes.headers["content-type"] && srcRes.headers["content-type"].startsWith("image/")
          ? srcRes.headers["content-type"]
          : "image/jpeg";

      const { buffer: outBuf } = await editImage({
        prompt,
        imageBuffer: srcBuf,
        mimeType: srcMime,
      });

      await fs.writeFile(imgPath, outBuf);
      await api.unsendMessage(processingMsg.messageID);
      await message.reply({
        body: `✅ Image edited\n📝 Prompt: ${prompt}`,
        attachment: fs.createReadStream(imgPath),
      });
    } catch (error) {
      console.error("EDIT Error:", error?.message || error);
      try { await api.unsendMessage(processingMsg.messageID); } catch (e) {}
      const m = error?.message || "";
      if (m.includes("Gemini env vars missing")) {
        return message.reply("❌ AI image editing isn't configured on this bot yet.");
      }
      return message.reply("❌ Failed to edit the image. Try again with a clearer prompt.");
    } finally {
      try { if (fs.existsSync(imgPath)) await fs.remove(imgPath); } catch (e) {}
    }
  },
};
