module.exports = {
  config: {
    name: "bank",
    aliases: ["wallet"],
    version: "2.1",
    author: "NOOBCORE TEAM",
    countDown: 5,
    role: 0,
    description: "Bank system with wallet, bank, loan, etc.",
    category: "economy",
    guide: {
      en: [
        "{pn} balance",
        "{pn} deposit <amount|all|half>",
        "{pn} withdraw <amount|all|half>",
        "{pn} loan",
        "{pn} repay [amount|all|half]",
        "{pn} top"
      ].join("\n")
    }
  },

  /* =======================
   * Style Helpers
   * ======================= */
  brand() {
    return "🦋 ɴᴏᴏʙ ᴄᴏʀᴇ 𝗕𝗮𝗻𝗸";
  },

  line() {
    return "──────────────────────";
  },

  box(title, body, footer = "") {
    // single-line box with bold title
    const head = `╭─ ${title}`;
    const foot = footer ? `\n╰─ ${footer}` : "\n╰─";
    return `${head}\n${body}${foot}`;
  },

  row(label, value, icon = "") {
    // aligned row like: "💰 Wallet         12.3K"
    const lbl = `${icon ? icon + " " : ""}${label}`.padEnd(16, " ");
    return `│ ${lbl} ${value}`;
  },

  divider() {
    return "│ " + this.line();
  },

  progressBar(current, max, width = 16) {
    if (!max || max <= 0) max = current || 1;
    const ratio = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    return `│ 📊 Progress     [${"█".repeat(filled)}${"░".repeat(empty)}] ${Math.round(ratio * 100)}%`;
  },

  /* =======================
   * Utilities
   * ======================= */
  formatMoney(amount) {
    if (!Number.isFinite(amount)) return "0";
    if (amount === 0) return "0";
    const abs = Math.abs(amount);
    const short = (num, unit) =>
      (num).toFixed(2).replace(/\.00$/, "") + unit;

    if (abs >= 1e15) return short(amount / 1e15, "QT");
    if (abs >= 1e12) return short(amount / 1e12, "T");
    if (abs >= 1e9)  return short(amount / 1e9,  "B");
    if (abs >= 1e6)  return short(amount / 1e6,  "M");
    if (abs >= 1e3)  return short(amount / 1e3,  "K");

    return amount.toLocaleString("en-US");
  },

  /**
   * Parse human amounts:
   *  1k 2.5m 3b 4t 5qt | all | max | half
   */
  parseAmount(raw, contextMax = 0) {
    if (!raw) return NaN;
    const s = String(raw).trim().toLowerCase();

    if (s === "all" || s === "max") return Math.max(0, Math.floor(contextMax));
    if (s === "half") return Math.max(0, Math.floor(contextMax / 2));

    const m = s.match(/^(\d+(\.\d+)?)(k|m|b|t|qt)?$/i);
    if (!m) return NaN;
    const n = parseFloat(m[1]);
    const suf = (m[3] || "").toLowerCase();

    const mult = suf === "k" ? 1e3
               : suf === "m" ? 1e6
               : suf === "b" ? 1e9
               : suf === "t" ? 1e12
               : suf === "qt" ? 1e15
               : 1;

    const val = Math.floor(n * mult);
    return val > 0 ? val : NaN;
  },

  async getOrInitUser(usersData, uid) {
    const user = await usersData.get(uid);
    if (!user.data) user.data = {};
    if (!user.data.ypbbankdata) user.data.ypbbankdata = { bank: 0, loan: 0, loanLimit: 0 };
    if (typeof user.money !== "number") user.money = 0;
    return user;
  },

  async saveUser(usersData, uid, user) {
    return usersData.set(uid, { money: user.money, data: user.data });
  },

  ncStart: async function ({ message, args, event, usersData }) {
    try {
      const senderID = event.senderID;
      const sub = (args[0] || "").toLowerCase();
      const fmt = this.formatMoney.bind(this);

      if (!sub) {
        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          "│ 𝘊𝘰𝘮𝘮𝘢𝘯𝘥𝘴",
          "│ • balance",
          "│ • deposit <amount|all|half>",
          "│ • withdraw <amount|all|half>",
          "│ • loan",
          "│ • repay [amount|all|half]  (alias: preloan)",
          "│ • top"
        ].join("\n");
        return message.reply(this.box("🏦 Bank Commands", body, "Use the guide above."));
      }

      // Load user
      const user = await this.getOrInitUser(usersData, senderID);
      const bank = user.data.ypbbankdata;
      const userName = user.name || "Unknown";
      let wallet = user.money;

      /* -------- balance -------- */
      if (sub === "balance" || sub === "bal") {
        const header = `👤 ${userName}`;
        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          this.row("Wallet", fmt(wallet), "💰"),
          this.row("Bank",   fmt(bank.bank), "🏦"),
          this.row("Loan",   fmt(bank.loan), "💳"),
          ...(bank.loan > 0
            ? [ this.progressBar((bank.loanLimit || bank.loanLimit === 0) ? (bank.loanLimit - bank.loan) : 0,
                                  bank.loanLimit || bank.loan) ]
            : [])
        ].join("\n");
        return message.reply(this.box("📋 Account Summary", body, header));
      }

      /* -------- deposit -------- */
      if (sub === "deposit" || sub === "dep" || sub === "d") {
        const amount = this.parseAmount(args[1], wallet);
        if (!Number.isFinite(amount) || amount <= 0)
          return message.reply(this.box("❌ Invalid Input", "│ Enter a valid amount (e.g., 500, 2k, all, half)."));

        if (wallet < amount)
          return message.reply(this.box("❌ Not Enough Wallet", `│ You have ${fmt(wallet)}.`));

        user.money = wallet - amount;
        bank.bank += amount;
        await this.saveUser(usersData, senderID, user);

        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          this.row("Deposited", fmt(amount), "✅"),
          this.row("Bank", fmt(bank.bank), "🏦"),
          this.row("Wallet", fmt(user.money), "💰")
        ].join("\n");
        return message.reply(this.box("💸 Deposit Successful", body));
      }

      /* -------- withdraw -------- */
      if (sub === "withdraw" || sub === "with" || sub === "w") {
        const amount = this.parseAmount(args[1], bank.bank);
        if (!Number.isFinite(amount) || amount <= 0)
          return message.reply(this.box("❌ Invalid Input", "│ Enter a valid amount (e.g., 500, 2k, all, half)."));

        if (bank.bank < amount)
          return message.reply(this.box("❌ Not Enough Bank", `│ You have ${fmt(bank.bank)} in bank.`));

        bank.bank -= amount;
        user.money = wallet + amount;
        await this.saveUser(usersData, senderID, user);

        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          this.row("Withdrew", fmt(amount), "✅"),
          this.row("Wallet", fmt(user.money), "💰"),
          this.row("Bank", fmt(bank.bank), "🏦")
        ].join("\n");
        return message.reply(this.box("🏧 Withdraw Successful", body));
      }

      /* -------- loan -------- */
      if (sub === "loan") {
        const LOAN_LIMIT = 1_000_000; // tweak to your economy

        if (bank.loan > 0) {
          const body = [
            `│ Existing loan: ${fmt(bank.loan)}.`,
            "│ Repay it before taking a new one."
          ].join("\n");
          return message.reply(this.box("⛔ Loan Exists", body));
        }

        bank.loan = LOAN_LIMIT;
        bank.loanLimit = LOAN_LIMIT;
        user.money = wallet + LOAN_LIMIT;
        await this.saveUser(usersData, senderID, user);

        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          this.row("Approved", fmt(LOAN_LIMIT), "✅"),
          this.row("Wallet", fmt(user.money), "💰"),
          this.row("Loan", fmt(bank.loan), "💳"),
          this.progressBar(0, LOAN_LIMIT)
        ].join("\n");
        return message.reply(this.box("📝 Loan Approved", body, "Remember to repay on time."));
      }

      /* -------- repay (alias preloan) -------- */
      if (sub === "repay" || sub === "preloan") {
        if (bank.loan <= 0) {
          return message.reply(this.box("✅ No Active Loan", "│ You're debt-free. Nice!"));
        }

        const raw = args[1];
        const pay = raw ? this.parseAmount(raw, wallet) : bank.loan;

        if (!Number.isFinite(pay) || pay <= 0)
          return message.reply(this.box("❌ Invalid Input", "│ Enter a valid amount (e.g., 500, 2k, all, half)."));

        if (pay > wallet)
          return message.reply(this.box("❌ Not Enough Wallet", `│ You have ${fmt(wallet)}.`));

        const actual = Math.min(pay, bank.loan);
        user.money = wallet - actual;
        bank.loan -= actual;

        await this.saveUser(usersData, senderID, user);

        const cleared = bank.loan === 0;
        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          this.row("Repaid", fmt(actual), "✅"),
          this.row("Remaining", fmt(bank.loan), "💳"),
          this.row("Wallet", fmt(user.money), "💰"),
          this.progressBar((bank.loanLimit || 0) - bank.loan, bank.loanLimit || (actual + bank.loan))
        ].join("\n");

        return message.reply(this.box(cleared ? "🎉 Loan Cleared" : "📉 Repayment Successful", body));
      }

      /* -------- top -------- */
      if (sub === "top" || sub === "leaderboard" || sub === "lb") {
        const all = await usersData.getAll();
        const ranked = all
          .filter(u => u?.data?.ypbbankdata && typeof u.data.ypbbankdata.bank === "number")
          .map(u => ({
            name: u.name || "Unknown",
            bank: u.data.ypbbankdata.bank
          }))
          .sort((a, b) => b.bank - a.bank)
          .slice(0, 10);

        if (ranked.length === 0)
          return message.reply(this.box("❌ No Data", "│ No users found with money in bank."));

        const lines = ranked.map((u, i) => {
          const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";
          const index = String(i + 1).padStart(2, " ");
          return `│ ${index}. ${rankIcon} ${u.name} — ${this.formatMoney(u.bank)}`;
        });

        const body = [
          `│ ${this.brand()}`,
          this.divider(),
          ...lines
        ].join("\n");

        return message.reply(this.box("🏆 Top 10 — Bank Balance", body));
      }

      // Unknown subcommand
      return message.reply(this.box("❓ Invalid Command", "│ Try: balance, deposit, withdraw, loan, repay, top"));

    } catch (err) {
      console.error("Bank command error:", err);
      return message.reply(this.box("❌ Error", "│ An unexpected error occurred. Please try again."));
    }
  }
};