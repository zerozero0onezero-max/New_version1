const axios = require("axios");

const API_BASE = "https://sakura-uptime-monitor.onrender.com/api";
const WEBSITE_URL = "https://sakura-uptime-monitor.onrender.com";

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 HOW TO GET YOUR API KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Visit:
   https://sakura-uptime-monitor.onrender.com

2. Sign Up / Sign In.

3. Open Dashboard.

4. Copy your API Key (example: su_xxxxxxxxxxxxxxxxx)

5. Paste it below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

const API_KEY = "PASTE_YOUR_API_KEY_HERE";

const MAX_LOGS = 10;

function isApiKeyValid() {
  return (
    API_KEY &&
    API_KEY !== "PASTE_YOUR_API_KEY_HERE" &&
    API_KEY.startsWith("su_")
  );
}

async function request(endpoint, params = {}) {
  try {
    const { data } = await axios.get(`${API_BASE}${endpoint}`, {
      params: { ...params, apiKey: API_KEY }
    });
    return data;
  } catch (err) {
    return {
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Request failed"
    };
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { hour12: false });
}

module.exports = {
  config: {
    name: "monitor",
    aliases: [],
    version: "1.0",
    author: "NC-Saimx69x",
    role: 3,
    shortDescription: "Manage and track website uptime easily.",
    longDescription:
      "Monitor lets you manage uptime tracking for your websites directly from Messenger.\n\n" +
      "Features:\n" +
      "• Add new monitors\n" +
      "• View active monitors\n" +
      "• Delete monitors\n" +
      "• Check detailed uptime logs\n\n" +
      "Powered by Sakura Uptime Monitor API.",
    guide: {
      en:
        "{pn} add <url>\n" +
        "{pn} list\n" +
        "{pn} delete <id>\n" +
        "{pn} logs <id>"
    }
  },

  ncStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (!isApiKeyValid()) {
      return api.sendMessage(
        "⚠ API key is not configured.\n\n" +
          "📂 Open your bot command file:\n" +
          "scripts/utility/commands/monitor.js\n\n" +
          "✏ Find this line:\n" +
          'const API_KEY = "PASTE_YOUR_API_KEY_HERE";\n\n' +
          "🔁 Replace PASTE_YOUR_API_KEY_HERE with your real API key.\n\n" +
          "🔑 Get your key from:\n" +
          WEBSITE_URL +
          "\n\n" +
          "➡ Sign Up / Login → Dashboard → Copy API Key\n\n" +
          "💡 After editing, restart your bot.",
        threadID,
        messageID
      );
    }

    if (!args[0]) {
      return api.sendMessage(
        "🌸 Sakura Uptime Monitor\n\n" +
          "• /monitor add <url>\n" +
          "• /monitor list\n" +
          "• /monitor delete <id>\n" +
          "• /monitor logs <id>",
        threadID,
        messageID
      );
    }

    const action = args[0].toLowerCase();

    if (action === "add") {
      if (!args[1])
        return api.sendMessage("⚠ URL is required.", threadID, messageID);

      const res = await request("/add", { url: args[1] });
      if (!res.success)
        return api.sendMessage(res.message, threadID, messageID);

      const m = res.data;

      return api.sendMessage(
        "✅ Monitor Created\n\n" +
          `ID       : ${m.id}\n` +
          `URL      : ${m.url}\n` +
          `Status   : ${m.lastStatus}\n` +
          `Active   : ${m.isActive}\n` +
          `Created  : ${formatDate(m.createdAt)}`,
        threadID,
        messageID
      );
    }

    if (action === "list") {
      const res = await request("/list");
      if (!res.success || !res.data.length)
        return api.sendMessage(
          res.message || "⚠ No active monitors found.",
          threadID,
          messageID
        );

      let msg = "📋 Active Monitors\n\n";
      res.data.forEach((m, i) => {
        msg +=
          `${i + 1}. ${m.url}\n` +
          `   ID     : ${m.id}\n` +
          `   Status : ${m.lastStatus}\n` +
          `   Active : ${m.isActive}\n\n`;
      });

      return api.sendMessage(msg.trim(), threadID, messageID);
    }

    if (action === "delete") {
      if (!args[1])
        return api.sendMessage("⚠ Monitor ID is required.", threadID, messageID);

      const res = await request("/delete", { id: args[1] });
      if (!res.success)
        return api.sendMessage(res.message, threadID, messageID);

      return api.sendMessage("🗑 Monitor removed successfully.", threadID, messageID);
    }

    if (action === "logs") {
      if (!args[1])
        return api.sendMessage("⚠ Monitor ID is required.", threadID, messageID);

      const res = await request("/logs", { id: args[1] });
      if (!res.success || !res.data.length)
        return api.sendMessage(
          res.message || "⚠ No logs available.",
          threadID,
          messageID
        );

      const logs = res.data.slice(0, MAX_LOGS);

      let msg = `📊 Recent Logs (Last ${logs.length})\n\n`;

      logs.forEach((l, i) => {
        msg +=
          `${i + 1}. ${l.status} | ${l.statusCode}\n` +
          `   Response : ${l.responseTime} ms\n` +
          `   Time     : ${formatDate(l.timestamp)}\n\n`;
      });

      return api.sendMessage(msg.trim(), threadID, messageID);
    }

    return api.sendMessage("❌ Invalid command usage.", threadID, messageID);
  }
};
