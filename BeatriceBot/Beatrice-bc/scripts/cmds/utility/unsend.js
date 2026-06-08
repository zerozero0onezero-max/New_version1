module.exports = {
    config: {
        name: "unsend",
        aliases: ["u", "un", "uns", "unsent"],
        version: "1.7", 
        author: "NoobCore Team", 
        countDown: 5,
        role: 0,
        description: {
            vi: "Gỡ tin nhắn của bot",
            en: "Unsend bot's message"
        },
        category: "box chat",
        guide: {
            vi: "reply tin nhắn muốn gỡ của bot và gọi lệnh {pn}",
            en: "reply the message you want to unsend and call the command {pn}"
        }
    },

    langs: {
        vi: {
            syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot"
        },
        en: {
            syntaxError: "Please reply the message you want to unsend"
        }
    },

    ncStart: async function ({ message, event, api, getLang }) {
        const { messageReply } = event;

        
        if (!messageReply || messageReply.senderID !== api.getCurrentUserID()) {
            return message.reply(getLang("syntaxError"));
        }

        try {
            await message.unsend(messageReply.messageID);
        } catch (error) {
            console.error(`[UNSEND ERROR] Failed to unsend: ${error.message}`);
        }
    },

    ncPrefix: async function({ event, message, api }) {
        const ncPrefixCommands = ["u", "r", "un", "rmv", "uns", "unse", "remove", "unsen", "unsent", "rm"];
        const body = (event.body || "").toLowerCase().trim();
        
        if (ncPrefixCommands.includes(body)) {
            if (!event.messageReply || event.messageReply.senderID != api.getCurrentUserID()) {
                return;
            }
            
            try {
                await message.unsend(event.messageReply.messageID);
            } catch (error) {
                console.error("Error unsending message in onChat:", error);
            }
        }
    }
};