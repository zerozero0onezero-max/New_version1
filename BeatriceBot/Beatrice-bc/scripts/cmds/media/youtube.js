const a = require("yt-search");
const b = require("axios");
const { PassThrough } = require("stream");

const nix = "https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json";

async function f(g) {
  const h = await b.get(g, { responseType: "stream" });
  return h.data;
}

module.exports = {
  config: {
    name: "youtube",
    aliases: ["ytb"],
    version: "1.0.0-nofs",
    author: "NC-ArYAN",
    team: "NoobCore",
    countDown: 5,
    role: 0,
    description: { en: "Search and download YouTube video/audio (no file save)" },
    category: "media",
    guide: { en: "{pn} -v <query|url>\n{pn} -a <query|url>" }
  },

  ncStart: async function ({ api: i, args, event: k, commandName: l }) {
    let e;
    try {
      const apiConfig = await b.get(nix);
      e = apiConfig.data && apiConfig.data.aryan;
      if (!e) return i.sendMessage("❌ API config error.", k.threadID, k.messageID);
    } catch {
      return i.sendMessage("❌ Failed to fetch API config.", k.threadID, k.messageID);
    }

    const n = args[0];
    if (!["-v", "-a"].includes(n))
      return i.sendMessage("❌ Usage: /ytb [-a|-v] <query|url>", k.threadID, k.messageID);

    const o = args.slice(1).join(" ");
    if (!o) return i.sendMessage("❌ Provide search query or URL.", k.threadID, k.messageID);

    if (o.startsWith("http")) {
      if (n === "-v") return await p(o, "mp4", i, k, e);
      else return await p(o, "mp3", i, k, e);
    }

    try {
      const q = await a(o);
      const r = q.videos.slice(0, 6);
      if (!r.length) return i.sendMessage("❌ No results found.", k.threadID, k.messageID);

      let s = "";
      r.forEach((t, u) => {
        s += `${u + 1}. ${t.title}\n`;
      });

      const w = await Promise.all(r.map(x => f(x.thumbnail)));

      i.sendMessage(
        { body: s + "\nReply 1-6", attachment: w },
        k.threadID,
        (err, y) => {
          global.BeatriceBC.ncReply.set(y.messageID, {
            commandName: l,
            messageID: y.messageID,
            author: k.senderID,
            results: r,
            type: n,
            baseApi: e
          });
        },
        k.messageID
      );
    } catch {
      i.sendMessage("❌ YouTube search failed.", k.threadID, k.messageID);
    }
  },

  ncReply: async function ({ event: z, api: A, Reply: B }) {
    const { results: C, type: D, baseApi: e } = B;
    const E = parseInt(z.body);
    if (isNaN(E) || E < 1 || E > C.length)
      return A.sendMessage("❌ Invalid choice.", z.threadID, z.messageID);

    await A.unsendMessage(B.messageID);
    const F = C[E - 1];
    if (D === "-v") await p(F.url, "mp4", A, z, e);
    else await p(F.url, "mp3", A, z, e);
  }
};

async function p(q, r, s, t, e) {
  try {
    const { data: u } = await b.get(
      `${e}/aryan/yx?url=${encodeURIComponent(q)}&type=${r}`
    );

    if (!u?.status || !u.download_url) throw new Error("API failed");

    const res = await b.get(u.download_url, {
      responseType: "stream",
      timeout: 30000
    });

    const stream = new PassThrough();
    res.data.pipe(stream);

    await s.sendMessage(
      { attachment: stream },
      t.threadID,
      t.messageID
    );
  } catch {
    s.sendMessage(`❌ Failed to download ${r}.`, t.threadID, t.messageID);
  }
}