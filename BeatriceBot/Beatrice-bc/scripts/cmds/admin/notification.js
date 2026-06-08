const { getStreamsFromAttachment } = global.utils;

module.exports = {
	config: {
		name: "notification",
		aliases: ["notify", "noti"],
		version: "3.0",
		author: "𝑵𝑪-𝒀𝑬𝑨𝑺𝑰𝑵 | NC-XNIL (fixed)",
		countDown: 5,
		role: 3,
		category: "owner",
		envConfig: {
			delayPerGroup: 250,
			maxRetries: 2,
			batchSize: 10
		}
	},

	langs: {
		en: {
			missingMessage: "⚠️ Please enter the message you want to send to all groups",
			notification: "📢 NOTIFICATION FROM ADMIN\n────────────────\n",
			sendingNotification: "🔄 Sending notification to %1 groups...",
			sentNotification: "✅ Done:\n• Success: %1\n• Failed: %2\n• Time: %3s"
		}
	},

	// ================= MAIN =================
	ncStart: async function ({
		message, api, event, args,
		commandName, envCommands, threadsData, getLang
	}) {
		const { delayPerGroup, maxRetries, batchSize } = envCommands[commandName];
		const startTime = Date.now();

		const { message: cleanMessage, options } = this.parseArgs(args);

		if (!cleanMessage)
			return message.reply(getLang("missingMessage"));

		const prepared = await this.prepareMessage({
			event,
			message: cleanMessage,
			options,
			getLang
		});

		const allThreads = await this.getActiveThreads(threadsData, api);

		if (!allThreads.length)
			return message.reply("❌ No active groups found.");

		await message.reply(getLang("sendingNotification", allThreads.length));

		const results = await this.sendBulkNotifications({
			api,
			threads: allThreads,
			message: prepared,
			options,
			delayPerGroup,
			maxRetries,
			batchSize
		});

		const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
		await message.reply(
			getLang(
				"sentNotification",
				results.success.length,
				results.failed.length,
				totalTime
			)
		);
	},

	// ================= ARG PARSER =================
	parseArgs(args) {
		const options = {};
		const messageParts = [];

		for (const arg of args) {
			if (arg.startsWith("-")) {
				if (arg === "-a" || arg === "--all") options.tagAll = true;
				else if (arg === "-p" || arg === "--pin") options.pin = true;
				else messageParts.push(arg);
			} else messageParts.push(arg);
		}

		return {
			message: messageParts.join(" "),
			options
		};
	},

	// ================= PREPARE MESSAGE =================
	async prepareMessage({ event, message, options, getLang }) {
		let body = getLang("notification") + message;

		// ✅ collect attachments safely
		const attachments = [
			...(event.attachments || []),
			...(event.messageReply?.attachments || [])
		].filter(item =>
			["photo", "png", "animated_image", "video", "audio"].includes(item.type)
		);

		return {
			body,
			rawAttachments: attachments, // ⚠️ store only, no stream yet
			options
		};
	},

	// ================= THREADS =================
	async getActiveThreads(threadsData, api) {
		const allThreads = await threadsData.getAll();
		const botID = api.getCurrentUserID();

		return allThreads.filter(
			t => t.isGroup && t.members?.some(m => m.userID === botID && m.inGroup)
		);
	},

	// ================= BULK SEND =================
	async sendBulkNotifications({
		api, threads, message, options,
		delayPerGroup, maxRetries, batchSize
	}) {
		const results = { success: [], failed: [] };

		for (let i = 0; i < threads.length; i += batchSize) {
			const batch = threads.slice(i, i + batchSize);

			for (const thread of batch) {
				try {
					const membersData =
						thread.members ||
						(await api.getThreadInfo(thread.threadID)).userInfo;

					const res = await this.sendWithRetry({
						api,
						threadID: thread.threadID,
						message,
						options,
						membersData,
						maxRetries
					});

					if (res.success) results.success.push(thread.threadID);
					else results.failed.push(thread.threadID);

					await this.delay(delayPerGroup);
				} catch {
					results.failed.push(thread.threadID);
				}
			}

			if (i + batchSize < threads.length)
				await this.delay(1000);
		}

		return results;
	},

	// ================= SEND WITH RETRY =================
	async sendWithRetry({
		api, threadID, message, options, membersData, maxRetries
	}) {
		let lastError;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const formSend = { body: message.body };

				// ✅ VERY IMPORTANT — fresh stream each send
				if (message.rawAttachments?.length) {
					formSend.attachment = await getStreamsFromAttachment(
						message.rawAttachments
					);
				}

				// tag all
				if (options.tagAll && membersData) {
					const botID = api.getCurrentUserID();
					formSend.mentions = [];

					let offset = formSend.body.length;

					const ids = membersData
						.filter(m => m.userID !== botID && m.inGroup)
						.map(m => m.userID);

					for (const id of ids) {
						const tag = `@${id}`;
						formSend.body += tag;
						formSend.mentions.push({
							tag,
							id,
							fromIndex: offset
						});
						offset += tag.length;
					}
				}

				const info = await api.sendMessage(formSend, threadID);

				if (options.pin && info?.messageID) {
					try {
						await api.pinMessage(info.messageID, threadID);
					} catch {}
				}

				return { success: true };
			} catch (err) {
				lastError = err;
				if (attempt < maxRetries)
					await this.delay(1000 * (attempt + 1));
			}
		}

		return { success: false, error: lastError?.message };
	},

	// ================= UTILS =================
	delay(ms) {
		return new Promise(r => setTimeout(r, ms));
	}
};