const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// lazy-load sharp so a missing binary doesn't crash the whole bot at startup
let _sharp = null;
function getSharp() {
  if (_sharp) return _sharp;
  try { _sharp = require("sharp"); } catch (_) { _sharp = null; }
  return _sharp;
}

module.exports.config = {
  name: "imagedetail",
  aliases: ["imgdetail"],
  version: "1.0",
  author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
  team: "NoobCore", 
  countDown: 5,
  role: 0,
  description: "Show detailed metadata of an image",
  guide: "{pn} reply to an image"
};

module.exports.ncStart = async ({ api, event }) => {
  try {
    const attachment = event.messageReply?.attachments?.[0];
    if (!attachment || attachment.type !== "photo") {
      return api.sendMessage(
        "📸 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚 𝐩𝐡𝐨𝐭𝐨 𝐭𝐨 𝐠𝐞𝐭 𝐢𝐭𝐬 𝐝𝐞𝐭𝐚𝐢𝐥𝐬!",
        event.threadID,
        event.messageID
      );
    }

    const imgUrl = attachment.url;

    const imgBuffer = await axios
      .get(imgUrl, { responseType: "arraybuffer" })
      .then(res => res.data);

    const tempPath = path.join(__dirname, `temp_${Date.now()}.jpg`);
    await fs.writeFile(tempPath, imgBuffer);

    const sharpLib = getSharp();
    if (!sharpLib) {
      await fs.remove(tempPath).catch(() => {});
      return api.sendMessage(
        "⚠️ Image analysis is unavailable (sharp module not installed).\nBot admin needs to run: npm install --os=linux --cpu=x64 sharp",
        event.threadID, event.messageID
      );
    }
    const metadata = await sharpLib(imgBuffer).metadata();

    function approximateRatio(width, height) {
      const ratioDecimal = width / height;

      const standardRatios = [
        { ratio: 1, label: "1:1" },
        { ratio: 4 / 3, label: "4:3" },
        { ratio: 3 / 2, label: "3:2" },
        { ratio: 16 / 9, label: "16:9" },
        { ratio: 9 / 16, label: "9:16" },
        { ratio: 21 / 9, label: "21:9" },
        { ratio: 3 / 4, label: "3:4" },
        { ratio: 2 / 3, label: "2:3" },
      ];

      let closest = standardRatios[0];
      let minDiff = Math.abs(ratioDecimal - closest.ratio);

      for (const r of standardRatios) {
        const diff = Math.abs(ratioDecimal - r.ratio);
        if (diff < minDiff) {
          minDiff = diff;
          closest = r;
        }
      }

      return closest.label;
    }

    let ratio = "N/A";
    let orientationType = "N/A";

    if (metadata.width && metadata.height) {
      ratio = approximateRatio(metadata.width, metadata.height);

      if (metadata.width > metadata.height) orientationType = "Landscape";
      else if (metadata.width < metadata.height) orientationType = "Portrait";
      else orientationType = "Square";
    }

    const caption =
      `✨ 𝐈𝐦𝐚𝐠𝐞 𝐃𝐞𝐭𝐚𝐢𝐥𝐬 ✨\n\n` +
      `⦿ 𝐅𝐨𝐫𝐦𝐚𝐭: ${metadata.format || "Unknown"}\n` +
      `⦿ 𝐖𝐢𝐝𝐭𝐡: ${metadata.width || 0}px\n` +
      `⦿ 𝐇𝐞𝐢𝐠𝐡𝐭: ${metadata.height || 0}px\n` +
      `⦿ 𝐀𝐬𝐩𝐞𝐜𝐭 𝐑𝐚𝐭𝐢𝐨: ${ratio} (${orientationType})\n` +
      `⦿ 𝐅𝐢𝐥𝐞 𝐒𝐢𝐳𝐞: ${(imgBuffer.byteLength / 1024).toFixed(2)} KB (${(imgBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB)\n` +
      `⦿ 𝐁𝐢𝐭 𝐃𝐞𝐩𝐭𝐡: ${metadata.depth || "N/A"}\n` +
      `⦿ 𝐂𝐡𝐚𝐧𝐧𝐞𝐥𝐬: ${metadata.channels || "N/A"}\n` +
      `⦿ 𝐂𝐨𝐥𝐨𝐫 𝐒𝐩𝐚𝐜𝐞: ${metadata.space || "N/A"}\n` +
      `⦿ 𝐇𝐚𝐬 𝐀𝐥𝐩𝐡𝐚: ${metadata.hasAlpha ? "Yes" : "No"}\n` +
      `⦿ 𝐂𝐨𝐦𝐩𝐫𝐞𝐬𝐬𝐢𝐨𝐧: ${metadata.compression || "N/A"}\n` +
      `⦿ 𝐎𝐫𝐢𝐞𝐧𝐭𝐚𝐭𝐢𝐨𝐧: ${metadata.orientation || "N/A"}\n` +
      `⦿ 𝐏𝐫𝐨𝐠𝐫𝐞𝐬𝐬𝐢𝐯𝐞: ${metadata.isProgressive ? "Yes" : "No"}`;

    await api.sendMessage(
      {
        body: caption,
        attachment: fs.createReadStream(tempPath)
      },
      event.threadID,
      async () => await fs.remove(tempPath),
      event.messageID
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage(
      "⚠️ 𝐎𝐨𝐩𝐬! 𝐒𝐨𝐦𝐞𝐭𝐡𝐢𝐧𝐠 𝐰𝐞𝐧𝐭 𝐰𝐫𝐨𝐧𝐠.\n💬 𝐏𝐥𝐞𝐚𝐬𝐞 𝐭𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐥𝐚𝐭𝐞𝐫!",
      event.threadID,
      event.messageID
    );
  }
};