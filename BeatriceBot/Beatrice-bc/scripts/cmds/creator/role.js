const { ncsetting } = global.BeatriceBC;
const config = ncsetting;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "role",
    aliases: ["roles"],
    version: "1.0",
    author: "NoobCore Team",
    countDown: 5,
    role: 3,
    description: {
      en: "Manage bot roles (admin / creator)"
    },
    category: "owner",
    guide: {
      en:
        "╭─╼━━『 👑 ROLE MANAGER 』━━━╾─╮\n" +
        "│\n" +
        "│ ➕ /role admin add <uid | @tag | reply>\n" +
        "│ ➖ /role admin remove <uid | @tag>\n" +
        "│ 📜 /role admin list\n" +
        "│\n" +
        "│ ➕ /role creator add <uid | @tag>\n" +
        "│ ➖ /role creator remove <uid | @tag>\n" +
        "│ 📜 /role creator list\n"
    }
  },

  langs: {
    en: {
      invalidRole: "⚠️ | Role must be *admin* or *creator*",
      invalidAction: "⚠️ | Action must be *add / remove / list*",
      missingId: "⚠️ | Please mention, reply or provide UID",
      added:
        "╭─『 ✅ ROLE ADDED 』─╮\n%1\n╰────────────────╯",
      removed:
        "╭─『 🗑️ ROLE REMOVED 』─╮\n%1\n╰────────────────╯",
      existed:
        "⚠️ | Already exists:\n%1",
      notFound:
        "⚠️ | Not found:\n%1",
      list:
        "╭─『 👑 %1 LIST 』─╮\n%2\n╰────────────────╯"
    }
  },

  ncStart: async function ({ message, args, event, usersData, getLang }) {
    const roleType = args[0];
    const action = args[1];

    if (!["admin", "creator"].includes(roleType))
      return message.reply(getLang("invalidRole"));

    if (!["add", "remove", "list"].includes(action))
      return message.reply(getLang("invalidAction"));

    const roleKey = roleType === "admin" ? "adminBot" : "creator";

    // Ensure array exists
    if (!Array.isArray(config[roleKey]))
      config[roleKey] = [];

    const getUIDs = () => {
      if (Object.keys(event.mentions || {}).length > 0)
        return Object.keys(event.mentions);
      if (event.messageReply)
        return [event.messageReply.senderID];
      return args.slice(2).filter(uid => !isNaN(uid));
    };

    /* ===== LIST ===== */
    if (action === "list") {
      const list = await Promise.all(
        config[roleKey].map(uid =>
          usersData.getName(uid, true)
            .then(name => `• ${name || "User"} (${uid})`)
            .catch(() => `• ${uid}`)
        )
      );

      return message.reply(
        getLang("list", roleType.toUpperCase(), list.join("\n") || "• Empty")
      );
    }

    const uids = getUIDs();
    if (!uids.length) return message.reply(getLang("missingId"));

    const added = [];
    const removed = [];
    const existed = [];
    const notFound = [];

    for (const uid of uids) {
      const index = config[roleKey].indexOf(uid);

      if (action === "add") {
        if (index !== -1) existed.push(uid);
        else {
          config[roleKey].push(uid);
          added.push(uid);
        }
      }

      if (action === "remove") {
        if (index === -1) notFound.push(uid);
        else {
          config[roleKey].splice(index, 1);
          removed.push(uid);
        }
      }
    }

    writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

    const formatUsers = async (uids) =>
      Promise.all(
        uids.map(uid =>
          usersData.getName(uid, false)
            .then(name => `• ${name || "User"} (${uid})`)
            .catch(() => `• ${uid}`)
        )
      ).then(r => r.join("\n"));

    let msg = "";

    if (added.length)
      msg += getLang("added", await formatUsers(added));

    if (removed.length)
      msg += getLang("removed", await formatUsers(removed));

    if (existed.length)
      msg += "\n" + getLang("existed", existed.map(u => `• ${u}`).join("\n"));

    if (notFound.length)
      msg += "\n" + getLang("notFound", notFound.map(u => `• ${u}`).join("\n"));

    return message.reply(msg.trim());
  }
};