const A = require("axios");
const B = require("fs");
const C = require("path");
const D = require("yt-search");
const E = require("node-fetch");

const nc = "aryan";
const F = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
const cachePath = C.join(__dirname, "cache");

if (!B.existsSync(cachePath)) {
  B.mkdirSync(cachePath, { recursive: true });
}

module.exports = {
  config: {
    name: "video",
    aliases: ["v"],
    version: "0.0.1",
    author: "NC ArYAN",
    countDown: 5,
    role: 0,
    team: "NoobCore",
    shortDescription: "Download YouTube video interactively",
    longDescription: "Search YouTube display a list of 6 videos and download the selected one",
    category: "MUSIC",
    guide: "/video [video name]"
  },

  ncStart: async function({ api, event, args }) {
    if (!args.length) return api.sendMessage("❌ Missing video name", event.threadID, event.messageID);
    const G = args.join(" ");
    try {
      const H = await D(G);
      if (!H || !H.videos.length) throw new Error("No video");
      const I = H.videos.slice(0, 6);
      let J = "🔎 Found 6 videos. Reply with the number to download\n\n";
      const K = [];
      const L = [];

      for (let i = 0; i < I.length; i++) {
        const M = I[i];
        const thumbPath = C.join(cachePath, `thumb_${Date.now()}_${i}.jpg`);
        const N = await A.get(M.thumbnail, { responseType: 'arraybuffer' });
        B.writeFileSync(thumbPath, Buffer.from(N.data));
        L.push(B.createReadStream(thumbPath));
        
        const O = M.views.toLocaleString();
        J += `${i + 1}. ${M.title}\nTime: ${M.timestamp}\nChannel: ${M.author.name}\n\n`;
        K.push({ title: M.title, url: M.url, channel: M.author.name, views: O });
      }

      const P = await api.sendMessage({ body: J, attachment: L }, event.threadID);
      
      global.BeatriceBC.ncReply.set(P.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        videos: K,
        listMessageID: P.messageID
      });
    } catch (err) {
      api.sendMessage(`❌ Error: ${err.message}`, event.threadID, event.messageID);
    }
  },

  ncReply: async function({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;
    
    const R = parseInt(event.body.trim());
    if (isNaN(R) || R < 1 || R > Reply.videos.length) {
      return api.sendMessage("❌ Invalid selection. Choose 1-6.", event.threadID, event.messageID);
    }

    if (Reply.listMessageID) {
      api.unsendMessage(Reply.listMessageID);
    }

    const S = Reply.videos[R - 1];
    const waitMsg = await api.sendMessage(`⏳ Downloading: ${S.title}...`, event.threadID, event.messageID);

    try {
      const V = await A.get(F);
      const U = V.data && V.data.aryan;
      if (!U) throw new Error("API Config error.");

      const W = `${U}/${nc}/ytdl?url=${encodeURIComponent(S.url)}&type=video`;
      const X = await A.get(W);

      if (!X.data.status || !X.data.downloadUrl) {
        throw new Error("Could not fetch download link.");
      }

      const Y = X.data.downloadUrl;
      const fileName = `${Date.now()}.mp4`;
      const filePath = C.join(cachePath, fileName);

      const response = await E(Y);
      const buffer = await response.buffer();
      B.writeFileSync(filePath, buffer);

      const msgBody = `• Title: ${S.title}\n• Channel: ${S.channel}\n• Quality: ${X.data.quality || '720p'}`;
      
      api.unsendMessage(waitMsg.messageID);

      await api.sendMessage({
        body: msgBody,
        attachment: B.createReadStream(filePath)
      }, event.threadID, () => {
        if (B.existsSync(filePath)) B.unlinkSync(filePath);
      }, event.messageID);

      global.BeatriceBC.ncReply.delete(event.messageReply.messageID);
    } catch (err) {
      api.unsendMessage(waitMsg.messageID);
      api.sendMessage(`❌ Error: ${err.message}`, event.threadID, event.messageID);
    }
  }
};