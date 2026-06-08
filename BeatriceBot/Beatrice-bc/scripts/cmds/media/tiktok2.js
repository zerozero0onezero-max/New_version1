const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_JSON =
  "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

/* ====== API LOADER ======== */
async function getApiV1() {
  const res = await axios.get(API_JSON, { timeout: 10000 });
  if (!res.data || !res.data.apiv1) {
    throw new Error("apiv1 not found in API JSON");
  }
  return res.data.apiv1;
}

module.exports = {
  config: {
    name: "tiktok2",
    aliases: ["tt2"],
    version: "2.1",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    role: 0,
    usePrefix: true,
    shortDescription: "Search & download TikTok videos",
    longDescription: "Paginated TikTok search (10 per page)",
    guide: "{p}tiktok2 <keyword>",
    category: "media",
    cooldowns: 5
  },

  /* ======= START ======== */
  ncStart: async function ({ api, event, args }) {
    const query = args.join(" ").trim();
    if (!query) {
      return api.sendMessage(
        "🌀 | Type a keyword!\nExample: /tiktok2 sakura haruka",
        event.threadID,
        event.messageID
      );
    }

    try { api.setMessageReaction("⌛", event.messageID, event.threadID); } catch {}

    try {
      const BASE_URL = await getApiV1();
      const res = await axios.get(
        `${BASE_URL}/api/tiktok?query=${encodeURIComponent(query)}`,
        { timeout: 15000 }
      );

      const results = res.data?.results || res.data?.data || [];
      if (!Array.isArray(results) || results.length === 0) {
        try { api.setMessageReaction("❌", event.messageID, event.threadID); } catch {}
        return api.sendMessage(
          "❌ | No TikTok videos found!",
          event.threadID,
          event.messageID
        );
      }

      try { api.setMessageReaction("✅", event.messageID, event.threadID); } catch {}

      const sliced = results.slice(0, 30);
      await sendPage(api, event, sliced, 1, query);

    } catch (err) {
      console.error("tiktok2 error:", err);
      try { api.setMessageReaction("❌", event.messageID, event.threadID); } catch {}
      api.sendMessage(
        "⚠️ | Failed to fetch TikTok results. Try again later.",
        event.threadID,
        event.messageID
      );
    }
  },

  /* ======= REPLY ========= */
  ncReply: async function ({ api, event, Reply }) {
    if (!Reply || event.senderID !== Reply.author) return;

    const body = event.body.trim().toLowerCase();
    try { api.setMessageReaction("⌛", event.messageID, event.threadID); } catch {}

    /* ===== NEXT PAGE ===== */
    if (body === "next") {
      const nextPage = Reply.page + 1;
      const maxPage = Math.ceil(Reply.results.length / 10);

      if (nextPage > maxPage) {
        try { api.setMessageReaction("❌", event.messageID, event.threadID); } catch {}
        return api.sendMessage(
          "⚠️ | No more results!",
          event.threadID,
          event.messageID
        );
      }

      try { api.unsendMessage(Reply.resultMsgID); } catch {}
      return sendPage(api, event, Reply.results, nextPage, Reply.query);
    }

    /* ===== NUMBER SELECT ===== */
    const choice = Number(body);
    if (isNaN(choice) || choice < 1 || choice > 10) {
      try { api.setMessageReaction("❌", event.messageID, event.threadID); } catch {}
      return api.sendMessage(
        "⚠️ | Reply a number (1–10) or type 'next'.",
        event.threadID,
        event.messageID
      );
    }

    const index = (Reply.page - 1) * 10 + (choice - 1);
    const selected = Reply.results[index];
    if (!selected || !selected.noWatermark) {
      try { api.setMessageReaction("❌", event.messageID, event.threadID); } catch {}
      return api.sendMessage(
        "❌ | Invalid choice!",
        event.threadID,
        event.messageID
      );
    }

    try { api.unsendMessage(Reply.resultMsgID); } catch {}

    /* ===== DOWNLOAD ===== */
    const videoPath = path.join(
      __dirname,
      `cache_tt_${event.senderID}.mp4`
    );

    try {
      const videoRes = await axios.get(selected.noWatermark, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      fs.writeFileSync(videoPath, Buffer.from(videoRes.data));

      api.sendMessage(
        {
          body: `🎬 ${selected.title || "TikTok Video"}`,
          attachment: fs.createReadStream(videoPath)
        },
        event.threadID,
        () => {
          try { fs.unlinkSync(videoPath); } catch {}
        },
        event.messageID
      );
    } catch (e) {
      console.error("Download error:", e);
      api.sendMessage(
        "❌ | Failed to download TikTok video.",
        event.threadID,
        event.messageID
      );
    }
  }
};

/* ====== PAGE SENDER ====== */
async function sendPage(api, event, allResults, page, query) {
  const start = (page - 1) * 10;
  const pageResults = allResults.slice(start, start + 10);

  let text = `🎵 TikTok Results\n🔎 ${query}\n📄 Page ${page}\n\n`;
  const attachments = [];

  for (let i = 0; i < pageResults.length; i++) {
    const v = pageResults[i];
    text += `${i + 1}. 🎬 ${v.title || "Untitled"}\n👁️ ${v.views || 0} views\n\n`;

    // 🔥 IMAGE STREAM (NO SAVE)
    if (v.cover) {
      try {
        const imgStream = await axios.get(v.cover, {
          responseType: "stream",
          timeout: 15000
        });
        attachments.push(imgStream.data);
      } catch {
        // ignore image error
      }
    }
  }

  text += "👉 Reply 1–10 to download\n➡️ Type 'next' for more";

  return new Promise((resolve) => {
    api.sendMessage(
      {
        body: text.trim(),
        attachment: attachments
      },
      event.threadID,
      (err, info) => {
        if (!err) {
          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: "tiktok2",
            author: event.senderID,
            results: allResults,
            query,
            page,
            resultMsgID: info.messageID
          });
        }
        resolve();
      },
      event.messageID
    );
  });
}