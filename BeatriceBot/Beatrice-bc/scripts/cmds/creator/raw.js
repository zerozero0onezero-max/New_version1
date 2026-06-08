const fs = require('fs');
const path = require('path');
const axios = require('axios');

const baseApiUrl = async () => {
	const base = await axios.get('https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json');
	return base.data.gist;
};

function xfind(dir, name) {
	const files = fs.readdirSync(dir);
	for (const file of files) {
		const fPath = path.join(dir, file);
		const stat = fs.statSync(fPath);
		if (stat.isDirectory()) {
			const found = xfind(fPath, name);
			if (found) return found;
		} else if (file.toLowerCase() === name.toLowerCase()) {
			return fPath;
		}
	}
	return null;
}

module.exports = {
	config: {
		name: "raw",
		version: "1.0",
		role: 3,
		author: "𝑵𝑪-𝑺𝑨𝑰𝑴",
		team: "NoobCore",
		description: "Generate a RAW text link from replied code or from local bot files",
		guide: {
			en: "{pn} → Reply to a code snippet to create RAW Link\n{pn} [filename] → Create raw from cmds folder\n{pn} [subfolder] [filename] → Create raw from subfolder\n{pn} -e [filename] → Create raw from events folder"
		},
		countDown: 1
	},

	ncStart: async function ({ api, event, args }) {
		let fileName = args[0];
		let code = "";

		try {
			if (event.type === "message_reply" && event.messageReply?.body) {
				code = event.messageReply.body;
				if (!fileName) {
					const time = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
					fileName = `raw_${time}.txt`;
				} else if (!fileName.endsWith(".txt")) {
					fileName = `${fileName}.txt`;
				}
			}
			else if (fileName) {
				let filePath;
				const commandsPath = path.resolve(process.cwd(), 'scripts/cmds');
				const eventsPath = path.resolve(process.cwd(), 'scripts/events');

				if (args[0] === "-e") {
					const eventFile = args[1];
					if (!eventFile) return api.sendMessage("⚠ | Please provide a filename after -e.", event.threadID, event.messageID);
					fileName = eventFile.endsWith(".js") ? eventFile : `${eventFile}.js`;
					filePath = xfind(eventsPath, fileName);
				} else if (args.length >= 2) {

					const subfolder = args[0];
					const name = args[1].endsWith(".js") ? args[1] : `${args[1]}.js`;
					const potentialPath = path.join(commandsPath, subfolder, name);
					if (fs.existsSync(potentialPath)) {
						filePath = potentialPath;
					} else {

						filePath = xfind(commandsPath, name);
					}
				} else {
					const searchName = fileName.endsWith(".js") ? fileName : `${fileName}.js`;
					filePath = xfind(commandsPath, searchName);
				}

				if (!filePath || !fs.existsSync(filePath)) {
					return api.sendMessage(`❌ File "${fileName}" not found.`, event.threadID, event.messageID);
				}
				code = await fs.promises.readFile(filePath, "utf-8");
			}
			else {
				return api.sendMessage("⚠ | Please reply with code OR provide a file name.", event.threadID, event.messageID);
			}

			const encoded = encodeURIComponent(code);
			const apiUrl = await baseApiUrl();
			const response = await axios.post(`${apiUrl}/raw`, { code: encoded });

			const link = response.data?.raw_url;
			if (!link) throw new Error("Invalid API Response");

			return api.sendMessage(link, event.threadID, event.messageID);

		} catch (err) {
			console.error("❌ RAW Error:", err.message || err);
			return api.sendMessage(
				"⚠️ Failed to create RAW link. Maybe server issue.\n💬 Contact author for help: https://m.me/ye.bi.nobi.tai.244493",
				event.threadID,
				event.messageID
			);
		}
	}
};