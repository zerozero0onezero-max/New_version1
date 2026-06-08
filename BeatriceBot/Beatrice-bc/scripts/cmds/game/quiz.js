const axios = require("axios");

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 10,
    role: 0,
    guide: { en: "{pn} — Answer quiz questions and earn rewards!" }
  },

  ncStart: async function ({ api, event }) {
    try {
      const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
      const rawRes = await axios.get(noobcore);
      const quizApiBase = rawRes.data.apiv1;

      const { data } = await axios.get(`${quizApiBase}/api/quiz`);
      const { question, options, answer } = data;

      const body = `╭──❖   𝐐𝐔𝐈𝐙  𝐆𝐀𝐌𝐄   ❖──╮

📜 প্রশ্ন: ${question}

🅐 ${options.a}
🅑 ${options.b}
🅒 ${options.c}
🅓 ${options.d}

────────────────
💡 ৩ বার চেষ্টা করতে পারবে!
(Reply দাও A, B, C বা D) 
╰───────────────╯`;

      api.sendMessage(
        { body },
        event.threadID,
        async (err, info) => {
          if (err) return;

          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            correctAnswer: answer.trim(),
            chances: 3,
            answered: false,
            options
          });
        },
        event.messageID
      );
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ কুইজ ডাটা আনতে সমস্যা হয়েছে!", event.threadID, event.messageID);
    }
  },

  ncReply: async function ({ api, event, Reply, usersData }) {
    let { author, correctAnswer, messageID, chances, options } = Reply;
    const reply = event.body?.trim().toUpperCase();

    if (event.senderID !== author)
      return api.sendMessage("⚠️ এটা তোমার কুইজ না!", event.threadID, event.messageID);

    if (!reply || !["A", "B", "C", "D"].includes(reply))
      return api.sendMessage("❌ Reply দাও শুধু A, B, C বা D দিয়ে!", event.threadID, event.messageID);

    const selectedText =
      reply === "A" ? options.a :
      reply === "B" ? options.b :
      reply === "C" ? options.c :
      reply === "D" ? options.d : "";

    if (selectedText.trim() === correctAnswer.trim()) {
      try { await api.unsendMessage(messageID); } catch {}

      const rewardCoin = 300;
      const rewardExp = 100;
      const userData = await usersData.get(event.senderID);
      userData.money += rewardCoin;
      userData.exp += rewardExp;
      await usersData.set(event.senderID, userData);

      const correctMsg = `╭──✅  𝐐𝐔𝐈𝐙 𝐑𝐄𝐒𝐔𝐋𝐓  ✅──╮
│ অবস্থা     : সঠিক উত্তর!
│ উত্তর       : ${correctAnswer}
│ পুরস্কার   : +${rewardCoin} Coin
│ অভিজ্ঞতা   : +${rewardExp} EXP
│ 🏆 তুমি দুর্দান্ত করেছো!
╰───────────────╯`;

      global.BeatriceBC.ncReply.delete(messageID);
      return api.sendMessage(correctMsg, event.threadID, event.messageID);
    } else {
      chances--;

      if (chances > 0) {
        global.BeatriceBC.ncReply.set(messageID, { ...Reply, chances });
        const wrongTryMsg = `❌ ভুল উত্তর!
🔁 তোমার হাতে আছে ${chances} বার সুযোগ! আবার চেষ্টা করো!`;
        return api.sendMessage(wrongTryMsg, event.threadID, event.messageID);
      } else {
        try { await api.unsendMessage(messageID); } catch {}
        const wrongMsg = `😢 সব সুযোগ শেষ!
✅ সঠিক উত্তর ছিল ➤ ${correctAnswer}`;
        return api.sendMessage(wrongMsg, event.threadID, event.messageID);
      }
    }
  }
};