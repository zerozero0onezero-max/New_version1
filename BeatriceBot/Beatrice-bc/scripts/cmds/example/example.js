/**
 * 📦 Example Command
 * Team: NoobCore
 * Beginner today, core tomorrow
 */

module.exports = {
  config: {
    name: "example",                 // 🔹 Command name
    version: "1.0.0",                // 🔸 Version
    author: "Team NoobCore",          // 👨‍💻 Developer
    role: 3,                          // 🔐 0=User | 1=Admin | 2=Bot Admin | 3=Owner
    usePrefix: true,                  // ⛓️ Prefix required
    description: "Example command",   // 📝 Description
    guide: {
      en: "{pn} example",
      bn: "{pn} example"
    },
    category: "utility",              // 🧰 Category
    cooldowns: 3                      // ⏳ Cooldown (seconds)
  },

  // =======================
  // 🚀 Prefix Command Start
  // =======================
  ncStart: async function ({ api, event, args, message }) {
    return message.reply(
      "✅ Example command executed successfully!\n" +
      "🧠 ncStart function running."
    );
  },

  // =======================
  // 💬 No-Prefix Listener
  // =======================
  ncPrefix: async function ({ api, event, args, message }) {
    if (!event.body) return;

    if (event.body.toLowerCase() === "hello") {
      return message.reply("👋 Hello! ncPrefix is running.");
    }
  }
};