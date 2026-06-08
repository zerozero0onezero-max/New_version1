const fs = require("fs-extra");
const { ncsetting } = global.BeatriceBC;
const { client } = global;
const config = ncsetting;

module.exports = {
        config: {
                name: "premiumonly",
                aliases: ["pmonly", "onlypm", "onlypremium"],
                version: "1.5",
                author: "NTKhang",
                countDown: 5,
                role: 2,
                description: {
                        vi: "bật/tắt chế độ chỉ premium user mới có thể sử dụng bot",
                        en: "turn on/off only premium user can use bot"
                },
                category: "owner",
                guide: {
                        vi: "   {pn} [on | off]: bật/tắt chế độ chỉ premium user mới có thể sử dụng bot"
                                        + "\n   {pn} noti [on | off]: bật/tắt thông báo khi người dùng không phải là premium sử dụng bot",
                        en: "   {pn} [on | off]: turn on/off the mode only premium user can use bot"
                                        + "\n   {pn} noti [on | off]: turn on/off the notification when user is not premium use bot"
                }
        },

        langs: {
                vi: {
                        turnedOn: "Đã bật chế độ chỉ premium user mới có thể sử dụng bot",
                        turnedOff: "Đã tắt chế độ chỉ premium user mới có thể sử dụng bot",
                        turnedOnNoti: "Đã bật thông báo khi người dùng không phải là premium sử dụng bot",
                        turnedOffNoti: "Đã tắt thông báo khi người dùng không phải là premium sử dụng bot"
                },
                en: {
                        turnedOn: "Turned on the mode only premium user can use bot",
                        turnedOff: "Turned off the mode only premium user can use bot",
                        turnedOnNoti: "Turned on the notification when user is not premium use bot",
                        turnedOffNoti: "Turned off the notification when user is not premium use bot"
                }
        },

        ncStart: function ({ args, message, getLang }) {
                let isSetNoti = false;
                let value;
                let indexGetVal = 0;

                if (args[0] == "noti") {
                        isSetNoti = true;
                        indexGetVal = 1;
                }

                if (args[indexGetVal] == "on")
                        value = true;
                else if (args[indexGetVal] == "off")
                        value = false;
                else
                        return message.SyntaxError();

                if (isSetNoti) {
                        config.hideNotiMessage.premiumOnly = !value;
                        message.reply(getLang(value ? "turnedOnNoti" : "turnedOffNoti"));
                }
                else {
                        config.premiumOnly.enable = value;
                        if (value) {
                                if (!config.premiumOnly.ignoreCommand.includes("account")) {
                                        config.premiumOnly.ignoreCommand.push("account");
                                }
                        }
                        message.reply(getLang(value ? "turnedOn" : "turnedOff"));
                }

                fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        }
};
