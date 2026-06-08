module.exports = {
  config: {
    name: "antiout",
    version: "1.3",
    author: "NC-AZAD",
    countDown: 5,
    role: 1,
    shortDescription: {
      en: "Prevent members from leaving the group"
    },
    longDescription: {
      en: "Enable / disable anti-out & check status"
    },
    category: "admin",
    guide: {
      en: "{pn} on | off | status"
    }
  },

  langs: {
    en: {
      onBox:
`╔═══════════════════╗
   🔒  ANTI-OUT ON
╚═══════════════════╝

👤 Changed : %1
🕒 Time       : %2

🛡️ Group protection enabled`,

      offBox:
`╔═══════════════════╗
   🔓  ANTI-OUT OFF
╚═══════════════════╝

👤 Changed : %1
🕒 Time       : %2

⚠️ Protection disabled`,

      statusOn:
`╔═══════════════════╗
   📊  ANTI-OUT STATUS
╚═══════════════════╝

🛡️ Status     : ON
👤 Enabled : %1
🕒 Time       : %2`,

      statusOff:
`╔═══════════════════╗
   📊  ANTI-OUT STATUS
╚═══════════════════╝

⚠️ Status     : OFF
👤 Disabled : %1
🕒 Time       : %2`,

      noData:
`╔═══════════════════╗
   ℹ️  ANTI-OUT INFO
╚═══════════════════╝

Anti-out not configured yet`,

      addedBack:
`╔═══════════════════╗
   ⛔  LEAVE BLOCKED
╚═══════════════════╝

👤 User : %1
🚫 Leaving not allowed`,

      missingPermission:
`╔═══════════════════╗
   ❌  ACTION FAILED
╚═══════════════════╝

Couldn't add %1 back`
    }
  },
	
  ncStart: async function ({ args, message, event, threadsData, usersData, getLang }) {
    const option = args[0];
    const name = await usersData.getName(event.senderID);
    const time = new Date().toLocaleString();

    if (option === "on") {
      await threadsData.set(event.threadID, {
        status: true,
        by: name,
        time
      }, "data.antiout");

      return message.reply(getLang("onBox", name, time));
    }

    if (option === "off") {
      await threadsData.set(event.threadID, {
        status: false,
        by: name,
        time
      }, "data.antiout");

      return message.reply(getLang("offBox", name, time));
    }

    if (option === "status") {
      const data = await threadsData.get(event.threadID, "data.antiout");

      if (!data) return message.reply(getLang("noData"));

      return message.reply(
        data.status
          ? getLang("statusOn", data.by, data.time)
          : getLang("statusOff", data.by, data.time)
      );
    }

    return message.reply("⚠️ Use: antiout on | off | status");
  },
	
  onStart: async function (ctx) {
    return this.ncStart(ctx);
  },

  onEvent: async function ({ event, api, threadsData, usersData, getLang }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const data = await threadsData.get(event.threadID, "data.antiout");
    if (!data || !data.status) return;

    const leftID = event.logMessageData.leftParticipantFbId;
    if (leftID === api.getCurrentUserID()) return;

    const name = await usersData.getName(leftID);

    try {
      await api.addUserToGroup(leftID, event.threadID);
      await api.sendMessage(getLang("addedBack", name), event.threadID);
    } catch {
      await api.sendMessage(getLang("missingPermission", name), event.threadID);
    }
  }
};
