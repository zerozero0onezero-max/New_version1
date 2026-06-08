const { getTime } = global.utils;

module.exports = {
  config: {
    name: "premium",
    version: "2.1",
    author: "𝑵𝑪-𝑿𝑵𝑰𝑳",
    countDown: 5,
    role: 3,
    description: {
      vi: "Quản lý người dùng Premium",
      en: "Premium User Management System"
    },
    category: "owner",
    guide: {
      en:
        "╭─『 🌟 PREMIUM MANAGER 』\n" +
        "│\n" +
        "│ 🔹 {pn} list [page]\n" +
        "│ 🔹 {pn} add [uid | @tag | reply] <time>\n" +
        "│ 🔹 {pn} remove [uid | @tag | reply]\n" +
        "│ 🔹 {pn} update [uid | @tag | reply] <time>\n" +
        "│ 🔹 {pn} check [uid | @tag | reply]\n" +
        "│\n" +
        "│ ⏱ Time: 1h | 1d | 1m | permanent\n" +
        "╰───────────────"
    }
  },

  langs: {
    en: {
      syntaxError: "⚠️ Invalid syntax!",
      noTarget: "⚠️ Please mention, reply or provide UID",
      invalidTime: "❌ Invalid time format",

      addSuccess: "🌟 PREMIUM ACTIVATED 🌟\n👤 User: %1\n🆔 UID: %2\n⏱ Expires: %3",
      addSuccessPermanent: "🌟 LIFETIME PREMIUM 🌟\n👤 User: %1\n🆔 UID: %2\n⏱ Duration: Permanent",

      removeSuccess: "🗑️ PREMIUM REMOVED\n👤 User: %1\n🆔 UID: %2",

      updateSuccess: "♻️ PREMIUM UPDATED\n👤 User: %1\n🆔 UID: %2\n⏱ Expires: %3",
      updateSuccessPermanent: "♻️ PREMIUM UPDATED\n👤 User: %1\n🆔 UID: %2\n⏱ Duration: Permanent",

      checkPremium:
        "⭐ PREMIUM STATUS ⭐\n" +
        "👤 User: %1\n" +
        "🆔 UID: %2\n" +
        "⏱ Expires: %3\n" +
        "⏳ Remaining: %4",

      checkPremiumPermanent:
        "⭐ PREMIUM STATUS ⭐\n" +
        "👤 User: %1\n" +
        "🆔 UID: %2\n" +
        "⏱ Duration: Permanent",

      checkNotPremium: "❌ Not a Premium user\n👤 User: %1\n🆔 UID: %2",

      noPremiumUsers: "📭 No Premium users found",

      premiumList:
        "╭─『 🌟 PREMIUM USERS 』\n" +
        "│ Page: %1 / %2\n" +
        "│\n%3" +
        "╰───────────────",

      premiumListItem:
        "│ %1. %2\n│    🆔 %3\n│    ⏱ Expires: %4\n",

      premiumListItemPermanent:
        "│ %1. %2\n│    🆔 %3\n│    ⏱ Permanent\n",

      lifetime: "Permanent",
      expired: "Expired"
    }
  },

  // ================= CORE =================
  ncStart: async function ({ args, usersData, message, event, getLang }) {

    const type = args[0]?.toLowerCase();

    /* ===== UTILS ===== */

    const getTarget = async () => {
      if (event.type === "message_reply") return event.messageReply.senderID;
      if (Object.keys(event.mentions || {}).length)
        return Object.keys(event.mentions)[0];
      if (args[1] && !isNaN(args[1])) return args[1];
      return null;
    };

    const getUserName = async (uid) => {
      try {
        const u = await usersData.get(uid);
        return u?.name || "Unknown User";
      } catch {
        return "Unknown User";
      }
    };

    const parseTime = (str) => {
      if (!str) return null;
      if (["permanent", "perm"].includes(str.toLowerCase())) return null;

      const match = str.match(/^(\d+)(h|d|m)$/i);
      if (!match) return undefined;

      const value = +match[1];
      const unit = match[2].toLowerCase();

      const map = {
        h: 3600000,
        d: 86400000,
        m: 2592000000
      };

      return Date.now() + value * map[unit];
    };

    const formatExpire = (t) =>
      t == null ? getLang("lifetime")
        : Date.now() > t ? getLang("expired")
          : getTime(t, "DD/MM/YYYY HH:mm:ss");

    const remaining = (t) => {
      if (t == null) return getLang("lifetime");
      const r = t - Date.now();
      if (r <= 0) return getLang("expired");

      const d = Math.floor(r / 86400000);
      const h = Math.floor((r % 86400000) / 3600000);
      const m = Math.floor((r % 3600000) / 60000);

      return [d && `${d}d`, h && `${h}h`, m && `${m}m`]
        .filter(Boolean).join(" ") || "<1m";
    };

    /* ===== SWITCH ===== */

    switch (type) {

      case "list": {
        const all = await usersData.getAll();
        const list = all.filter(u => u.data?.premium?.status);

        if (!list.length)
          return message.reply(getLang("noPremiumUsers"));

        const limit = 10;
        const page = Number(args[1]) || 1;
        const pages = Math.ceil(list.length / limit);

        let text = "";
        list.slice((page - 1) * limit, page * limit)
          .forEach((u, i) => {
            const p = u.data.premium;
            text += p.expireTime == null
              ? getLang("premiumListItemPermanent", i + 1, u.name, u.userID)
              : getLang("premiumListItem", i + 1, u.name, u.userID, formatExpire(p.expireTime));
          });

        return message.reply(getLang("premiumList", page, pages, text));
      }

      case "add": {
        const uid = await getTarget();
        if (!uid) return message.reply(getLang("noTarget"));

        const time = parseTime(args.at(-1));
        if (time === undefined) return message.reply(getLang("invalidTime"));

        const name = await getUserName(uid);

        await usersData.set(uid, {
          premium: { status: true, expireTime: time }
        }, "data");

        return message.reply(
          time == null
            ? getLang("addSuccessPermanent", name, uid)
            : getLang("addSuccess", name, uid, formatExpire(time))
        );
      }

      case "remove": {
        const uid = await getTarget();
        if (!uid) return message.reply(getLang("noTarget"));

        const name = await getUserName(uid);

        await usersData.set(uid, {
          premium: { status: false, expireTime: null }
        }, "data");

        return message.reply(getLang("removeSuccess", name, uid));
      }

      case "update": {
        const uid = await getTarget();
        if (!uid) return message.reply(getLang("noTarget"));

        const time = parseTime(args.at(-1));
        if (time === undefined) return message.reply(getLang("invalidTime"));

        const name = await getUserName(uid);

        await usersData.set(uid, {
          premium: { status: true, expireTime: time }
        }, "data");

        return message.reply(
          time == null
            ? getLang("updateSuccessPermanent", name, uid)
            : getLang("updateSuccess", name, uid, formatExpire(time))
        );
      }

      case "check": {
        const uid = (await getTarget()) || event.senderID;
        const u = await usersData.get(uid);
        const p = u?.data?.premium;
        const name = u?.name || "Unknown User";

        if (!p?.status)
          return message.reply(getLang("checkNotPremium", name, uid));

        return p.expireTime == null
          ? message.reply(getLang("checkPremiumPermanent", name, uid))
          : message.reply(
            getLang(
              "checkPremium",
              name,
              uid,
              formatExpire(p.expireTime),
              remaining(p.expireTime)
            )
          );
      }

      default:
        return message.reply(getLang("syntaxError"));
    }
  }
};