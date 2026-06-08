const mbet = 1_000_000;
const dln = 20;
const dlp = 30;

const line = "━━━━━━━━━━━━━━";

/* ===== MONEY FORMAT ===== */
const fm = (n = 0) => {
  if (n >= 1e15) return (n / 1e15).toFixed(2) + "QT";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "Q";
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(2) + "K";
  return String(n);
};

/* ===== PARSE BET ===== */
const pbet = (input) => {
  if (!input) return NaN;
  const s = input.toLowerCase();
  if (s.endsWith("qt")) return Number(s.slice(0, -2)) * 1e15;
  if (s.endsWith("q"))  return Number(s.slice(0, -1)) * 1e12;
  if (s.endsWith("b"))  return Number(s.slice(0, -1)) * 1e9;
  if (s.endsWith("m"))  return Number(s.slice(0, -1)) * 1e6;
  if (s.endsWith("k"))  return Number(s.slice(0, -1)) * 1e3;
  return Number(s);
};

/* ===== BD DATE ===== */
const bdDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/* ===== BADGE ===== */
const getBadge = (i) => {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "🎖️";
};

module.exports = {
  config: {
    name: "mine",
    version: "1.8.0",
    author: "NC-xnil6x",
    role: 0,
    category: "game",
    description: "💣 Mine Game (5 tiles, rank badge)",
    guide: {
      en:
        "{pn}mine <bet>\n" +
        "{pn}mine info\n" +
        "{pn}mine top"
    }
  },

  ncStart: async ({ api, event, args, message, usersData }) => {
    const { senderID } = event;
    const sub = (args[0] || "").toLowerCase();
    const today = bdDate();

    const user = await usersData.get(senderID) || {};
    const isPremium = user.data?.premium?.status === true;
    const dailyLimit = isPremium ? dlp : dln;

    /* ===== INIT STATS ===== */
    let todayStats = user.data?.mineToday || {};
    if (todayStats.date !== today) {
      todayStats = {
        date: today,
        play: 0,
        win: 0,
        half: 0,
        lose: 0,
        profit: 0
      };
    }

    let allStats = user.data?.mineAll || { win: 0 };

    /* ===== INFO ===== */
    if (sub === "info") {
      const winRate = todayStats.play
        ? ((todayStats.win / todayStats.play) * 100).toFixed(1)
        : "0.0";

      const allUsers = await usersData.getAll();
      const ranking = Object.values(allUsers)
        .sort((a, b) =>
          (b.data?.mineAll?.win || 0) -
          (a.data?.mineAll?.win || 0)
        );

      const rankIndex = ranking.findIndex(u => u.userID === senderID);
      const globalRank =
        rankIndex === -1 ? "N/A" : `${rankIndex + 1}/${ranking.length}`;

      return message.reply(
`${line}
💣 MINE INFO
${line}
• User    : ${user.name || "Unknown"}
• Premium : ${isPremium ? "YES" : "NO"}
• Limit   : ${todayStats.play}/${dailyLimit}
${line}
• Win     : ${todayStats.win}
• Half    : ${todayStats.half}
• Lose    : ${todayStats.lose}
• Rate    : ${winRate}%
${line}
• Global Rank : ${globalRank}
${line}`
      );
    }

    if (sub === "top") {
      const all = await usersData.getAll();
      const top = Object.values(all)
        .map(u => ({
          name: u.name || "Unknown",
          win: u.data?.mineAll?.win || 0
        }))
        .sort((a, b) => b.win - a.win)
        .slice(0, 10);

      return message.reply(
`${line}
🏆 MINE TOP 10
${line}
${top.map((u, i) =>
`${getBadge(i)} #${i + 1} ${u.name}
Wins: ${u.win}`
).join("\n\n")}
${line}`
      );
    }

    /* ===== BET ===== */
    const bet = pbet(args[0]);
    if (!bet || isNaN(bet))
      return message.reply("❌ Invalid bet amount!");

    if (bet > mbet)
      return message.reply(`🚫 Max bet: ${fm(mbet)}`);

    if (todayStats.play >= dailyLimit)
      return message.reply(`⛔ Daily limit reached (${dailyLimit})`);

    if (!user.money || user.money < bet)
      return message.reply("💸 Not enough balance!");

    await usersData.set(senderID, { money: user.money - bet });

    /* ===== GAME LOGIC ===== */
    const r = Math.random() * 100;
    let mc = r < 7 ? 5 : r < 42 ? 3 : r < 72 ? 2 : 0;

    const tiles = [1,2,3,4,5];
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    const moneyTiles = shuffled.slice(0, mc);

    const results = tiles.map(t =>
      moneyTiles.includes(t) ? "💰" : "💥"
    );

    const display = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];

    const sent = await message.reply(
`${line}
💣 MINE GAME
${line}
Bet: ${fm(bet)}

${display.join(" ")}
${line}`
    );

    /* ===== ANIMATION ===== */
    for (let i = 0; i < display.length; i++) {
      setTimeout(async () => {
        display[i] = results[i];

        if (i === display.length - 1) {
          todayStats.play++;
          let payout = 0;
          let title = "💀 YOU LOSE";
          let amount = `• Lost    : ${fm(bet)}`;

          if (mc === 5) {
            payout = bet * 20;
            title = "🔥 JACKPOT";
            amount = `• Won     : ${fm(payout)}`;
            todayStats.win++;
            allStats.win++;
            todayStats.profit += payout - bet;
          } else if (mc === 3) {
            payout = bet * 3;
            title = "🎉 YOU WIN";
            amount = `• Won     : ${fm(payout)}`;
            todayStats.win++;
            allStats.win++;
            todayStats.profit += payout - bet;
          } else if (mc === 2) {
            payout = Math.floor(bet * 0.5);
            title = "⚠️ HALF LOSS";
            amount = `• Return  : ${fm(payout)}`;
            todayStats.half++;
            todayStats.profit -= bet - payout;
          } else {
            todayStats.lose++;
            todayStats.profit -= bet;
          }

          if (payout > 0) {
            const u = await usersData.get(senderID);
            await usersData.set(senderID, { money: u.money + payout });
          }

          const u2 = await usersData.get(senderID);

          await usersData.set(senderID, {
            "data.mineToday": todayStats,
            "data.mineAll": allStats
          });

          await api.editMessage(
`${line}
${title}
${line}
${amount}
• Balance : ${fm(u2.money)}
• Limit   : ${todayStats.play}/${dailyLimit}
${line}`,
            sent.messageID
          );
          return;
        }

        await api.editMessage(display.join(" "), sent.messageID);
      }, (i + 1) * 700);
    }
  }
};