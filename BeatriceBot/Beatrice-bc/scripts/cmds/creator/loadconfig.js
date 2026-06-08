const fs = require("fs-extra");

module.exports = {
        config: {
                name: "loadconfig",
                aliases: ["loadcf"],
                version: "1.4",
                author: "NTKhang",
                countDown: 5,
                role: 2,
                description: {
                        vi: "Load lại config của bot",
                        en: "Reload config of bot"
                },
                category: "owner",
                guide: "{pn}"
        },

        langs: {
                vi: {
                        success: "Config đã được load lại thành công"
                },
                en: {
                        success: "Config has been reloaded successfully"
                }
        },

        ncStart: async function ({ message, getLang }) {
                global.BeatriceBC.ncsetting = fs.readJsonSync(global.client.dirConfig);
                global.BeatriceBC.configCommands = fs.readJsonSync(global.client.dirConfigCommands);
                message.reply(getLang("success"));
        }
};