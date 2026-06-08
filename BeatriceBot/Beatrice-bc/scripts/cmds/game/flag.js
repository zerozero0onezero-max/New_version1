const axios = require("axios");

async function toFont(text, id = 3) {
  try {
    const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
    const rawRes = await axios.get(noobcore);
    const apiBase = rawRes.data.apiv1;

    const apiUrl = `${apiBase}/api/font?id=${id}&text=${encodeURIComponent(text)}`;
    const { data } = await axios.get(apiUrl);
    return data.output || text;
  } catch (e) {
    console.error("Font API error:", e.message);
    return text;
  }
}

module.exports = {
  config: {
    name: "flagquiz",
    aliases: ["flag", "fqz", "flagguess"],
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 10,
    role: 0,
    guide: { en: "{pn} — Flag guessing quiz" }
  },

  ncStart: async function ({ api, event }) {
    try {
      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const apiBase = rawRes.data.apiv1;

      const apiUrl = `${apiBase}/api/flag`;
      const { data } = await axios.get(apiUrl);

      const { image, options, answer } = data;

      const imageStream = await axios({ method: "GET", url: image, responseType: "stream" });

      const body = await toFont(`》 Flag Quiz 🚩
━━━━━━━━━━━━━━
📸 Guess the country of this flag!
🅐 ${options.A}
🅑 ${options.B}
🅒 ${options.C}
🅓 ${options.D}

⏳ You have 1 minute 30 seconds!
💡 You have 3 chances! Reply with A, B, C or D.`);

      api.sendMessage(
        { body, attachment: imageStream.data },
        event.threadID,
        async (err, info) => {
          if (err) return;

          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            correctAnswer: answer,
            chances: 3,
            answered: false
          });

          setTimeout(async () => {
            const quizData = global.BeatriceBC.ncReply.get(info.messageID);
            if (quizData && !quizData.answered) {
              await api.unsendMessage(info.messageID);
              const msg = await toFont(`⏰ Time's up!
✅ The correct option was: ${answer}`);
              api.sendMessage(msg, event.threadID);
              global.GoatBot.onReply.delete(info.messageID);
            }
          }, 90000);
        },
        event.messageID
      );
    } catch (err) {
      console.error(err);
      const failMsg = await toFont("❌ Failed to fetch flag data.");
      api.sendMessage(failMsg, event.threadID, event.messageID);
    }
  },

  ncReply: async function ({ api, event, Reply, usersData }) {
    let { author, correctAnswer, messageID, chances } = Reply;
    const reply = event.body?.trim().toUpperCase();

    if (event.senderID !== author) {
      const msg = await toFont("⚠️ This is not your quiz!");
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    if (!reply || !["A", "B", "C", "D"].includes(reply)) {
      const msg = await toFont("❌ Please reply with A, B, C or D.");
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    if (reply === correctAnswer) {
      await api.unsendMessage(messageID);

      const rewardCoin = 300;
      const rewardExp = 100;
      const userData = await usersData.get(event.senderID);
      userData.money += rewardCoin;
      userData.exp += rewardExp;
      await usersData.set(event.senderID, userData);

      const correctMsg = await toFont(`🎉 Congratulations!

✅ You answered correctly!
💰 You earned ${rewardCoin} Coins
🌟 You gained ${rewardExp} EXP

🚩 You recognized the right flag, you are the true champion!`);

      if (global.BeatriceBC.ncReply.has(messageID)) {
        global.BeatriceBC.ncReply.get(messageID).answered = true;
        global.BeatriceBC.ncReply.delete(messageID);
      }

      return api.sendMessage(correctMsg, event.threadID, event.messageID);
    } else {
      chances--;

      if (chances > 0) {
        global.BeatriceBC.ncReply.set(messageID, { ...Reply, chances });
        const wrongTryMsg = await toFont(`❌ Wrong answer!
⏳ You still have ${chances} chance(s) left. Try again!`);
        return api.sendMessage(wrongTryMsg, event.threadID, event.messageID);
      } else {
        await api.unsendMessage(messageID);
        const wrongMsg = await toFont(`🥺 Out of chances!
✅ The correct option was: ${correctAnswer}`);
        return api.sendMessage(wrongMsg, event.threadID, event.messageID);
      }
    }
  }
};