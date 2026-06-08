const axios = require("axios");

module.exports = {
	config: {
		name: "setavt",
		aliases: ["changeavt", "setavatar"],
		version: "1.5",
		author: "NTKhang (fixed by NC-XNIL)",
		countDown: 5,
		role: 2,
		description: {
			vi: "Đổi avatar bot",
			en: "Change bot avatar"
		},
		category: "owner",
		guide: {
			en:
				"{pn} <image url | reply image> [caption] [expirationAfter(seconds)]\n" +
				"Example:\n" +
				"{pn} https://example.com/image.jpg\n" +
				"{pn} https://example.com/image.jpg Hello\n" +
				"{pn} https://example.com/image.jpg Hello 3600"
		}
	},

	langs: {
		en: {
			cannotGetImage: "❌ | An error occurred while querying the image url",
			invalidImageFormat: "❌ | Invalid image format",
			changedAvatar: "✅ | Changed bot avatar successfully"
		}
	},

	ncStart: async function ({ message, event, api, args, getLang }) {
		try {
			const imageURL =
				args[0] ||
				event?.attachments?.[0]?.url ||
				event?.messageReply?.attachments?.[0]?.url;

			if (!imageURL)
				return message.SyntaxError();

			let expirationAfter = null;
			if (!isNaN(args[args.length - 1])) {
				expirationAfter = Number(args.pop());
			}

			const caption = args.slice(1).join(" ");

			let response;
			try {
				response = await axios.get(imageURL, {
					responseType: "stream",
					timeout: 20000
				});
			} catch (err) {
				console.error("SETAVT DOWNLOAD ERROR:", err.message);
				return message.reply(getLang("cannotGetImage"));
			}

			const contentType = response.headers["content-type"] || "";
			if (!contentType.includes("image"))
				return message.reply(getLang("invalidImageFormat"));

			response.data.path = "avatar.jpg";

			api.changeAvatar(
				response.data,
				caption,
				expirationAfter ? expirationAfter * 1000 : null,
				(err) => {
					if (err) return message.err(err);
					return message.reply(getLang("changedAvatar"));
				}
			);
		} catch (err) {
			console.error("SETAVT ERROR:", err);
			return message.err(err);
		}
	}
};