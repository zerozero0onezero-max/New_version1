const dn = 20;
const dp = 30;
const mbet = 6_000_000;

const em = [
  { emoji: "🍒", weight: 30 },
  { emoji: "🍋", weight: 25 },
  { emoji: "🍇", weight: 20 },
  { emoji: "🍉", weight: 15 },
  { emoji: "⭐", weight: 7 },
  { emoji: "7️⃣", weight: 3 }
];

/* ===== MONEY FORMAT ===== */
const fm = (n = 0) => {
  if (n >= 1e15) return (n / 1e15).toFixed(2) + "QT";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(2) + "K";
  return String(n);
};

/* ===== PARSE BET ===== */
const parseBet = (input) => {
  if (!input) return NaN;
  const s = input.toLowerCase();
  if (s.endsWith("qt")) return Number(s.slice(0, -2)) * 1e15;
  if (s.endsWith("t"))  return Number(s.slice(0, -1)) * 1e12;
  if (s.endsWith("b"))  return Number(s.slice(0, -1)) * 1e9;
  if (s.endsWith("m"))  return Number(s.slice(0, -1)) * 1e6;
  if (s.endsWith("k"))  return Number(s.slice(0, -1)) * 1e3;
  return Number(s);
};

/* ===== BD DATE ===== */
const bdDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/* ===== ROLL ===== */
const roll = () => {
  const total = em.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of em) {
    if (r < s.weight) return s.emoji;
    r -= s.weight;
  }
  return em[0].emoji;
};

module.exports = {
  config: {
    name: "slots",
    aliases: ["slot"],
    version: "2.1.2",
    author: "NC-xnil6x",
    role: 0,
    category: "game",
    description: "🎰 Ultra Premium Stylish Slot Machine",
    guide: {
      en:
        "{pn}slot 500 | 1k | 1m\n" +
        "{pn}slot info\n" +
        "{pn}slot top"
    }
  },

  ncStart: async ({ event, args, message, usersData }) => {
    const { senderID } = event;
    const sub = (args[0] || "").toLowerCase();
    const today = bdDate();

    const user = await usersData.get(senderID) || {};
    const isPremium = user.data?.premium?.status === true;
    const dl = isPremium ? dp : dn;

    /* ===== INIT STATS ===== */
    let todayStats = user.data?.slotsToday || {};
    if (todayStats.date !== today) {
      todayStats = { date: today, play: 0, win: 0, lose: 0, winMoney: 0 };
    }

    let allStats = user.data?.slotsAll || { play: 0, win: 0 };

    /* ===== INFO ===== */
    if (sub === "info") {
      const rate = todayStats.play
        ? ((todayStats.win / todayStats.play) * 100).toFixed(1)
        : "0";

      const allUsers = await usersData.getAll();
      const ranking = Object.values(allUsers)
        .sort((a, b) =>
          (b.data?.slotsAll?.win || 0) - (a.data?.slotsAll?.win || 0)
        );

      const rankIndex = ranking.findIndex(u => u.userID === senderID);
      const globalRank =
        rankIndex === -1 ? "N/A" : `${rankIndex + 1}/${ranking.length}`;

      return message.reply(
        `╔═══ 📊 𝚂𝙻𝙾𝚃 𝙸𝙽𝙵𝙾 ═══╗\n` +
        `║ 👤 𝚄𝚜𝚎𝚛: ${user.name || "Unknown"}\n` +
        `║ 👑 𝙿𝚛𝚎𝚖𝚒𝚞𝚖: ${isPremium ? "YES" : "NO"}\n` +
        `║ 🎯 𝙳𝚊𝚒𝚕𝚢 𝙻𝚒𝚖𝚒𝚝: ${dl}\n` +
        `╠══════ 𝚃𝙾𝙳𝙰𝚈 ══════╣\n` +
        `║ 🎰 𝙿𝚕𝚊𝚢𝚎𝚍 : ${todayStats.play}\n` +
        `║ 🎉 𝚆𝚒𝚗 𝙱𝚎𝚝 : ${todayStats.win}\n` +
        `║ 😢 𝙻𝚘𝚜𝚝 𝙱𝚎𝚝: ${todayStats.lose}\n` +
        `║ 📈 𝚆𝚒𝚗 𝚁𝚊𝚝𝚎: ${rate}%\n` +
        `║ 💰 𝚆𝚒𝚗 𝙼𝚘𝚗𝚎𝚢: ${fm(todayStats.winMoney)}\n` +
        `╠════ 𝙰𝙻𝙻 𝚃𝙸𝙼𝙴 ════╣\n` +
        `║ 🎰 𝚃𝚘𝚝𝚊𝚕 𝙿𝚕𝚊𝚢: ${allStats.play}\n` +
        `║ 🏆 𝚃𝚘𝚝𝚊𝚕 𝚆𝚒𝚗 : ${allStats.win}\n` +
        `║ 🌍 𝙶𝚕𝚘𝚋𝚊𝚕 𝚁𝚊𝚗𝚔: ${globalRank}\n` +
        `╚══════════════════╝`
      );
    }

    /* ===== TOP ===== */
    if (sub === "top") {
      const all = await usersData.getAll();
      const top = Object.values(all)
        .map(u => ({
          name: u.name || "Unknown",
          win: u.data?.slotsAll?.win || 0
        }))
        .sort((a, b) => b.win - a.win)
        .slice(0, 10);

      return message.reply(
        `🏆 SLOT TOP 10 (ALL TIME)\n\n` +
        top.map((u, i) =>
          `🥇 #${i + 1}\n👤 ${u.name}\n🏆 Wins: ${u.win}`
        ).join("\n\n")
      );
    }

    /* ===== BET ===== */
    const bet = parseBet(args[0]);
    if (!bet || isNaN(bet))
      return message.reply("❌ Invalid bet amount!");

    if (bet > mbet)
      return message.reply(`🚫 Max Bet Allowed: ${fm(mbet)}`);

    if (todayStats.play >= dl)
      return message.reply(`⛔ Daily limit reached (${dl})`);

    if (user.money < bet)
      return message.reply(`💸 Need ${fm(bet - user.money)} more!`);

    /* ===== SPIN ===== */
    const s1 = roll();
    const s2 = roll();
    const s3 = roll();

    let win = -bet;
    let title = "☠️ LOSS";

    if (s1 === s2 && s2 === s3 && s1 === "7️⃣") {
      win = bet * 10;
      title = "🔥 MEGA JACKPOT";
    } else if (s1 === s2 && s2 === s3) {
      win = bet * 5;
      title = "💎 BIG WIN";
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      win = bet * 2;
      title = "✨ WIN";
    }

    /* ===== UPDATE ===== */
    todayStats.play++;
    allStats.play++;

    if (win > 0) {
      todayStats.win++;
      todayStats.winMoney += win;
      allStats.win++;
    } else {
      todayStats.lose++;
    }

    const newBalance = user.money + win;

    await usersData.set(senderID, {
      money: newBalance,
      "data.slotsToday": todayStats,
      "data.slotsAll": allStats
    });

    return message.reply(
      `🎰 𝚂𝙻𝙾𝚃 𝙼𝙰𝙲𝙷𝙸𝙽𝙴\n\n` +
      `╭─────────────╮\n` +
      `│ ${s1} │ ${s2} │ ${s3} │\n` +
      `╰─────────────╯\n\n` +
      `${title}\n` +
      `${win > 0 ? `💰 +${fm(win)}` : `💸 -${fm(bet)}`}\n\n` +
      `💳 𝙱𝚊𝚕𝚊𝚗𝚌𝚎: ${fm(newBalance)}\n` +
      `🎯 𝚃𝚘𝚍𝚊𝚢: ${todayStats.play}/${dl}`
    );
  }
};