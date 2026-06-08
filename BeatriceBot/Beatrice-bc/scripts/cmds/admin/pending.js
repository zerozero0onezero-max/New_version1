module.exports = {
  config: {
    name: "pending",
    version: "1.0",
    author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
    team: "NoobCore",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Approve or refuse pending threads"
    },
    longDescription: {
      en: "Reply with thread numbers to approve or reply with c[number(s)] / cancel[number(s)] to refuse."
    },
    category: "admin"
  },

  langs: {
    en: {
      invaildNumber: "%1 is not a valid number",
      cancelSuccess: "Refused %1 thread(s)!",
      approveSuccess: "Approved successfully %1 thread(s)!",
      cantGetPendingList: "Can't get the pending list!",
      returnListPending:
        "Pending approval\n\nTotal groups: %1\n\n%2\nReply:\n- number(s) = approve\n- c number(s) = cancel",
      returnListClean: "There is no pending group."
    }
  },

  ncReply: async function ({ api, event, Reply, getLang }) {
    if (String(event.senderID) !== String(Reply.author)) return;

    const { body, threadID, messageID } = event;
    let count = 0;
    const BOT_UID = api.getCurrentUserID();
    const lowerBody = body.trim().toLowerCase();

    if (lowerBody.startsWith("c") || lowerBody.startsWith("cancel")) {
      const trimmed = body.replace(/^(c|cancel)\s*/i, "").trim();
      const index = trimmed.split(/\s+/).filter(Boolean);

      if (!index.length)
        return api.sendMessage(
          "Please provide at least one thread number to cancel.",
          threadID,
          messageID
        );

      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length) {
          api.sendMessage(getLang("invaildNumber", i), threadID);
          continue;
        }

        const targetThreadID = Reply.pending[i - 1].threadID;
        try {
          await api.removeUserFromGroup(BOT_UID, targetThreadID);
          count++;
        } catch {}
      }

      return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
    }

    const index = body.split(/\s+/).filter(Boolean);
    if (!index.length)
      return api.sendMessage(
        "Please provide at least one thread number to approve.",
        threadID,
        messageID
      );

    for (const i of index) {
      if (isNaN(i) || i <= 0 || i > Reply.pending.length) {
        api.sendMessage(getLang("invaildNumber", i), threadID);
        continue;
      }

      const targetThreadID = Reply.pending[i - 1].threadID;
      const prefix = global.utils.getPrefix(targetThreadID);
      const nickNameBot = global.BeatriceBC.ncsetting.nickNameBot || global.BeatriceBC.config?.botName || "Beatrice bc";

      try {
        await api.changeNickname(nickNameBot, targetThreadID, BOT_UID);
      } catch {}

      const textMsg = [
        "✅ 𝐁𝐨𝐭 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐞𝐝 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 🎊",
        `🔹 𝐁𝐨𝐭 𝐏𝐫𝐞𝐟𝐢𝐱: ${prefix}`,
        `🔸 𝐓𝐲𝐩𝐞: ${prefix}help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬`
      ].join("\n");

      await api.sendMessage(textMsg, targetThreadID);
      count++;
    }

    return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
  },

  ncStart: async function ({ api, event, getLang, commandName }) {
    const { threadID, messageID } = event;
    let msg = "", index = 1;

    try {
      const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      const pending = await api.getThreadList(100, null, ["PENDING"]) || [];
      const list = [...spam, ...pending].filter(
        g => g.isSubscribed && g.isGroup
      );

      for (const item of list)
        msg += `${index++}/ ${item.name} (${item.threadID})\n`;

      if (!list.length)
        return api.sendMessage(getLang("returnListClean"), threadID, messageID);

      return api.sendMessage(
        getLang("returnListPending", list.length, msg),
        threadID,
        (err, info) => {
          global.BeatriceBC.ncReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            pending: list
          });
        },
        messageID
      );
    } catch {
      return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID);
    }
  }
};