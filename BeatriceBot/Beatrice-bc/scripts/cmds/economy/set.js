module.exports = {
  config: {
    name: "set",
    aliases: ["st"],
    version: "1.2",
    author: "NC-AZAD",
    role: 0,
    shortDescription: "Set user money or exp (Owner only)",
    longDescription: "Owner can set coins or experience for any user",
    category: "economy",
    guide: {
      en:
        "{pn} money 1000 @user\n" +
        "{pn} exp 500 (reply)\n" +
        "{pn} money 300"
    }
  },

  ncStart: async function ({ args, event, api, usersData }) {
    const owners = global.BeatriceBC.ncsetting.creator;
    const { senderID, threadID, mentions, messageReply } = event;
    
    if (!owners.includes(senderID)) {
      return api.sendMessage(
        "🚫 𝗔𝗰𝗰𝗲𝘀𝘀 𝗗𝗲𝗻𝗶𝗲𝗱!\n𝗢𝗻𝗹𝘆 𝗯𝗼𝘁 𝗼𝘄𝗻𝗲𝗿 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱.",
        threadID
      );
    }

    const type = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);
    
    if (!["money", "exp"].includes(type) || isNaN(amount) || amount < 0) {
      return api.sendMessage(
        "❌ 𝗜𝗻𝘃𝗮𝗹𝗶𝗱 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗙𝗼𝗿𝗺𝗮𝘁!\n\n" +
        "📌 𝗨𝘀𝗮𝗴𝗲:\n" +
        "➤ set money 1000 @user\n" +
        "➤ set exp 500 (reply)\n" +
        "➤ set money 300",
        threadID
      );
    }
    
    let targetID;
    if (messageReply) {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else {
      targetID = senderID;
    }

    const userData = await usersData.get(targetID);
    if (!userData) {
      return api.sendMessage(
        "⚠️ 𝗨𝘀𝗲𝗿 𝗗𝗮𝘁𝗮 𝗡𝗼𝘁 𝗙𝗼𝘂𝗻𝗱!\n𝗧𝗵𝗶𝘀 𝘂𝘀𝗲𝗿 𝗺𝗮𝘆 𝗻𝗼𝘁 𝗯𝗲 𝗿𝗲𝗴𝗶𝘀𝘁𝗲𝗿𝗲𝗱.",
        threadID
      );
    }

    const name = await usersData.getName(targetID);
    
    if (type === "money") {
      await usersData.set(targetID, {
        money: amount,
        exp: userData.exp,
        data: userData.data
      });

      return api.sendMessage(
        "✅ 𝗖𝗼𝗶𝗻𝘀 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!\n\n" +
        `👤 𝗨𝘀𝗲𝗿 : ${name}\n` +
        `💰 𝗖𝗼𝗶𝗻𝘀 : ${amount}`,
        threadID
      );
    }
    
    if (type === "exp") {
      await usersData.set(targetID, {
        money: userData.money,
        exp: amount,
        data: userData.data
      });

      return api.sendMessage(
        "✅ 𝗘𝗫𝗣 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!\n\n" +
        `👤 𝗨𝘀𝗲𝗿 : ${name}\n` +
        `⭐ 𝗘𝗫𝗣  : ${amount}`,
        threadID
      );
    }
  }
};