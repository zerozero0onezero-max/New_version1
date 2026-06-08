const { getTime } = global.utils;

module.exports = {
	config: {
		name: "user",
		version: "2.0",
		author: "NoobCore Team",
		countDown: 5,
		role: 3,
		description: {
			vi: "Quản lý người dùng",
			en: "User management"
		},
		guide: {
			vi: "{pn} find <tên>\n{pn} ban <@tag/uid> <lý do> [1min/1h/1day]\n{pn} unban <@tag/uid>\n{pn} list",
			en: "{pn} find <name>\n{pn} ban <@tag/uid> <reason> [1min/1h/1day]\n{pn} unban <@tag/uid>\n{pn} list"
		}
	},

	langs: {
		vi: {
			noUserFound: "❌ Không tìm thấy: \"%1\"",
			userFound: "🔎 Tìm thấy %1:\n%2",
			uidRequired: "❌ Cần uid hoặc tag",
			reasonRequired: "❌ Cần lý do",
			userHasBanned: "⚠️ [%1] đã bị cấm\n» Lý do: %2",
			userBanned: "✅ Đã cấm [%1]\n» Lý do: %2\n» Thời gian: %3",
			userTempBanned: "✅ Đã cấm tạm thời [%1]\n» Lý do: %2\n» Thời gian: %3\n» Thời hạn: %4",
			userNotBanned: "ℹ️ [%1] không bị cấm",
			userUnbanned: "✅ Đã bỏ cấm [%1]",
			invalidTime: "❌ Thời gian: 5min, 30min, 1h, 2h, 1day, 7day",
			noBanned: "📭 Không có ai bị cấm",
			listBanned: "📋 Bị cấm (%1):\n%2",
			bannedMsg: "🚫 Bạn bị cấm\n» Lý do: %1\n» Thời hạn: %2",
			autoUnbanned: "🔄 Tự động bỏ cấm sau %1"
		},
		en: {
			noUserFound: "❌ No user: \"%1\"",
			userFound: "🔎 Found %1:\n%2",
			uidRequired: "❌ Need uid or tag",
			reasonRequired: "❌ Need reason",
			userHasBanned: "⚠️ [%1] already banned\n» Reason: %2",
			userBanned: "✅ Banned [%1]\n» Reason: %2\n» Time: %3",
			userTempBanned: "✅ Temp banned [%1]\n» Reason: %2\n» Time: %3\n» Duration: %4",
			userNotBanned: "ℹ️ [%1] not banned",
			userUnbanned: "✅ Unbanned [%1]",
			invalidTime: "❌ Time: 5min, 30min, 1h, 2h, 1day, 7day",
			noBanned: "📭 No banned users",
			listBanned: "📋 Banned (%1):\n%2",
			bannedMsg: "🚫 You are banned\n» Reason: %1\n» Duration: %2",
			autoUnbanned: "🔄 Auto-unbanned after %1"
		}
	},

	// Handle commands
	ncStart: async function ({ args, usersData, message, event, getLang }) {
		const cmd = args[0]?.toLowerCase();

		// Language helper
		const L = (key, ...params) => {
			let text = getLang(key);
			params.forEach((p, i) => text = text.replace(`%${i + 1}`, p || ''));
			return text;
		};

		switch (cmd) {
			case "find":
			case "-f": {
				const name = args.slice(1).join(" ");
				if (!name) return message.SyntaxError();

				const all = await usersData.getAll();
				const found = all.filter(u => u.name?.toLowerCase().includes(name.toLowerCase()));

				if (found.length === 0) {
					return message.reply(L("noUserFound", name));
				}

				const list = found.slice(0, 10).map(u => `• ${u.name} (${u.userID})`).join("\n");
				message.reply(L("userFound", found.length, list));
				break;
			}

			case "ban":
			case "-b": {
				// Get UID
				let uid;
				if (event.type === "message_reply") {
					uid = event.messageReply.senderID;
				} else if (event.mentions && Object.keys(event.mentions).length > 0) {
					uid = Object.keys(event.mentions)[0];
				} else if (args[1]) {
					uid = args[1];
				} else {
					return message.reply(L("uidRequired"));
				}

				// Get reason and time
				let reason = "";
				let timeInput = "";

				// Simple parsing
				const text = args.slice(1).join(" ");
				
				// Find time pattern at the end
				const timeMatch = text.match(/(\d+(?:min|h|day))$/i);
				if (timeMatch) {
					timeInput = timeMatch[1].toLowerCase();
					reason = text.replace(timeMatch[0], "").trim();
				} else {
					reason = text;
				}

				// Clean reason from mentions/uid
				if (event.mentions?.[uid]) {
					reason = reason.replace(event.mentions[uid], "").trim();
				}
				if (args[1] && !isNaN(args[1])) {
					reason = reason.replace(args[1], "").trim();
				}

				if (!reason) reason = "No reason";

				// Parse time
				let duration = 0;
				let durationText = "Permanent";

				if (timeInput) {
					const match = timeInput.match(/^(\d+)(min|h|day)$/);
					if (!match) return message.reply(L("invalidTime"));

					const num = parseInt(match[1]);
					const unit = match[2];

					if (unit === "min") {
						duration = num * 60 * 1000;
						durationText = `${num} minute(s)`;
					} else if (unit === "h") {
						duration = num * 60 * 60 * 1000;
						durationText = `${num} hour(s)`;
					} else if (unit === "day") {
						duration = num * 24 * 60 * 60 * 1000;
						durationText = `${num} day(s)`;
					}
				}

				try {
					const user = await usersData.get(uid);
					const name = user?.name || "Unknown";

					// Check if already banned
					if (user?.banned?.status) {
						return message.reply(L("userHasBanned", name, user.banned.reason || "No reason"));
					}

					// Create ban data
					const now = Date.now();
					const time = getTime("DD/MM/YYYY HH:mm:ss");
					const banData = {
						status: true,
						reason: reason,
						date: time,
						bannedAt: now,
						duration: duration,
						durationText: durationText,
						willUnbanAt: duration > 0 ? now + duration : 0
					};

					// Save ban
					await usersData.set(uid, { banned: banData });

					// Send response
					if (duration > 0) {
						message.reply(L("userTempBanned", name, reason, time, durationText));
					} else {
						message.reply(L("userBanned", name, reason, time));
					}

				} catch (error) {
					console.error("Ban error:", error);
					message.reply("Error");
				}
				break;
			}

			case "unban":
			case "-u": {
				let uid;
				if (event.type === "message_reply") {
					uid = event.messageReply.senderID;
				} else if (event.mentions && Object.keys(event.mentions).length > 0) {
					uid = Object.keys(event.mentions)[0];
				} else if (args[1]) {
					uid = args[1];
				} else {
					return message.reply(L("uidRequired"));
				}

				try {
					const user = await usersData.get(uid);
					const name = user?.name || "Unknown";

					if (!user?.banned?.status) {
						return message.reply(L("userNotBanned", name));
					}

					await usersData.set(uid, { banned: {} });
					message.reply(L("userUnbanned", name));

				} catch (error) {
					console.error("Unban error:", error);
					message.reply("Error");
				}
				break;
			}

			case "list":
			case "listbanned": {
				try {
					const all = await usersData.getAll();
					const now = Date.now();
					let unbannedCount = 0;

					// Check and auto-unban expired
					for (const user of all) {
						const ban = user.banned;
						if (ban?.status && ban.willUnbanAt && ban.willUnbanAt > 0) {
							if (now >= ban.willUnbanAt) {
								await usersData.set(user.userID, { banned: {} });
								unbannedCount++;
							}
						}
					}

					// Get current banned
					const current = await usersData.getAll();
					const banned = current.filter(u => u.banned?.status);

					if (banned.length === 0) {
						return message.reply(L("noBanned"));
					}

					const list = banned.map((user, i) => {
						const ban = user.banned;
						const name = user.name || "Unknown";
						let status = "";

						if (ban.willUnbanAt && ban.willUnbanAt > 0) {
							const left = ban.willUnbanAt - now;
							if (left > 0) {
								const min = Math.floor(left / 60000);
								const sec = Math.floor((left % 60000) / 1000);
								status = ` (${min}:${sec.toString().padStart(2, '0')})`;
							} else {
								status = " (Expired)";
							}
						}

						return `${i + 1}. ${name} (${user.userID})\n» ${ban.reason || "No reason"}\n» ${ban.durationText || "Forever"}${status}`;
					}).join("\n\n");

					let reply = L("listBanned", banned.length, list);
					if (unbannedCount > 0) {
						reply += `\n\n🔄 Auto-unbanned: ${unbannedCount}`;
					}

					message.reply(reply);

				} catch (error) {
					console.error("List error:", error);
					message.reply("Error");
				}
				break;
			}

			default:
				return message.SyntaxError();
		}
	},

	// MAIN BAN CHECKER - This runs on EVERY message
	ncPrefix: async function ({ usersData, event, message }) {
		try {
			const uid = event.senderID;
			const user = await usersData.get(uid);
			
			if (!user?.banned?.status) return;

			const ban = user.banned;
			const now = Date.now();

			// Check if temporary ban expired
			if (ban.willUnbanAt && ban.willUnbanAt > 0) {
				if (now >= ban.willUnbanAt) {
					// AUTO UNBAN NOW!
					await usersData.set(uid, { banned: {} });
					
					// Calculate actual duration
					const duration = now - ban.bannedAt;
					const minutes = Math.floor(duration / 60000);
					const seconds = Math.floor((duration % 60000) / 1000);
					const timeStr = `${minutes}m ${seconds}s`;
					
					// Send auto-unban notification
					try {
						await message.reply(getLang("autoUnbanned", timeStr), uid);
					} catch (e) {
						// Ignore if can't send
					}
					
					return; // Allow the message
				}
			}

			// Still banned, show message
			const msg = getLang("bannedMsg", 
				ban.reason || "No reason",
				ban.durationText || "Permanent"
			);
			
			await message.reply(msg);
			
			// Stop command processing
			throw new Error("USER_BANNED");

		} catch (error) {
			if (error.message !== "USER_BANNED") {
				// Ignore
			}
		}
	},

	// Extra safety check - runs every 30 seconds in background
	onEvent: async function ({ usersData }) {
		try {
			const all = await usersData.getAll();
			const now = Date.now();
			let count = 0;

			for (const user of all) {
				const ban = user.banned;
				if (ban?.status && ban.willUnbanAt && ban.willUnbanAt > 0) {
					if (now >= ban.willUnbanAt) {
						await usersData.set(user.userID, { banned: {} });
						count++;
					}
				}
			}

			if (count > 0) {
				console.log(`[AUTO-UNBAN] Cleared ${count} expired bans`);
			}

		} catch (error) {
			// Silent
		}
	},

	// Extra: Check on every hour
	onLoad: async function ({ usersData }) {
		// Initial check when bot starts
		try {
			const all = await usersData.getAll();
			const now = Date.now();
			let count = 0;

			for (const user of all) {
				const ban = user.banned;
				if (ban?.status && ban.willUnbanAt && ban.willUnbanAt > 0) {
					if (now >= ban.willUnbanAt) {
						await usersData.set(user.userID, { banned: {} });
						count++;
					}
				}
			}

			if (count > 0) {
				console.log(`[STARTUP] Auto-unbanned ${count} users`);
			}

		} catch (error) {
			// Silent
		}
	}
};