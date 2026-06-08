const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
	config: {
		name: "tiktok",
		aliases: ["tt", "tok", "tktk"],
		version: "1.8",
		author: "Azad",
		countDown: 5,
		role: 0,
		description: {
			en: "Send random TikTok video by search keyword"
		},
		category: "media",
		usePrefix: false
	},

	langs: {
		en: {
			noKeyword: "⚠️ | Please enter a search keyword!",
			searching: "🔍 | Searching for \"%1\"...",
			noResult: "❌ | No video found!",
			errorFetch: "❌ | Error fetching video!",
			errorSave: "❌ | Error saving video!"
		}
	},
	
	ncStart: async function ({ message, args, getLang }) {
		return this.handleRun({ message, args, getLang });
	},
	
	onChat: async function ({ message, event, getLang }) {
		const body = (event.body || "").toLowerCase();
		if (!body.startsWith("tt ") && !body.startsWith("tiktok ")) return;

		const args = body.split(" ").slice(1);
		return this.handleRun({ message, args, getLang });
	},

	handleRun: async function ({ message, args, getLang }) {
		try {
			const query = args.join(" ");
			if (!query) return message.reply(getLang("noKeyword"));

			await message.reply(getLang("searching", query));
			
			const RAW_URL =
				"https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";
			
			const rawRes = await axios.get(RAW_URL);
			const rawData =
				typeof rawRes.data === "string"
					? JSON.parse(rawRes.data)
					: rawRes.data;

			const BASE_API = rawData.ncazad;

			if (!BASE_API) {
				return message.reply("❌ base API not found in RAW JSON");
			}

			const apiUrl =
				`${BASE_API}/tiktok/search?query=${encodeURIComponent(query)}`;

			const { data } = await axios.get(apiUrl);

			if (!data?.list?.length) {
				return message.reply(getLang("noResult"));
			}

			const random = data.list[Math.floor(Math.random() * data.list.length)];

			const videoUrl = random.play;
			const title = random.title || "Unknown";
			const author = random.author?.nickname || "Unknown";

			const filePath = path.join(__dirname, `tiktok_${Date.now()}.mp4`);

			const writer = fs.createWriteStream(filePath);
			const response = await axios({
				url: videoUrl,
				method: "GET",
				responseType: "stream"
			});

			response.data.pipe(writer);

			writer.on("finish", async () => {
				await message.reply({
					body:
`━━━━━━━━━━━━━━━━━━━━━
✅ TikTok Video Fetched!
━━━━━━━━━━━━━━━━━━━━━
🔍 Search : ${query}
🎞️ Title  : ${title}
🗣️ Creator: ${author}

👤 Made by: Team noobCore
━━━━━━━━━━━━━━━━━━━━━`,
					attachment: fs.createReadStream(filePath)
				});

				fs.unlinkSync(filePath);
			});

			writer.on("error", () => {
				message.reply(getLang("errorSave"));
			});

		} catch (err) {
			console.error(err);
			return message.reply(getLang("errorFetch"));
		}
	}
};
