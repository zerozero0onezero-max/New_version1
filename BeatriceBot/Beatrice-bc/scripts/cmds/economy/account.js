const { getTime } = global.utils;

const PRICE_PER_DAY = 5000;
const DAY_MS = 86400000;
const CONVERT_RATE = 10;

module.exports = {
  config: {
    name: "account",
    aliases: ["acc"],
    version: "1.5.0",
    author: "NC-XNIL",
    role: 0,
    usePrefix: true,
    category: "user",
    description: "Account, Premium, Shop & Convert",
    guide: {
      en:
        "╭─『 👤 𝗔𝗖𝗖𝗢𝗨𝗡𝗧 』\n" +
        "│ {pn}\n" +
        "│ {pn} shop\n" +
        "│ {pn} premium buy <days>\n" +
        "│ {pn} convert <diamond>\n" +
        "╰───────────────"
    }
  },

  langs: {
    en: {
      accountInfo:
        "╭─『 👤 𝗔𝗖𝗖𝗢𝗨𝗡𝗧 𝗜𝗡𝗙𝗢 』\n" +
        "│ 👤 𝗨𝘀𝗲𝗿 : %1\n" +
        "│ 🆔 𝗨𝗜𝗗 : %2\n" +
        "│ 💰 𝗠𝗼𝗻𝗲𝘆 : %3\n" +
        "│ 💎 𝗗𝗶𝗮𝗺𝗼𝗻𝗱 : %4\n" +
        "│ 🌟 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 : %5\n" +
        "│ 📅 𝗘𝘅𝗽𝗶𝗿𝗲 : %6\n" +
        "│ ⏳ 𝗥𝗲𝗺𝗮𝗶𝗻𝗶𝗻𝗴 : %7\n" +
        "╰───────────────",

      shopInfo:
        "╭─『 🛒 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗛𝗢𝗣 』\n" +
        "│ 💎 𝗣𝗿𝗶𝗰𝗲 / 𝗗𝗮𝘆 : %1\n" +
        "│ • 𝟭 𝗗𝗮𝘆  → %2\n" +
        "│ • 𝟳 𝗗𝗮𝘆𝘀 → %3\n" +
        "│ • 𝟯𝟬 𝗗𝗮𝘆𝘀 → %4\n" +
        "│ • 𝟯𝟲𝟱 𝗗𝗮𝘆𝘀 → %5\n" +
        "╰───────────────",

      convertInfo:
        "💱 𝗖𝗢𝗡𝗩𝗘𝗥𝗧 𝗠𝗢𝗡𝗘𝗬 → 𝗗𝗜𝗔𝗠𝗢𝗡𝗗\n" +
        "🔁 𝗥𝗮𝘁𝗲 : 𝟭 💎 = %1 💰\n" +
        "📌 𝗘𝘅𝗮𝗺𝗽𝗹𝗲 : acc convert 5000\n" +
        "💸 𝗖𝗼𝘀𝘁 : %2",

      notEnoughMoney:
        "❌ 𝗡𝗢𝗧 𝗘𝗡𝗢𝗨𝗚𝗛 𝗠𝗢𝗡𝗘𝗬\n" +
        "💰 𝗡𝗲𝗲𝗱 : %1\n" +
        "💰 𝗬𝗼𝘂𝗿𝘀 : %2",

      notEnoughDiamond:
        "❌ 𝗡𝗢𝗧 𝗘𝗡𝗢𝗨𝗚𝗛 𝗗𝗜𝗔𝗠𝗢𝗡𝗗\n" +
        "💎 𝗡𝗲𝗲𝗱 : %1\n" +
        "💎 𝗬𝗼𝘂𝗿𝘀 : %2",

      convertSuccess:
        "✅ 𝗖𝗢𝗡𝗩𝗘𝗥𝗧 𝗦𝗨𝗖𝗖𝗘𝗦𝗦\n" +
        "➖ 💰 %1\n" +
        "➕ 💎 %2",

      premiumActive: "𝗬𝗘𝗦",
      premiumInactive: "𝗡𝗢",
      lifetime: "𝗣𝗘𝗥𝗠𝗔𝗡𝗘𝗡𝗧",
      expired: "𝗘𝗫𝗣𝗜𝗥𝗘𝗗",

      buySuccess:
        "🌟 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗 🌟\n" +
        "👤 𝗨𝘀𝗲𝗿 : %1\n" +
        "⏱ 𝗗𝗮𝘆𝘀 : %2\n" +
        "💎 𝗖𝗼𝘀𝘁 : %3\n" +
        "📅 𝗘𝘅𝗽𝗶𝗿𝗲 : %4",

      invalid:
        "❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗨𝗦𝗔𝗚𝗘\n" +
        "• acc\n• acc shop\n• acc premium buy <days>\n• acc convert <diamond>"
    }
  },

  ncStart: async ({ args, usersData, message, event, getLang }) => {
    const userID = event.senderID;
    const user = await usersData.get(userID) || {};

    const name = user.name || "Unknown";
    const money = user.money || 0;
    const diamond = user.diamond || 0;
    const premium = user.data?.premium || { status: false, expireTime: null };

    const formatExpire = (t) =>
      t == null ? getLang("lifetime")
        : Date.now() > t ? getLang("expired")
          : getTime(t, "DD/MM/YYYY HH:mm:ss");

    const remaining = (t) => {
      if (!t) return getLang("lifetime");
      const r = t - Date.now();
      if (r <= 0) return getLang("expired");
      const d = Math.floor(r / DAY_MS);
      const h = Math.floor((r % DAY_MS) / 3600000);
      const m = Math.floor((r % 3600000) / 60000);
      return [d && `${d}𝗱`, h && `${h}𝗵`, m && `${m}𝗺`].filter(Boolean).join(" ") || "<1𝗺";
    };

    if (!args.length) {
      return message.reply(
        getLang(
          "accountInfo",
          name,
          userID,
          money.toLocaleString(),
          diamond.toLocaleString(),
          premium.status ? getLang("premiumActive") : getLang("premiumInactive"),
          premium.status ? formatExpire(premium.expireTime) : "-",
          premium.status ? remaining(premium.expireTime) : "-"
        )
      );
    }

    if (args[0] === "convert") {
      const dia = parseInt(args[1], 10);
      if (!dia || dia <= 0)
        return message.reply(getLang("convertInfo", CONVERT_RATE, (5000 * CONVERT_RATE).toLocaleString()));

      const costMoney = dia * CONVERT_RATE;
      if (money < costMoney)
        return message.reply(getLang("notEnoughMoney", costMoney.toLocaleString(), money.toLocaleString()));

      await usersData.subtractMoney(userID, costMoney);
      await usersData.addDiamond(userID, dia);

      return message.reply(getLang("convertSuccess", costMoney.toLocaleString(), dia.toLocaleString()));
    }

    if (args[0] === "shop") {
      return message.reply(
        getLang(
          "shopInfo",
          PRICE_PER_DAY.toLocaleString(),
          (1 * PRICE_PER_DAY).toLocaleString(),
          (7 * PRICE_PER_DAY).toLocaleString(),
          (30 * PRICE_PER_DAY).toLocaleString(),
          (365 * PRICE_PER_DAY).toLocaleString()
        )
      );
    }

    if (args[0] === "premium" && args[1] === "buy") {
      const days = parseInt(args[2], 10);
      if (!days || days <= 0) return message.reply(getLang("invalid"));

      const cost = days * PRICE_PER_DAY;
      if (diamond < cost)
        return message.reply(getLang("notEnoughDiamond", cost.toLocaleString(), diamond.toLocaleString()));

      await usersData.subtractDiamond(userID, cost);

      const now = Date.now();
      const newExpire =
        premium.status && premium.expireTime > now
          ? premium.expireTime + days * DAY_MS
          : now + days * DAY_MS;

      await usersData.set(userID, { premium: { status: true, expireTime: newExpire } }, "data");

      return message.reply(
        getLang("buySuccess", name, days, cost.toLocaleString(), formatExpire(newExpire))
      );
    }

    return message.reply(getLang("invalid"));
  }
};