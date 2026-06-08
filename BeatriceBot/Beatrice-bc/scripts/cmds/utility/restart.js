const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "restart",
		version: "2.0",
		author: "NTKhang + Fix by nc-xnil",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Restart bot"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   {pn}: Restart bot"
		}
	},

	langs: {
		en: {
			restartting: "🔄 | Restarting bot..."
		}
	},

	onLoad: function ({ api }) {
		try {
			const dirPath = path.join(__dirname, "tmp");
			const pathFile = path.join(dirPath, "restart.txt");

			if (!fs.existsSync(pathFile)) return;

			const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");

			setTimeout(() => {
				try {
					api.sendMessage(
						`✅ | Bot restarted\n⏰ | Time: ${((Date.now() - Number(time)) / 1000).toFixed(2)}s`,
						tid
					);
				} catch (err) {
					console.log("Restart message failed:", err.message);
				}
			}, 10000);

			fs.unlinkSync(pathFile);
		} catch (err) {
			console.log("onLoad restart error:", err.message);
		}
	},

	ncStart: async function ({ message, event, getLang }) {
		try {
			const dirPath = path.join(__dirname, "tmp");
			const pathFile = path.join(dirPath, "restart.txt");
			fs.ensureDirSync(dirPath);

			fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);

			await message.reply(getLang("restartting"));

			process.exit(2);
		} catch (err) {
			console.log("Restart command error:", err.message);
			await message.reply("❌ | Restart failed!");
		}
	}
};