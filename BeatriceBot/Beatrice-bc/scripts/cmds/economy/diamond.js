const fs = require('fs');
const path = require('path');

const { config } = global.BeatriceBC;

module.exports = {
  config: {
    name: "diamond",
    aliases: ["dm", "dia"],
    version: "1.7.0",
    author: "T A N J I L 🎀",
    role: 0,
    category: "game",
    description: "View, add, delete, transfer diamonds",
    guide: { en: `
{pn}: View your diamonds
{pn} <@tag>: View user's diamonds
{pn} transfer <@tag/reply/uid> <amount>
(Admin)
{pn} add <@tag/reply/uid> <amount>
{pn} delete <@tag/reply/uid> <amount>
    `}
  },

  ncStart: async function ({ message, usersData, event, args }) {
    const senderID = event.senderID;
    const adminIDs = Array.isArray(config.adminBot)
      ? config.adminBot
      : [config.adminBot];

    const formatDiamond = (n) => {
      const u = ["", "K", "M", "B", "T"];
      let i = 0;
      while (n >= 1000 && i < u.length - 1) {
        n /= 1000;
        i++;
      }
      return `${n.toFixed(2)}${u[i]}💎`;
    };

    // Path to store diamond data
    const diamondFilePath = path.join(__dirname, '..', '..', 'data', 'diamondData.json');
    
    // Load diamond data
    let diamondData = {};
    try {
      if (fs.existsSync(diamondFilePath)) {
        const data = fs.readFileSync(diamondFilePath, 'utf8');
        diamondData = JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading diamond data:", error);
      diamondData = {};
    }

    // Save diamond data
    const saveDiamondData = () => {
      try {
        // Ensure data directory exists
        const dataDir = path.dirname(diamondFilePath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(diamondFilePath, JSON.stringify(diamondData, null, 2), 'utf8');
      } catch (error) {
        console.error("Error saving diamond data:", error);
      }
    };

    // Get user diamond
    const getDiamond = (uid) => {
      uid = uid.toString();
      if (diamondData[uid] === undefined || diamondData[uid] === null) {
        diamondData[uid] = 0;
      }
      return Number(diamondData[uid]);
    };

    // Set user diamond
    const setDiamond = (uid, amount) => {
      uid = uid.toString();
      diamondData[uid] = Number(amount);
      saveDiamondData();
      return true;
    };

    // Get user name
    const getUserName = async (uid) => {
      try {
        const userData = await usersData.get(uid);
        return userData?.name || "User";
      } catch {
        return "User";
      }
    };

    // Function to determine target UID and amount
    const getTargetAndAmount = () => {
      let targetUID = null;
      let amount = null;
      
      // Case 1: Reply to a message
      if (event.messageReply) {
        targetUID = event.messageReply.senderID;
        // Find amount in args (should be args[1] if command is .dm add amount)
        for (let i = 1; i < args.length; i++) {
          if (!isNaN(args[i]) && Number(args[i]) > 0) {
            amount = Number(args[i]);
            break;
          }
        }
      }
      // Case 2: Mentioned users
      else if (Object.keys(event.mentions).length > 0) {
        targetUID = Object.keys(event.mentions)[0];
        // Find amount in args (should be args[1])
        if (args[1] && !isNaN(args[1]) && Number(args[1]) > 0) {
          amount = Number(args[1]);
        }
      }
      // Case 3: UID provided as argument
      else if (args[1] && !isNaN(args[1]) && args[1].length >= 15) {
        targetUID = args[1];
        if (args[2] && !isNaN(args[2]) && Number(args[2]) > 0) {
          amount = Number(args[2]);
        }
      }
      // Case 4: Only amount provided (add to self)
      else if (args[1] && !isNaN(args[1]) && Number(args[1]) > 0) {
        targetUID = senderID;
        amount = Number(args[1]);
      }
      
      return { targetUID, amount };
    };

    // 🔍 VIEW COMMAND
    if (!args[0] || Object.keys(event.mentions).length > 0) {
      // If there are mentions, show mentioned users' diamonds
      if (Object.keys(event.mentions).length > 0) {
        const uids = Object.keys(event.mentions);
        let msg = "";
        for (const uid of uids) {
          const diamondCount = getDiamond(uid);
          const userName = event.mentions[uid].replace("@", "");
          msg += `💎 ${userName}'s Diamonds: ${formatDiamond(diamondCount)}\n`;
        }
        return message.reply(msg);
      }
      
      // Otherwise show sender's diamonds
      const diamondCount = getDiamond(senderID);
      const userName = await getUserName(senderID);
      
      return message.reply(`💎 ${userName}'s Diamonds: ${formatDiamond(diamondCount)}`);
    }

    // ➕ ADD COMMAND (ADMIN ONLY)
    if (args[0].toLowerCase() === "add") {
      if (!adminIDs.includes(senderID))
        return message.reply("❌ Permission denied.");

      const { targetUID, amount } = getTargetAndAmount();

      if (!targetUID || !amount || amount <= 0) {
        return message.reply(
          "❌ Invalid format.\n" +
          "Usage:\n" +
          "• .dm add amount (adds to yourself)\n" +
          "• .dm add @mention amount\n" +
          "• .dm add uid amount\n" +
          "• Reply to a message: .dm add amount"
        );
      }

      const currentDiamond = getDiamond(targetUID);
      const newDiamond = currentDiamond + amount;
      
      setDiamond(targetUID, newDiamond);
      
      let userName = await getUserName(targetUID);
      if (targetUID === senderID) {
        userName = "yourself";
      }
      
      return message.reply(
        `✅ Added ${formatDiamond(amount)} diamonds to ${userName}.\n` +
        `New total: ${formatDiamond(newDiamond)}`
      );
    }

    // ➖ DELETE COMMAND (ADMIN ONLY)
    if (args[0].toLowerCase() === "delete") {
      if (!adminIDs.includes(senderID))
        return message.reply("❌ Permission denied.");

      const { targetUID, amount } = getTargetAndAmount();

      if (!targetUID || !amount || amount <= 0)
        return message.reply("❌ Invalid user or amount.");

      const currentDiamond = getDiamond(targetUID);
      
      if (currentDiamond < amount)
        return message.reply("❌ Not enough diamonds.");

      const newDiamond = currentDiamond - amount;
      setDiamond(targetUID, newDiamond);

      let userName = await getUserName(targetUID);
      if (targetUID === senderID) {
        userName = "yourself";
      }
      
      return message.reply(
        `✅ Deleted ${formatDiamond(amount)} diamonds from ${userName}.\n` +
        `New total: ${formatDiamond(newDiamond)}`
      );
    }

    // 🔁 TRANSFER COMMAND
    if (args[0].toLowerCase() === "transfer") {
      const { targetUID, amount } = getTargetAndAmount();

      if (!targetUID || !amount || amount <= 0)
        return message.reply("❌ Invalid user or amount.");

      if (targetUID === senderID)
        return message.reply("❌ Can't transfer to yourself.");

      const senderDiamond = getDiamond(senderID);
      if (senderDiamond < amount)
        return message.reply("❌ Not enough diamonds.");

      const receiverDiamond = getDiamond(targetUID);

      // Update sender
      setDiamond(senderID, senderDiamond - amount);
      // Update receiver
      setDiamond(targetUID, receiverDiamond + amount);

      const receiverName = await getUserName(targetUID);
      
      return message.reply(
        `💎 Transferred ${formatDiamond(amount)} to ${receiverName} successfully.\n` +
        `Your new balance: ${formatDiamond(senderDiamond - amount)}`
      );
    }

    // If first argument is a UID (long number), show that user's diamonds
    if (!isNaN(args[0]) && args[0].length >= 15) {
      const targetUID = args[0];
      const diamondCount = getDiamond(targetUID);
      const userName = await getUserName(targetUID);
      
      return message.reply(`💎 ${userName}'s Diamonds: ${formatDiamond(diamondCount)}`);
    }

    // If no valid command, show help
    return message.reply(
      "💎 Diamond System Commands:\n" +
      "• .dm - View your diamonds\n" +
      "• .dm @mention - View mentioned user's diamonds\n" +
      "• .dm transfer @mention/reply/uid amount - Transfer diamonds\n" +
      "(Admin Only)\n" +
      "• .dm add amount - Add diamonds to yourself\n" +
      "• .dm add @mention/reply/uid amount - Add diamonds to user"
    );
  }
};