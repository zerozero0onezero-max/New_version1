const fs = require("fs-extra");
const { ncsetting } = global.BeatriceBC;
const { client } = global;
const config = ncsetting;

module.exports = {
	config: {
		name: "creatoronly",
		aliases: ["coonly", "onlyco", "onlycreator"],
		version: "1.5",
		author: "NoobCore Team",
		countDown: 5,
		role: 3,
		description: {
			vi: "bật/tắt chế độ chỉ creator mới có thể sử dụng bot",
			en: "turn on/off only creator can use bot"
		},
		category: "owner",
		guide: {
			vi: "   {pn} [on | off]: bật/tắt chế độ chỉ creator mới có thể sử dụng bot"
					+ "\n   {pn} noti [on | off]: bật/tắt thông báo khi người dùng không phải là creator sử dụng bot",
			en: "   {pn} [on | off]: turn on/off the mode only creator can use bot"
					+ "\n   {pn} noti [on | off]: turn on/off the notification when user is not creator use bot"
		}
	},

	langs: {
		vi: {
			turnedOn: "Đã bật chế độ chỉ creator mới có thể sử dụng bot",
			turnedOff: "Đã tắt chế độ chỉ creator mới có thể sử dụng bot",
			turnedOnNoti: "Đã bật thông báo khi người dùng không phải là creator sử dụng bot",
			turnedOffNoti: "Đã tắt thông báo khi người dùng không phải là creator sử dụng bot"
		},
		en: {
			turnedOn: "Turned on the mode only creator can use bot",
			turnedOff: "Turned off the mode only creator can use bot",
			turnedOnNoti: "Turned on the notification when user is not creator use bot",
			turnedOffNoti: "Turned off the notification when user is not creator use bot"
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
			config.hideNotiMessage.creatorOnly = !value;
			message.reply(getLang(value ? "turnedOnNoti" : "turnedOffNoti"));
		}
		else {
			config.creatorOnly.enable = value;
			message.reply(getLang(value ? "turnedOn" : "turnedOff"));
		}

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
	}
};
