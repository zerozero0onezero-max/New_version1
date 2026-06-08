<img src="https://i.ibb.co/0RF4hHPt/saimx69x-36aa41.png" alt="banner">

<h1 align="center">
  <img src="https://i.ibb.co/1G0K23jj/saimx69x-7ee55e.jpg" width="25px">
  𝗠𝗘𝗦𝗦𝗘𝗡𝗚𝗘𝗥 𝗖𝗛𝗔𝗧 𝗕𝗢𝗧 </h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-3.0.7-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/Platform-Facebook_Messenger-informational?style=for-the-badge">
</p>

---

<h3 align="center">
  <img src="https://emoji.discord.st/emojis/768b108d-274f-4f44-a634-8477b16efce7.gif" width="25">
  &nbsp; WELCOME TO NOOBCORE TEAM &nbsp;
  <img src="https://emoji.discord.st/emojis/768b108d-274f-4f44-a634-8477b16efce7.gif" width="25">
</h3>

---


# 🗂️ Folder Layout

```bash
NoobCore-v3-Bot/
│
├── index.js
├── NoobCore.js
├── config.json
├── configCommands.json
│
├── ncstate.json
├── ncstate2.json
├── ncstate3.json
│
├── core/
│   ├── logger/
│   ├── login/
│   ├── database/
│   └── handler/
│
├── fca-unofficial/
│
├── scripts/
│   ├── cmds/
│   └── events/
│
└── public/
    ├── app.js
    └── index.html
```

---

# 📁 Project Structure

| 📂 File / Folder | 📝 Description | ⚙️ Role |
|------------------|----------------|---------|
| `index.js` | 🚀 Entry point | Spawns `NoobCore.js` & handles AutoGit loop |
| `NoobCore.js` | 🧠 Main engine | Loads config, DB, commands & events |
| `config.json` | ⚙️ Main config | FB account, dashboard, DB, language |
| `configCommands.json` | 🎛️ Command config | Control each command |
| `ncstate.json` | 🍪 Primary AppState | Main Facebook session |
| `ncstate2.json` | 🔁 Backup AppState | Auto switch if problem |
| `ncstate3.json` | 🔁 Backup AppState | Second fallback login |
| `fca-unofficial/` | 📦 FCA Library | Facebook Chat API |
| `core/` | 🏗️ Core system | Logger, login, DB controller |
| `scripts/cmds/` | 🤖 Commands | Admin, AI, Game, Fun etc |
| `scripts/events/` | 📡 Events | Event listeners |
| `public/` | 🌐 Dashboard | Express web + DB |

---

# 🛠️ Command Structure

NoobCore uses a modular command system. Each command file should export an object with the following structure:

```javascript
module.exports = {
  config: {
    name: "info",
    version: "1.0",
    author: "💻𝑵𝑪-𝑿𝑵𝑰𝑳6𝒙⚡(nc-ceo)",
    countDown: 5,
    role: 0, // 0 use for everyone, 1 use for box admin, 2 use for bot admin, 3 use for bot Creator
    premium: false, // ture use only premium user
    usePrefix: true, // false use without prefix
    shortDescription: {
      en: "Show bot information"
    },
    description: {
      en: "Display detailed information about NoobCore Bot"
    },
    category: "utility",
    guide: {
      en: "{prefix}info"
    }
  },

  langs: {
    en: {
      infoMessage:
`╔════════════════════╗
   🤖 NOOBCORE BOT INFO
╚════════════════════╝

📌 Bot Name: NoobCore-v3
⚡ Version: 3.0
👨‍💻 Developer: NoobCore Team
🌐 Platform: Facebook Messenger
🧠 System: Modular Command + Event Driven
🔄 Multi AppState: Enabled

Reply with:
1️⃣ - Show Prefix
2️⃣ - Show Admin List
3️⃣ - Show Creator ID

React ❤️ to get uptime status.
`
    }
  },

  ncStart: async function ({ api, event }) {
    const message = this.langs.en.infoMessage;

    await api.sendMessage(message, event.threadID, (error, info) => {
      if (error) return console.log(error);

      // Reply handler
      global.noobCore.ncReply.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID
      });

      // Reaction handler
      global.noobCore.ncReaction.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID
      });

    }, event.messageID);
  },

  // Handle Reply
  ncReply: async function ({ api, event }) {
    const { body, threadID, messageID } = event;
    const ncsetting = global.noobCore.ncsetting;

    if (body === "1") {
      return api.sendMessage(
        `🔹 Current Prefix: ${ncsetting.prefix}`,
        threadID,
        messageID
      );
    }

    if (body === "2") {
      return api.sendMessage(
        `👮 Admin List:\n${ncsetting.adminBot.join("\n")}`,
        threadID,
        messageID
      );
    }

    if (body === "3") {
      return api.sendMessage(
        `👑 Creator ID:\n${ncsetting.creator.join("\n")}`,
        threadID,
        messageID
      );
    }
  },

  // Handle Reaction
  ncReaction: async function ({ api, event }) {
    if (event.reaction !== "❤") return;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return api.sendMessage(
      `⏳ Bot Uptime:\n${hours}h ${minutes}m ${seconds}s`,
      event.threadID,
      event.messageID
    );
  }
};
```
---

# ⚙️ Configuration

Edit `config.json`

```json
  "prefix": "-",
  "adminOnly": {
    "enable": false,
    "ignoreCommand": []
  },
  "creatorOnly": {
    "enable": false,
    "ignoreCommand": []
  },
  "premiumOnly": {
    "enable": false,
    "ignoreCommand": []
  },
  "autogit": {
    "enable": false, //gitpush on off
    "GITHUB_TOKEN": "github_token",
    "owner": "GitHub username",
    "repo": "fork_name",
    "branch": "main",
    "interval": 60,
    "notes": "auto GitHub push github bot running use false..... [ render, vercel, railway, cyclic heruku, koyeb ] bot running use true...interval is 60 = 1minute auto GitHub push"
  },
  "logsbot": [
    "2177252409470039"
  ],
  "adminBot": [
    "100077764623961",
    "100004924009085"
  ],
  "creator": [
    "61558762813083"
  ],
```

---

---

# ⚡ Features

- 🔄 Multi AppState Auto Switch System
- 🤖 Modular Command Loader
- 📡 Event Driven Architecture
- 🌐 Express Dashboard
- 🔁 Optional Auto Git Push
- 🗄️ Database Integrated System
- 🎛️ Per Command Config Control

---

# 🚀 Installation Guide

```bash
git clone https://github.com/yourusername/NoobCore-v3-Bot.git
cd NoobCore-v3-Bot
npm install
```

---

# ▶️ Start Bot

```bash
node index.js
```

---

# 🔐 AppState Setup

Put your Facebook appstate inside:

```
ncstate.json
```

If main ID gets checkpoint or problem,
bot will automatically switch to:

```
ncstate2.json
ncstate3.json
```
---

# 📜 License

This project is licensed under the MIT License.

---

<h3 align="center">
  💻 Developed with ❤️ by NoobCore
</h3>
