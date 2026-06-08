const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "delete",
    aliases: ["del", "d"],
    version: "6.0",
    author: "𝑵𝑪-𝑿𝑵𝑰𝑳",
    role: 3,
    countDown: 2,
    category: "utility",
    shortDescription: "Auto delete images, videos & audios",
    longDescription:
      "Automatically scans all folders and deletes image, video, and audio files safely. JS files require manual confirmation.",
    guide: {
      en:
        "{pn} → Delete images + videos + audios (auto scan)\n" +
        "{pn} images → Delete images only\n" +
        "{pn} videos → Delete videos only\n" +
        "{pn} audios → Delete audios only\n" +
        "{pn} js <file>.js → Delete a JS file manually"
    }
  },

  ncStart: async function ({ args, api, event }) {
    try {
      const action = args[0];
      const fileName = args[1];

      const ROOT = process.cwd();
      const CMD_DIR = __dirname;

      const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const VIDEO_EXT = [".mp4", ".mkv", ".avi", ".mov", ".webm"];
      const AUDIO_EXT = [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"];

      let imgCount = 0;
      let vidCount = 0;
      let audCount = 0;

      /* ===== RECURSIVE SCAN ===== */
      const scanAndDelete = (dir) => {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item === "node_modules") continue;

          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanAndDelete(fullPath);
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();

            const isImage = IMAGE_EXT.includes(ext);
            const isVideo = VIDEO_EXT.includes(ext);
            const isAudio = AUDIO_EXT.includes(ext);

            if (
              (action !== "videos" && action !== "audios" && isImage) ||
              (action !== "images" && action !== "audios" && isVideo) ||
              (action !== "images" && action !== "videos" && isAudio)
            ) {
              fs.unlinkSync(fullPath);
              if (isImage) imgCount++;
              else if (isVideo) vidCount++;
              else if (isAudio) audCount++;
            }
          }
        }
      };

      /* ===== MANUAL JS DELETE ===== */
      if (action === "js") {
        if (!fileName || !fileName.endsWith(".js")) {
          return api.sendMessage(
            "⚠️ | Correct usage:\n`delete js example.js`",
            event.threadID
          );
        }

        let foundPath = null;

        const findFile = (dir) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            if (item === "node_modules") continue;

            const full = path.join(dir, item);
            const stat = fs.statSync(full);

            if (stat.isDirectory()) {
              findFile(full);
            } else if (item === fileName) {
              foundPath = full;
              return;
            }
          }
        };

        findFile(ROOT);

        if (!foundPath) {
          return api.sendMessage(
            `❌ | File "${fileName}" not found.`,
            event.threadID
          );
        }

        fs.unlinkSync(foundPath);
        return api.sendMessage(
          `🗑️ | "${fileName}" deleted successfully ✅`,
          event.threadID
        );
      }

      /* ===== START AUTO SCAN ===== */
      scanAndDelete(ROOT);

      const total = imgCount + vidCount + audCount;

      return api.sendMessage(
        total
          ? `🧹 | Media cleanup completed ✅\n\n` +
            `🖼️ Images deleted: ${imgCount}\n` +
            `🎥 Videos deleted: ${vidCount}\n` +
            `🎵 Audios deleted: ${audCount}`
          : "🚫 | No images, videos, or audios found.",
        event.threadID
      );

    } catch (err) {
      console.error(err);
      return api.sendMessage(
        `❌ | Error occurred: ${err.message}`,
        event.threadID
      );
    }
  }
};