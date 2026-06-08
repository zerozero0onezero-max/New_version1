const { findUid } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
	config: {
		name: "adduser",
		version: "2.0",
		author: "NoobCore Team", // author NC-FAHAD
       team: " NoobCore",
		countDown: 5,
		role: 1,
		description: {
			vi: "✨ Thêm thành viên vào box chat của bạn ✨",
			en: "✨ Add user to your chat box ✨"
		},
		category: "box chat",
		guide: {
			vi: "┏━━━━━━━━━━━━━━━━━━━━┓\n┃   ➤ {pn} [link profile]\n┃   ➤ {pn} [uid]\n┃   ➤ {pn} [@tag]\n┃   ➤ {pn} [link1] [uid2] [@tag3]\n┗━━━━━━━━━━━━━━━━━━━━┛",
			en: "┏━━━━━━━━━━━━━━━━━━━━┓\n┃   ➤ {pn} [profile link]\n┃   ➤ {pn} [uid]\n┃   ➤ {pn} [@tag]\n┃   ➤ {pn} [link1] [uid2] [@tag3]\n┗━━━━━━━━━━━━━━━━━━━━┛"
		}
	},

	langs: {
		vi: {
			alreadyInGroup: "👥 Đã có trong nhóm",
			successAdd: "✅ Đã thêm thành công %1 thành viên vào nhóm",
			failedAdd: "❌ Không thể thêm %1 thành viên",
			approve: "⏳ Đã thêm %1 thành viên vào danh sách chờ phê duyệt",
			invalidLink: "⚠️ Liên kết Facebook không hợp lệ",
			cannotGetUid: "⚠️ Không thể lấy UID của người dùng này",
			linkNotExist: "⚠️ Liên kết hồ sơ không tồn tại",
			cannotAddUser: "🚫 Không thể thêm người dùng (bị chặn hoặc cài đặt bảo mật)",
			noUserSpecified: "📝 Vui lòng cung cấp link profile, UID hoặc tag người dùng",
			processing: "⏳ Đang xử lý thêm người dùng...",
			added: "👤 Đã thêm: %1",
			waitingApproval: "⏱️ Chờ phê duyệt: %1",
			failedList: "❌ Thất bại: %1",
			taggedUserAdded: "✅ Đã thêm người dùng được tag",
			title: "━━━━━━━━━━━━━━━━━━━━\n     🎯 KẾT QUẢ THÊM THÀNH VIÊN\n━━━━━━━━━━━━━━━━━━━━",
			separator: "━" + "━".repeat(35) + "━"
		},
		en: {
			alreadyInGroup: "👥 Already in group",
			successAdd: "✅ Successfully added %1 members",
			failedAdd: "❌ Failed to add %1 members",
			approve: "⏳ Added %1 members to approval list",
			invalidLink: "⚠️ Invalid Facebook link",
			cannotGetUid: "⚠️ Cannot get UID of this user",
			linkNotExist: "⚠️ Profile link does not exist",
			cannotAddUser: "🚫 Cannot add user (blocked or privacy settings)",
			noUserSpecified: "📝 Please provide profile link, UID or tag user",
			processing: "⏳ Processing user addition...",
			added: "👤 Added: %1",
			waitingApproval: "⏱️ Waiting approval: %1",
			failedList: "❌ Failed: %1",
			taggedUserAdded: "✅ Added tagged user",
			title: "━━━━━━━━━━━━━━━━━━━━\n     🎯 ADD USER RESULTS\n━━━━━━━━━━━━━━━━━━━━",
			separator: "━" + "━".repeat(35) + "━"
		}
	},

	ncStart: async function ({ message, api, event, args, threadsData, getLang }) {
		const { members, adminIDs, approvalMode } = await threadsData.get(event.threadID);
		const botID = api.getCurrentUserID();
		
		if (!args[0]) {
			const guideText = getLang("guide").replace(/\{pn\}/g, this.config.name);
			return message.reply(`📌 𝐇𝐎𝐖 𝐓𝐎 𝐔𝐒𝐄:\n${guideText}\n\n${getLang("noUserSpecified")}`);
		}

		// Send processing message
		const processingMsg = await message.reply(getLang("processing"));

		const success = {
			added: [],
			waitingApproval: []
		};
		
		const failed = [];
		
		// Handle tagged users
		if (event.mentions && Object.keys(event.mentions).length > 0) {
			for (const uid of Object.keys(event.mentions)) {
				if (uid === api.getCurrentUserID()) continue;
				
				if (members.some(m => m.userID == uid && m.inGroup)) {
					failed.push({ uid, reason: getLang("alreadyInGroup") });
					continue;
				}
				
				try {
					await api.addUserToGroup(uid, event.threadID);
					if (approvalMode === true && !adminIDs.includes(botID)) {
						success.waitingApproval.push(uid);
					} else {
						success.added.push(uid);
					}
				} catch (err) {
					failed.push({ uid, reason: getLang("cannotAddUser") });
				}
			}
		}

		// Handle links and UIDs from args
		const regExMatchFB = /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-\.]+)(?:\/)?/i;
		
		for (const item of args) {
			// Skip if it's a mention (already handled) or empty
			if (item.startsWith('@') || !item.trim()) continue;
			
			let uid;
			let isProcessed = false;

			// Check if it's a numeric UID
			if (!isNaN(item)) {
				uid = item;
			} else if (regExMatchFB.test(item)) {
				// It's a Facebook link
				for (let i = 0; i < 3; i++) {
					try {
						uid = await findUid(item);
						if (uid) break;
					} catch (err) {
						if (i === 2) {
							failed.push({ item, reason: getLang("cannotGetUid") });
							isProcessed = true;
						}
						await sleep(300);
					}
				}
			} else {
				// Invalid input
				failed.push({ item, reason: getLang("invalidLink") });
				continue;
			}
			
			if (isProcessed) continue;
			
			// Check if user is already in group
			if (members.some(m => m.userID == uid && m.inGroup)) {
				failed.push({ uid, reason: getLang("alreadyInGroup") });
				continue;
			}
			
			// Try to add user
			try {
				await api.addUserToGroup(uid, event.threadID);
				if (approvalMode === true && !adminIDs.includes(botID)) {
					success.waitingApproval.push(uid);
				} else {
					success.added.push(uid);
				}
			} catch (err) {
				failed.push({ uid, reason: getLang("cannotAddUser") });
			}
		}

		// Delete processing message
		try {
			await api.unsendMessage(processingMsg.messageID);
		} catch (e) {}

		// Prepare result message with better formatting
		let resultMessage = `\n${getLang("title")}\n\n`;
		
		// Add success counts
		if (success.added.length > 0) {
			resultMessage += `✨ ${getLang("successAdd", success.added.length)}\n`;
			resultMessage += `   ${getLang("added", success.added.join(', '))}\n\n`;
		}
		
		if (success.waitingApproval.length > 0) {
			resultMessage += `⏳ ${getLang("approve", success.waitingApproval.length)}\n`;
			resultMessage += `   ${getLang("waitingApproval", success.waitingApproval.join(', '))}\n\n`;
		}
		
		if (failed.length > 0) {
			resultMessage += `⚠️ ${getLang("failedAdd", failed.length)}\n`;
			failed.forEach(fail => {
				const identifier = fail.uid || fail.item;
				resultMessage += `   • ${identifier}: ${fail.reason}\n`;
			});
		}
		
		// Add separator
		resultMessage += `\n${getLang("separator")}`;
		
		// If no results (shouldn't happen but just in case)
		if (resultMessage.trim() === getLang("title")) {
			resultMessage = `📭 ${getLang("noUserSpecified")}`;
		}
		
		await message.reply(resultMessage);
	}
};