const { createCanvas, loadImage, registerFont } = require('canvas');
const { resolve, join } = require('path');
const { createWriteStream, existsSync, createReadStream } = require('fs');
const axios = require('axios');
const moment = require('moment-timezone');

module.exports = {
    config: {
        name: "count",
        version: "3.0",
        author: "NoobCore Team",
        team: "NoobCore",
        countDown: 5,
        role: 0,
        description: {
            vi: "Xem bảng xếp hạng tin nhắn với thiết kế hiện đại.",
            en: "View message count leaderboard with modern design."
        },
        category: "box chat",
        guide: {
            en: "   {pn}: View personal activity card"
                + "\n   {pn} @tag: View tagged user's activity card"
                + "\n   {pn} all: View leaderboard"
        },
        envConfig: {
            "ACCESS_TOKEN": "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"
        }
    },

    langs: {
        en: {
            loading: "🔄 Loading data...",
            invalidPage: "Invalid page number.",
            leaderboardTitle: "LEADERBOARD",
            userCardTitle: "ACTIVITY CARD",
            page: "Page %1/%2",
            reply: "Reply with page number to see more",
            totalMessages: "TOTAL MESSAGES",
            serverRank: "RANK",
            dailyActivity: "LAST 7 DAYS",
            messageBreakdown: "MESSAGE BREAKDOWN",
            busiestDay: "BUSIEST DAY",
            text: "Text",
            sticker: "Sticker",
            media: "Media",
            fallbackName: "Member",
            stats: "STATISTICS",
            weeklyChart: "WEEKLY CHART",
            topPerformers: "TOP PERFORMERS",
            otherMembers: "OTHER MEMBERS",
            messageStats: "MESSAGE STATS",
            activeStreak: "ACTIVE STREAK",
            generatedAt: "Generated at"
        }
    },

    onLoad: async function () {
        try {
            const fontPaths = [
                join(__dirname, "assets", "fonts", "BeVietnamPro-Bold.ttf"),
                join(__dirname, "assets", "count", "font.ttf"),
                join(__dirname, "..", "..", "assets", "fonts", "BeVietnamPro-Bold.ttf")
            ];
            for (const fontPath of fontPaths) {
                if (existsSync(fontPath)) {
                    registerFont(fontPath, { family: "BeVietnamPro", weight: "bold" });
                    break;
                }
            }
        } catch (e) { }
    },

    ncPrefix: async function ({ usersData, threadsData, event }) {
        try {
        
            if (!event.senderID || !event.threadID) return;

            const { senderID, threadID, attachments } = event;
            const timezone = "Asia/Dhaka";
            const today = moment().tz(timezone).format("YYYY-MM-DD");
            const yesterday = moment().tz(timezone).subtract(1, "days").format("YYYY-MM-DD");
            const uid = String(senderID);

            let members = await threadsData.get(threadID, "members") || [];
            let member = members.find(m => String(m.userID) === uid);

            
            if (!member) {
                let name = "Member";
                try { name = await usersData.getName(uid); } catch (e) {}

                member = {
                    userID: uid,
                    name: name,
                    count: 0,
            
                    daily: {},
                    types: { text: 0, sticker: 0, media: 0 },
                    streak: 0,
                    lastActive: null
                };
                members.push(member);
            }

           
            member.count = (Number(member.count) || 0) + 1;
            if (!member.daily || typeof member.daily !== 'object') member.daily = {};
            if (!member.types || typeof member.types !== 'object') member.types = { text: 0, sticker: 0, media: 0 };

            const currentDaily = Number(member.daily[today]) || 0;
            member.daily[today] = currentDaily + 1;

            const hasAttachments = attachments && attachments.length > 0;
            if (hasAttachments) {
                const isSticker = attachments.some(a => a.type === "sticker");
                if (isSticker) {
                    member.types.sticker = (Number(member.types.sticker) || 0) + 1;
                } else {
                    member.types.media = (Number(member.types.media) || 0) + 1;
                }
            } else {
                member.types.text = (Number(member.types.text) || 0) + 1;
            }

            if (!member.lastActive) {
                member.streak = 1;
            } else if (member.lastActive !== today) {
                if (member.lastActive === yesterday) {
                    member.streak = (Number(member.streak) || 0) + 1;
                } else {
                    member.streak = 1;
                }
            }
            member.lastActive = today;

            const sortedKeys = Object.keys(member.daily).sort((a,b) => a.localeCompare(b));
            if (sortedKeys.length > 7) {
                const newDaily = {};
                sortedKeys.slice(-7).forEach(k => newDaily[k] = member.daily[k]);
                member.daily = newDaily;
            }

            await threadsData.set(threadID, members, "members");

        } catch (e) {
            console.error("count ncPrefix error:", e);
        }
    },

    ncStart: async function ({ args, threadsData, message, event, api, getLang }) {
        try {
            const { threadID, senderID, mentions } = event;
            const ACCESS_TOKEN = this.config.envConfig.ACCESS_TOKEN;

            await message.reply(getLang("loading"));

            const threadData = await threadsData.get(threadID);
            const members = threadData?.members || [];

            let usersInGroup = [];
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                usersInGroup = threadInfo.participantIDs;
            } catch (error) {
                usersInGroup = members.map(m => m.userID);
            }

            let combinedData = [];

            for (const member of members) {

                combinedData.push({
                    uid: String(member.userID),
                    name: member.name || getLang("fallbackName"),
                    count: Number(member.count) || 0,
                    activity: {
                        daily: member.daily || {},
                        types: member.types || { text: 0, sticker: 0, media: 0 },
                        streak: Number(member.streak) || 0,
                        lastActive: member.lastActive
                    }
                });
            }

            // Sort by message count
            combinedData.sort((a, b) => b.count - a.count);
            combinedData.forEach((user, index) => { user.rank = index + 1; });


            const getAvatar = async (uid, name) => {
                try {
                    const url = `https://graph.facebook.com/${uid}/picture?width=400&height=400&access_token=${ACCESS_TOKEN}`;
                    const response = await axios.get(url, { responseType: 'arraybuffer' });
                    return await loadImage(Buffer.from(response.data));
                } catch (error) {
                    const canvas = createCanvas(400, 400);
                    const ctx = canvas.getContext('2d');
                    const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
                    ctx.fillStyle = colors[parseInt(uid) % colors.length];
                    ctx.fillRect(0, 0, 400, 400);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 150px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((name || "U").charAt(0).toUpperCase(), 200, 200);
                    return await loadImage(canvas.toBuffer());
                }
            };

            const drawRoundedRect = (ctx, x, y, w, h, r) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
            };

            const createGradient = (ctx, x1, y1, x2, y2, colors) => {
                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
                return gradient;
            };

            const drawGlowingText = (ctx, text, x, y, color, size, glow = 10) => {
                ctx.shadowColor = color;
                ctx.shadowBlur = glow;
                ctx.fillStyle = color;
                ctx.font = `bold ${size}px "BeVietnamPro", "Arial", sans-serif`;
                ctx.fillText(text, x, y);
                ctx.shadowBlur = 0;
            };

            const fitText = (ctx, text, maxWidth, fontSize) => {
                ctx.font = `${fontSize}px "BeVietnamPro", "Arial", sans-serif`;
                let currentText = text;
                if (ctx.measureText(currentText).width > maxWidth) {
                    while (ctx.measureText(currentText + '...').width > maxWidth && currentText.length > 1) {
                        currentText = currentText.slice(0, -1);
                    }
                    return currentText + '...';
                }
                return currentText;
            };

            const drawCircularAvatar = (ctx, avatar, x, y, radius) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
                ctx.restore();
            };

            // ... LEADERBOARD & CARD LOGIC ...
            if (args[0] && args[0].toLowerCase() === 'all') {
                // === LEADERBOARD RENDERER ===
                const theme = {
                    primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899',
                    bg: ['#0F172A', '#1E293B'], cardBg: 'rgba(30, 41, 59, 0.7)',
                    text: '#F1F5F9', muted: '#94A3B8'
                };

                const usersPerPage = 10;
                const totalPages = Math.ceil(combinedData.length / usersPerPage) || 1;
                let page = parseInt(args[1]) || 1;
                if (page < 1 || page > totalPages) page = 1;
                const startIndex = (page - 1) * usersPerPage;
                const pageUsers = combinedData.slice(startIndex, startIndex + usersPerPage);

                const canvas = createCanvas(1200, 1600);
                const ctx = canvas.getContext('2d');

                // BG
                ctx.fillStyle = createGradient(ctx, 0, 0, 1200, 1600, theme.bg);
                ctx.fillRect(0, 0, 1200, 1600);

                // Header
                ctx.fillStyle = theme.cardBg;
                drawRoundedRect(ctx, 40, 40, 1120, 120, 20);
                ctx.fill();
                ctx.textAlign = 'center';
                drawGlowingText(ctx, getLang("leaderboardTitle"), 600, 120, theme.primary, 65, 15);

                // Top 3
                ctx.textAlign = 'left';
                ctx.fillStyle = theme.muted;
                ctx.font = 'bold 30px "BeVietnamPro", "Arial", sans-serif';
                ctx.fillText(getLang("topPerformers").toUpperCase(), 60, 230);

                const topUsers = combinedData.slice(0, 3);
                const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

                for (let i = 0; i < 3; i++) {
                    const user = topUsers[i];
                    if (!user) continue;
                    const cardX = 60 + i * 380;
                    const cardY = 260;

                    ctx.fillStyle = theme.cardBg;
                    drawRoundedRect(ctx, cardX, cardY, 340, 200, 20);
                    ctx.fill();
                    ctx.fillStyle = medalColors[i];
                    drawRoundedRect(ctx, cardX + 20, cardY + 20, 60, 30, 15);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 20px "BeVietnamPro"';
                    ctx.textAlign = 'center';
                    ctx.fillText(`#${user.rank}`, cardX + 50, cardY + 42);

                    const avatar = await getAvatar(user.uid, user.name);
                    drawCircularAvatar(ctx, avatar, cardX + 170, cardY + 90, 50);

                    ctx.fillStyle = theme.text;
                    ctx.font = 'bold 24px "BeVietnamPro"';
                    ctx.textAlign = 'center';
                    ctx.fillText(fitText(ctx, user.name, 300, 24), cardX + 170, cardY + 170);
                    ctx.fillStyle = theme.accent;
                    ctx.fillText(user.count, cardX + 170, cardY + 200);
                }

                // List
                ctx.textAlign = 'left';
                ctx.fillStyle = theme.muted;
                ctx.font = 'bold 28px "BeVietnamPro"';
                ctx.fillText(getLang("otherMembers").toUpperCase(), 60, 520);

                let currentY = 560;
                for (let i = 0; i < pageUsers.length; i++) {
                    const user = pageUsers[i];
                    const rowY = currentY + i * 85;

                    ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.3)';
                    drawRoundedRect(ctx, 60, rowY, 1080, 70, 15);
                    ctx.fill();

                    ctx.fillStyle = theme.muted;
                    ctx.font = 'bold 28px "BeVietnamPro"';
                    ctx.textAlign = 'center';
                    ctx.fillText(startIndex + i + 1, 120, rowY + 48);

                    const avatar = await getAvatar(user.uid, user.name);
                    drawCircularAvatar(ctx, avatar, 180, rowY + 35, 25);

                    ctx.textAlign = 'left';
                    ctx.fillStyle = theme.text;
                    ctx.font = 'bold 26px "BeVietnamPro"';
                    ctx.fillText(fitText(ctx, user.name, 400, 26), 220, rowY + 48);

                    ctx.textAlign = 'right';
                    ctx.fillStyle = theme.primary;
                    ctx.fillText(user.count, 1100, rowY + 48);

                    // Mini Bar
                    const maxCount = topUsers[0] ? topUsers[0].count : 1;
                    const progressWidth = (user.count / maxCount) * 400;
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                    drawRoundedRect(ctx, 680, rowY + 20, 400, 30, 15);
                    ctx.fill();
                    ctx.fillStyle = createGradient(ctx, 680, 0, 680 + progressWidth, 0, [theme.primary, theme.secondary]);
                    drawRoundedRect(ctx, 680, rowY + 20, progressWidth, 30, 15);
                    ctx.fill();
                }

                // Pagination
                ctx.fillStyle = theme.cardBg;
                drawRoundedRect(ctx, 400, 1450, 400, 80, 20);
                ctx.fill();
                ctx.textAlign = 'center';
                ctx.fillStyle = theme.text;
                ctx.font = 'bold 28px "BeVietnamPro"';
                ctx.fillText(getLang("page", page, totalPages), 600, 1490);
                ctx.fillStyle = theme.muted;
                ctx.font = 'normal 20px "BeVietnamPro"';
                ctx.fillText(getLang("reply"), 600, 1530);

                const path = resolve(__dirname, 'cache', `leaderboard_${threadID}_${page}.png`);
                const out = createWriteStream(path);
                const stream = canvas.createPNGStream();
                stream.pipe(out);
                await new Promise(r => out.on('finish', r));

                return message.reply({ attachment: createReadStream(path) }, (err, info) => {
                    if (err) return;
                    if (!global.BeatriceBC) global.BeatriceBC = {};
                    if (!global.BeatriceBC.ncReply) global.BeatriceBC.ncReply = new Map();
                    global.BeatriceBC.ncReply.set(info.messageID, { commandName: this.config.name, messageID: info.messageID, author: senderID, threadID, type: 'leaderboard', page });
                });

            } else {
                // === USER CARD RENDERER ===
                const targetUsers = Object.keys(mentions).length > 0 ? Object.keys(mentions) : [senderID];

                for(const uid of targetUsers) {
                    const user = combinedData.find(u => u.uid === String(uid));
                    if (!user) {
                        await message.reply(`❌ User data not initialized. Send a message first!`);
                        continue;
                    }

                    const theme = {
                        primary: '#3B82F6', secondary: '#8B5CF6', accent: '#10B981',
                        bg: ['#0F172A', '#1E293B'], cardBg: 'rgba(30, 41, 59, 0.9)',
                        text: '#F8FAFC', muted: '#94A3B8',
                        warning: '#F59E0B', danger: '#EF4444'
                    };

                    const canvas = createCanvas(900, 1300);
                    const ctx = canvas.getContext('2d');

                    // BG
                    ctx.fillStyle = createGradient(ctx, 0, 0, 900, 1300, theme.bg);
                    ctx.fillRect(0, 0, 900, 1300);

                    // Card
                    ctx.fillStyle = theme.cardBg;
                    drawRoundedRect(ctx, 30, 30, 840, 1240, 30);
                    ctx.fill();

                    // Header Gradient
                    ctx.fillStyle = createGradient(ctx, 30, 30, 870, 200, [theme.primary, theme.secondary]);
                    drawRoundedRect(ctx, 30, 30, 840, 200, 30);
                    ctx.fill();
                    ctx.textAlign = 'center';
                    drawGlowingText(ctx, getLang("userCardTitle"), 450, 120, '#FFFFFF', 50, 15);

                    // Avatar
                    const avatar = await getAvatar(user.uid, user.name);
                    ctx.strokeStyle = createGradient(ctx, 300, 220, 600, 380, [theme.primary, theme.accent]);
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.arc(450, 320, 85, 0, Math.PI * 2);
                    ctx.stroke();
                    drawCircularAvatar(ctx, avatar, 450, 320, 80);

                    // Name
                    ctx.fillStyle = theme.text;
                    ctx.font = 'bold 36px "BeVietnamPro"';
                    ctx.fillText(fitText(ctx, user.name, 600, 36), 450, 440);

                    // Stats Boxes
                    ctx.fillStyle = theme.muted;
                    ctx.font = 'bold 22px "BeVietnamPro"';
                    ctx.fillText(getLang("messageStats").toUpperCase(), 450, 500);

                    const stats = [
                        { x: 225, label: getLang("serverRank"), value: `#${user.rank}`, icon: '🏆', color: theme.warning },
                        { x: 450, label: getLang("totalMessages"), value: user.count, icon: '💬', color: theme.primary },
                        { x: 675, label: getLang("activeStreak"), value: `${user.activity.streak}d`, icon: '🔥', color: theme.danger }
                    ];

                    stats.forEach(stat => {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        drawRoundedRect(ctx, stat.x - 100, 500, 200, 140, 20);
                        ctx.fill();
                        ctx.fillStyle = stat.color;
                        ctx.font = '48px "Segoe UI Emoji"';
                        ctx.fillText(stat.icon, stat.x, 550);
                        ctx.font = 'bold 40px "BeVietnamPro"';
                        ctx.fillText(stat.value, stat.x, 600);
                        ctx.fillStyle = theme.muted;
                        ctx.font = 'bold 18px "BeVietnamPro"';
                        ctx.fillText(stat.label, stat.x, 635);
                    });

                    // Weekly Chart
                    ctx.textAlign = 'left';
                    ctx.fillStyle = theme.muted;
                    ctx.font = 'bold 24px "BeVietnamPro"';
                    ctx.fillText(getLang("weeklyChart"), 80, 720);

                    const dailyData = user.activity.daily;
                    const days = [];
                    for (let i = 6; i >= 0; i--) {
                        const day = moment().tz("Asia/Dhaka").subtract(i, 'days');
                        const k = day.format('YYYY-MM-DD');
                        days.push({ label: day.format('ddd'), count: Number(dailyData[k]) || 0 });
                    }

                    const maxCount = Math.max(1, ...days.map(d => d.count));
                    const chartX = 55, chartY = 750, chartW = 790, chartH = 180, barW = 80;

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    drawRoundedRect(ctx, chartX, chartY, chartW, chartH, 15);
                    ctx.fill();

                    days.forEach((day, i) => {
                        const x = chartX + 40 + i * (barW + 30);
                        const h = day.count > 0 ? (day.count / maxCount) * (chartH - 60) : 5;
                        const y = chartY + chartH - h - 30;

                        if (day.count > 0) ctx.fillStyle = createGradient(ctx, x, y, x, y+h, [theme.primary, theme.secondary]);
                        else ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';

                        drawRoundedRect(ctx, x, y, barW, h, 10);
                        ctx.fill();

                        ctx.fillStyle = day.count > 0 ? theme.text : theme.muted;
                        ctx.font = 'bold 18px "BeVietnamPro"';
                        ctx.textAlign = 'center';
                        ctx.fillText(day.label, x + barW/2, chartY + chartH - 5);

                        if(day.count > 0) {
                            ctx.fillStyle = theme.text;
                            ctx.font = 'bold 16px "BeVietnamPro"';
                            ctx.fillText(day.count, x + barW/2, y - 10);
                        }
                    });

                    // Breakdown
                    ctx.textAlign = 'left';
                    ctx.fillStyle = theme.muted;
                    ctx.font = 'bold 24px "BeVietnamPro"';
                    ctx.fillText(getLang("messageBreakdown"), 80, 990);

                    const types = user.activity.types;
                    const totalTypes = types.text + types.sticker + types.media;
                    const breakdown = [
                        { label: getLang("text"), val: types.text, col: theme.primary, icon: '📝' },
                        { label: getLang("sticker"), val: types.sticker, col: theme.accent, icon: '🎨' },
                        { label: getLang("media"), val: types.media, col: theme.warning, icon: '🖼️' }
                    ];

                    const donutX = 150, donutY = 1080;
                    if (totalTypes > 0) {
                        let angle = -0.5 * Math.PI;
                        breakdown.forEach(b => {
                            if(b.val > 0) {
                                const slice = (b.val/totalTypes) * 2 * Math.PI;
                                ctx.fillStyle = b.col;
                                ctx.beginPath();
                                ctx.moveTo(donutX, donutY);
                                ctx.arc(donutX, donutY, 70, angle, angle + slice);
                                ctx.fill();
                                angle += slice;
                            }
                        });
                    } else {
                        ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                        ctx.beginPath();
                        ctx.arc(donutX, donutY, 70, 0, Math.PI*2);
                        ctx.fill();
                    }
                    ctx.fillStyle = theme.bg[1];
                    ctx.beginPath(); ctx.arc(donutX, donutY, 40, 0, Math.PI*2); ctx.fill();

                    ctx.fillStyle = theme.text;
                    ctx.font = 'bold 24px "BeVietnamPro"';
                    ctx.textAlign = 'center';
                    ctx.fillText(totalTypes, donutX, donutY + 8);

                    let legY = 1050;
                    breakdown.forEach(b => {
                        const pct = totalTypes > 0 ? ((b.val/totalTypes)*100).toFixed(1) : "0.0";
                        ctx.fillStyle = b.col;
                        ctx.font = '28px "Segoe UI Emoji"';
                        ctx.fillText(b.icon, 300, legY + 25);
                        ctx.textAlign = 'left';
                        ctx.fillStyle = theme.text;
                        ctx.font = 'bold 22px "BeVietnamPro"';
                        ctx.fillText(b.label, 340, legY + 25);
                        ctx.textAlign = 'right';
                        ctx.fillStyle = theme.muted;
                        ctx.fillText(`${pct}% (${b.val})`, 800, legY + 25);
                        legY += 50;
                    });

                    // Footer
                    ctx.textAlign = 'center';
                    ctx.fillStyle = theme.muted;
                    ctx.font = 'italic 18px "BeVietnamPro"';
                    ctx.fillText(`${getLang("generatedAt")} ${moment().format("HH:mm:ss")}`, 450, 1270);

                    const path = resolve(__dirname, 'cache', `usercard_${uid}.png`);
                    const out = createWriteStream(path);
                    const stream = canvas.createPNGStream();
                    stream.pipe(out);
                    await new Promise(r => out.on('finish', r));

                    await message.reply({ attachment: createReadStream(path) });
                }
            }
        } catch (e) {
            console.error(e);
            message.reply("❌ Error generating card.");
        }
    },
        ncReply: async function ({ event, message, getLang, api, threadsData }) {
        const replyData = global.BeatriceBC?.ncReply?.get(event.messageReply?.messageID);
        
        if (!replyData || replyData.type !== 'leaderboard') return;
        if (replyData.author !== event.senderID) {
            return message.reply("❌ You are not authorized to use this pagination.");
        }

        const page = parseInt(event.body);
        if (isNaN(page) || page < 1) {
            return message.reply(getLang("invalidPage"));
        }

        try {
            await this.ncStart({ 
                args: ['all', page.toString()],
                threadsData,
                message,
                event,
                api,
                getLang
            });
        } catch (e) {
            console.error("Pagination error:", e);
            message.reply(getLang("invalidPage"));
        }
        }
    
};
