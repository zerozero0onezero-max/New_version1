const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fetch = require("node-fetch");

// ========== CONFIGURABLE SETTINGS ==========
const CONFIG = {
    // Currency Settings
    currency: {
        symbol: "$",
        name: "Dollar",
        decimalPlaces: 2
    },
    
    // Transfer Settings
    transfer: {
        minAmount: 10,
        maxAmount: 1000000,
        taxRates: [
            { max: 1000, rate: 2 },
            { max: 10000, rate: 5 },
            { max: 50000, rate: 8 },
            { max: 100000, rate: 10 },
            { max: 500000, rate: 12 },
            { max: 1000000, rate: 15 }
        ],
        dailyLimit: 500000
    },
    
    // Daily Bonus Settings
    dailyBonus: {
        baseAmount: 100,
        streakMultiplier: 0.1, // 10% increase per day
        maxStreak: 30,
        resetHours: 21
    },
    
    // Card Design Settings
    card: {
        width: 1000,
        height: 500,
        borderRadius: 30,
        glowIntensity: 25
    },
    
    // Tier System
    tiers: [
        { name: "Starter", min: 0, max: 999, color: "#cd7f32", badge: "🥉", multiplier: 1.0 },
        { name: "Rookie", min: 1000, max: 4999, color: "#c0c0c0", badge: "🥈", multiplier: 1.1 },
        { name: "Pro", min: 5000, max: 19999, color: "#ffd700", badge: "🥇", multiplier: 1.2 },
        { name: "Elite", min: 20000, max: 49999, color: "#e5e4e2", badge: "💎", multiplier: 1.3 },
        { name: "Master", min: 50000, max: 99999, color: "#0ff", badge: "👑", multiplier: 1.5 },
        { name: "Legend", min: 100000, max: 499999, color: "#ff00ff", badge: "🌟", multiplier: 2.0 },
        { name: "God", min: 500000, max: Infinity, color: "#ff0000", badge: "⚡", multiplier: 3.0 }
    ]
};

// ========== FONT REGISTRATION ==========
try {
    const fontsDir = path.join(__dirname, "fonts");
    if (fs.existsSync(fontsDir)) {
        const fontFiles = fs.readdirSync(fontsDir);
        for (const fontFile of fontFiles) {
            if (fontFile.endsWith(".ttf") || fontFile.endsWith(".otf")) {
                const fontPath = path.join(fontsDir, fontFile);
                const fontName = path.basename(fontFile, path.extname(fontFile));
                registerFont(fontPath, { family: fontName });
            }
        }
        console.log("✅ Custom fonts loaded successfully");
    }
} catch (error) {
    console.log("⚠️ Using default fonts");
}

// ========== HELPER FUNCTIONS ==========

/**
 * Enhanced money formatter with multi-scale support
 */
function formatMoney(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
        return `${CONFIG.currency.symbol}0`;
    }
    
    amount = Number(amount);
    
    // Handle special cases
    if (amount === Infinity) return `${CONFIG.currency.symbol}∞`;
    if (amount === -Infinity) return `${CONFIG.currency.symbol}-∞`;
    if (!isFinite(amount)) return `${CONFIG.currency.symbol}NaN`;
    
    // Determine scale
    const scales = [
        { value: 1e18, suffix: "Qi", name: "Quintillion" },
        { value: 1e15, suffix: "Qa", name: "Quadrillion" },
        { value: 1e12, suffix: "T", name: "Trillion" },
        { value: 1e9, suffix: "B", name: "Billion" },
        { value: 1e6, suffix: "M", name: "Million" },
        { value: 1e3, suffix: "K", name: "Thousand" }
    ];
    
    const scale = scales.find(s => Math.abs(amount) >= s.value);
    
    if (scale) {
        const scaledValue = amount / scale.value;
        const formatted = Math.abs(scaledValue).toFixed(CONFIG.currency.decimalPlaces);
        const cleanValue = formatted.endsWith(".00") ? 
            formatted.slice(0, -3) : formatted;
        
        return `${amount < 0 ? "-" : ""}${CONFIG.currency.symbol}${cleanValue}${scale.suffix}`;
    }
    
    // Format regular numbers with commas
    const parts = Math.abs(amount).toFixed(CONFIG.currency.decimalPlaces).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return `${amount < 0 ? "-" : ""}${CONFIG.currency.symbol}${parts.join(".")}`;
}

/**
 * Get tier information based on balance
 */
function getTierInfo(balance) {
    const validBalance = Number(balance) || 0;
    
    for (const tier of CONFIG.tiers) {
        if (validBalance >= tier.min && validBalance <= tier.max) {
            return {
                ...tier,
                glow: `${tier.color}80`,
                nextTier: CONFIG.tiers[CONFIG.tiers.indexOf(tier) + 1] || null,
                progress: tier.max === Infinity ? 100 : 
                    Math.min(100, ((validBalance - tier.min) / (tier.max - tier.min)) * 100)
            };
        }
    }
    
    // Fallback
    return {
        name: "Unknown",
        color: "#888888",
        badge: "❓",
        multiplier: 1.0,
        glow: "#88888880"
    };
}

/**
 * Calculate tax for transfer amount
 */
function calculateTax(amount) {
    let applicableRate = 0;
    
    for (const rate of CONFIG.transfer.taxRates) {
        if (amount <= rate.max) {
            applicableRate = rate.rate;
            break;
        }
    }
    
    // If amount exceeds all ranges, use the last rate
    if (applicableRate === 0) {
        applicableRate = CONFIG.transfer.taxRates[CONFIG.transfer.taxRates.length - 1].rate;
    }
    
    const tax = Math.ceil((amount * applicableRate) / 100);
    const total = amount + tax;
    
    return {
        rate: applicableRate,
        tax: tax,
        total: total,
        netAmount: amount
    };
}

/**
 * Create rounded rectangle path
 */
function createRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw banknote effect
 */
function drawBanknote(ctx, x, y, width, height, value, color) {
    ctx.save();
    
    // Banknote background
    ctx.fillStyle = color + "20";
    ctx.fillRect(x, y, width, height);
    
    // Banknote border
    ctx.strokeStyle = color + "80";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Banknote pattern
    ctx.fillStyle = color + "10";
    for (let i = 0; i < width; i += 20) {
        for (let j = 0; j < height; j += 20) {
            if ((i + j) % 40 === 0) {
                ctx.fillRect(x + i, y + j, 10, 10);
            }
        }
    }
    
    // Value text
    ctx.fillStyle = color;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(formatMoney(value), x + width / 2, y + height / 2 + 5);
    
    // Currency symbol
    ctx.font = "20px Arial";
    ctx.fillText(CONFIG.currency.symbol, x + width / 2, y + height / 2 - 15);
    
    ctx.restore();
}

/**
 * Draw progress bar
 */
function drawProgressBar(ctx, x, y, width, height, progress, color) {
    ctx.save();
    
    // Background
    ctx.fillStyle = "#333333";
    createRoundedRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    
    // Progress
    const progressWidth = Math.max(5, (progress / 100) * width);
    ctx.fillStyle = color;
    createRoundedRect(ctx, x, y, progressWidth, height, height / 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 1;
    createRoundedRect(ctx, x, y, width, height, height / 2);
    ctx.stroke();
    
    // Progress text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(progress)}%`, x + width / 2, y + height / 2 + 4);
    
    ctx.restore();
}

/**
 * Load user avatar with fallback
 */
async function loadUserAvatar(usersData, targetID) {
    try {
        const avatarURL = await usersData.getAvatarUrl(targetID);
        if (!avatarURL) return null;
        
        const response = await fetch(avatarURL);
        if (!response.ok) return null;
        
        const buffer = await response.buffer();
        if (buffer.length < 100) return null;
        
        return await loadImage(buffer);
    } catch (error) {
        console.log("Avatar load error:", error.message);
        return null;
    }
}

/**
 * Generate transaction ID
 */
function generateTransactionID() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `TX${timestamp}${random}`.toUpperCase();
}


module.exports = {
    config: {
        name: "balance",
        aliases: ["bal"],
        version: "2.0.0",
        author: "NoobCore Team", // author Fahad Islam
        team: "NoobCore",
        countDown: 3,
        role: 0,
        shortDescription: {
            en: "💰 Advanced economy system with visual cards & secure transfers"
        },
        longDescription: {
            en: "Check your balance, transfer money, view leaderboard, and get daily bonuses with premium visual cards and secure transactions."
        },
        guide: {
            en: `
╭──「 Balance Commands 」───
├ {pn} - Check your balance
├ {pn} @user - Check someone's balance
├ {pn} transfer @user amount - Send money
├ {pn} top [page] - View leaderboard
├ {pn} daily - Claim daily bonus
├ {pn} rank - Check your wealth rank
╰─────────────────────

💡 Examples:
• !balance
• !bal @JohnDoe
• !bal transfer @JohnDoe 1000
• !bal top 2
• !bal daily
            `.trim()
        }
    },

    ncStart: async function ({ message, event, args, usersData, commandName, api }) {
        const { senderID, mentions, messageReply, threadID } = event;
        const command = args[0]?.toLowerCase();
        
        // ========== DAILY BONUS COMMAND ==========
        if (command === "daily") {
            const userData = await usersData.get(senderID);
            const now = Date.now();
            const lastDaily = userData.lastDaily || 0;
            const dailyStreak = userData.dailyStreak || 0;
            
            // Check if already claimed today
            const hoursSinceLast = (now - lastDaily) / (1000 * 60 * 60);
            
            if (hoursSinceLast < CONFIG.dailyBonus.resetHours) {
                const hoursLeft = Math.ceil(CONFIG.dailyBonus.resetHours - hoursSinceLast);
                return message.reply(
                    `⏰ You've already claimed your daily bonus today!\n` +
                    `🔄 Next claim available in ${hoursLeft} hours\n` +
                    `🔥 Current streak: ${dailyStreak} days`
                );
            }
            
            // Calculate bonus
            const baseBonus = CONFIG.dailyBonus.baseAmount;
            const streakBonus = Math.min(
                dailyStreak * CONFIG.dailyBonus.streakMultiplier * baseBonus,
                baseBonus * 5
            );
            const totalBonus = Math.round(baseBonus + streakBonus);
            
            // Determine if streak continues or resets
            const newStreak = hoursSinceLast < CONFIG.dailyBonus.resetHours * 2 ? 
                dailyStreak + 1 : 1;
            
            // Update user data
            await usersData.set(senderID, {
                money: (userData.money || 0) + totalBonus,
                lastDaily: now,
                dailyStreak: newStreak
            });
            
            // Send success message
            const bonusMessage = `
🎉 DAILY BONUS CLAIMED! 🎉

💰 Base Bonus: ${formatMoney(baseBonus)}
🔥 Streak Bonus: ${formatMoney(streakBonus)}
🎁 Total Received: ${formatMoney(totalBonus)}

📈 New Streak: ${newStreak} day${newStreak !== 1 ? 's' : ''}
💸 New Balance: ${formatMoney((userData.money || 0) + totalBonus)}

💡 Keep your streak alive for bigger bonuses!
            `.trim();
            
            return message.reply(bonusMessage);
        }
        
        // ========== RANK COMMAND ==========
        if (command === "rank") {
            const userData = await usersData.get(senderID);
            const balance = userData.money || 0;
            const tierInfo = getTierInfo(balance);
            
            const allUsers = await usersData.getAll();
            const sortedUsers = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));
            const globalRank = sortedUsers.findIndex(user => user.userID === senderID) + 1;
            const totalUsers = sortedUsers.length;
            
            const rankMessage = `
🏆 WEALTH RANK INFORMATION

👤 Player: ${userData.name || "User"}
💰 Balance: ${formatMoney(balance)}
🥇 Tier: ${tierInfo.badge} ${tierInfo.name}
📊 Global Rank: #${globalRank} of ${totalUsers}
📈 Progress to Next Tier: ${tierInfo.progress.toFixed(1)}%

💡 Next Tier: ${tierInfo.nextTier ? `${tierInfo.nextTier.badge} ${tierInfo.nextTier.name}` : 'MAX TIER'}
🎯 Needed: ${tierInfo.nextTier ? formatMoney(tierInfo.nextTier.min - balance) : 'N/A'}

💎 Tier Multiplier: ${tierInfo.multiplier}x
            `.trim();
            
            return message.reply(rankMessage);
        }
        
        // ========== LEADERBOARD COMMAND ==========
        if (command === "top") {
            const page = parseInt(args[1]) || 1;
            const perPage = 10;
            
            const allUsers = await usersData.getAll();
            const wealthyUsers = allUsers
                .filter(user => user.money > 0)
                .sort((a, b) => (b.money || 0) - (a.money || 0));
            
            const totalPages = Math.ceil(wealthyUsers.length / perPage);
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const pageUsers = wealthyUsers.slice(startIndex, endIndex);
            
            if (pageUsers.length === 0) {
                return message.reply("📭 No users found on this page!");
            }
            
            let leaderboardText = `🏆 WEALTH LEADERBOARD (Page ${page}/${totalPages}) 🏆\n\n`;
            
            pageUsers.forEach((user, index) => {
                const globalRank = startIndex + index + 1;
                const rankEmoji = ["🥇", "🥈", "🥉"][globalRank - 1] || `🏅`;
                const name = user.name || "Unknown User";
                const money = user.money || 0;
                const tier = getTierInfo(money);
                
                leaderboardText += `${rankEmoji} #${globalRank}. ${name}\n`;
                leaderboardText += `   💰 ${formatMoney(money)} | ${tier.badge} ${tier.name}\n`;
                leaderboardText += `   ───────────────\n`;
            });
            
            // Add navigation info
            if (totalPages > 1) {
                leaderboardText += `\n📖 Use: !balance top <page> to navigate`;
                leaderboardText += `\n👤 Your position on leaderboard: #${wealthyUsers.findIndex(u => u.userID === senderID) + 1}`;
            }
            
            return message.reply(leaderboardText);
        }
        
        // ========== TRANSFER COMMAND ==========
        if (command === "transfer" || command === "send" || command === "pay") {
            let targetID = Object.keys(mentions)[0] || messageReply?.senderID || args[1];
            const amountRaw = args.find(a => !isNaN(parseFloat(a)) && parseFloat(a) > 0);
            const amount = parseFloat(amountRaw);
            
            // Validation
            if (!targetID || isNaN(amount)) {
                return message.reply(
                    `💸 Transfer Usage:\n` +
                    `!balance transfer @user amount\n` +
                    `Example: !bal transfer @John 1000\n\n` +
                    `📊 Tax Rates:\n` +
                    `• ≤ $1,000: 2% tax\n` +
                    `• ≤ $10,000: 5% tax\n` +
                    `• ≤ $50,000: 8% tax\n` +
                    `• ≤ $100,000: 10% tax\n` +
                    `• ≤ $500,000: 12% tax\n` +
                    `• > $500,000: 15% tax`
                );
            }
            
            if (targetID === senderID) {
                return message.reply("❌ You cannot send money to yourself.");
            }
            
            if (amount < CONFIG.transfer.minAmount) {
                return message.reply(`❌ Minimum transfer amount is ${formatMoney(CONFIG.transfer.minAmount)}.`);
            }
            
            if (amount > CONFIG.transfer.maxAmount) {
                return message.reply(`❌ Maximum transfer amount is ${formatMoney(CONFIG.transfer.maxAmount)}.`);
            }
            
            // Get user data
            const [sender, receiver] = await Promise.all([
                usersData.get(senderID),
                usersData.get(targetID)
            ]);
            
            if (!receiver) {
                return message.reply("❌ Target user not found in database.");
            }
            
            // Calculate tax
            const taxInfo = calculateTax(amount);
            
            // Check if sender has enough money
            if ((sender.money || 0) < taxInfo.total) {
                const needed = taxInfo.total - (sender.money || 0);
                return message.reply(
                    `❌ Insufficient funds!\n\n` +
                    `💵 Amount to send: ${formatMoney(amount)}\n` +
                    `🏛️ Tax (${taxInfo.rate}%): ${formatMoney(taxInfo.tax)}\n` +
                    `💸 Total needed: ${formatMoney(taxInfo.total)}\n` +
                    `💰 Your balance: ${formatMoney(sender.money || 0)}\n` +
                    `📉 Missing: ${formatMoney(needed)}`
                );
            }
            
            // Execute transfer
            await Promise.all([
                usersData.set(senderID, { 
                    money: (sender.money || 0) - taxInfo.total 
                }),
                usersData.set(targetID, { 
                    money: (receiver.money || 0) + amount 
                })
            ]);
            
            // Get names
            const [senderName, receiverName] = await Promise.all([
                usersData.getName(senderID),
                usersData.getName(targetID)
            ]);
            
            // Generate transaction ID
            const transactionID = generateTransactionID();
            
            // Send success message
            const successMessage = `
✅ TRANSFER COMPLETED! 💸
━━━━━━━━━━━━━━━━━━━━
📋 Transaction ID: ${transactionID}
👤 From: ${senderName}
🎯 To: ${receiverName}
━━━━━━━━━━━━━━━━━━━━
💰 Amount Sent: ${formatMoney(amount)}
🏛️ Tax Deducted: ${formatMoney(taxInfo.tax)} (${taxInfo.rate}%)
💸 Total Charged: ${formatMoney(taxInfo.total)}
━━━━━━━━━━━━━━━━━━━━
📊 Sender's New Balance: ${formatMoney((sender.money || 0) - taxInfo.total)}
💳 Receiver's New Balance: ${formatMoney((receiver.money || 0) + amount)}
━━━━━━━━━━━━━━━━━━━━
⏰ Time: ${new Date().toLocaleTimeString()}
✅ Status: Verified & Secured
            `.trim();
            
            return message.reply(successMessage);
        }
        
        // ========== BALANCE CHECK (DEFAULT) ==========
        let targetID = senderID;
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else if (messageReply) {
            targetID = messageReply.senderID;
        }
        
        // Get user data
        const [userData, allUsers] = await Promise.all([
            usersData.get(targetID),
            usersData.getAll()
        ]);
        
        if (!userData) {
            return message.reply("❌ User not found in database.");
        }
        
        const userName = userData.name || "User";
        const balance = userData.money || 0;
        const tierInfo = getTierInfo(balance);
        
        // Calculate global rank
        const sortedUsers = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));
        const globalRank = sortedUsers.findIndex(user => user.userID === targetID) + 1;
        const totalUsers = sortedUsers.length;
        
        // Calculate percentile
        const percentile = ((totalUsers - globalRank) / totalUsers * 100).toFixed(1);
        
        // Load avatar
        let avatarImage = null;
        try {
            avatarImage = await loadUserAvatar(usersData, targetID);
        } catch (error) {
            console.log("Avatar load failed, using fallback");
        }
        
        // ========== CREATE VISUAL CARD ==========
        const canvas = createCanvas(CONFIG.card.width, CONFIG.card.height);
        const ctx = canvas.getContext("2d");
        
        // 1. Background with gradient
        const bgGradient = ctx.createLinearGradient(0, 0, CONFIG.card.width, CONFIG.card.height);
        bgGradient.addColorStop(0, "#0a0a1f");
        bgGradient.addColorStop(0.5, "#151530");
        bgGradient.addColorStop(1, "#0f0f23");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CONFIG.card.width, CONFIG.card.height);
        
        // 2. Subtle pattern
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * CONFIG.card.width,
                Math.random() * CONFIG.card.height,
                Math.random() * 2 + 0.5,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // 3. Main card container
        const card = {
            x: 40,
            y: 30,
            width: CONFIG.card.width - 80,
            height: CONFIG.card.height - 60
        };
        
        // Card background with blur effect
        ctx.save();
        createRoundedRect(ctx, card.x, card.y, card.width, card.height, CONFIG.card.borderRadius);
        ctx.clip();
        
        const cardGradient = ctx.createLinearGradient(
            card.x, card.y,
            card.x, card.y + card.height
        );
        cardGradient.addColorStop(0, "rgba(255, 255, 255, 0.05)");
        cardGradient.addColorStop(1, "rgba(255, 255, 255, 0.02)");
        ctx.fillStyle = cardGradient;
        ctx.fillRect(card.x, card.y, card.width, card.height);
        ctx.restore();
        
        // 4. Card border with glow
        ctx.strokeStyle = tierInfo.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = tierInfo.color;
        ctx.shadowBlur = CONFIG.card.glowIntensity;
        createRoundedRect(ctx, card.x, card.y, card.width, card.height, CONFIG.card.borderRadius);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // 5. Header section
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px 'Arial'";
        ctx.textAlign = "left";
        ctx.fillText("💳 FINANCIAL PASSPORT", card.x + 40, card.y + 50);
        
        // 6. Balance display
        ctx.fillStyle = tierInfo.color;
        ctx.font = "bold 56px 'Arial'";
        ctx.textAlign = "center";
        ctx.shadowColor = tierInfo.color;
        ctx.shadowBlur = 20;
        ctx.fillText(formatMoney(balance), card.x + card.width / 2, card.y + 120);
        ctx.shadowBlur = 0;
        
        // 7. User info section
        const infoX = card.x + 40;
        const infoY = card.y + 160;
        
        // User name
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px 'Arial'";
        ctx.textAlign = "left";
        ctx.fillText(`👤 ${userName}`, infoX, infoY);
        
        // User ID
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "16px 'Arial'";
        ctx.fillText(`🆔 ${targetID}`, infoX, infoY + 30);
        
        // Global rank
        ctx.fillStyle = "#ffaa00";
        ctx.font = "bold 18px 'Arial'";
        ctx.fillText(`🏆 Global Rank: #${globalRank} (Top ${percentile}%)`, infoX, infoY + 60);
        
        // Tier info
        ctx.fillStyle = tierInfo.color;
        ctx.font = "bold 20px 'Arial'";
        ctx.fillText(`${tierInfo.badge} ${tierInfo.name} Tier`, infoX, infoY + 90);
        
        // 8. Progress bar to next tier
        if (tierInfo.nextTier) {
            const progressBarX = infoX;
            const progressBarY = infoY + 100;
            const progressBarWidth = 300;
            const progressBarHeight = 20;
            
            drawProgressBar(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 
                          tierInfo.progress, tierInfo.color);
            
            // Next tier info
            ctx.fillStyle = "#aaaaaa";
            ctx.font = "14px 'Arial'";
            ctx.fillText(`Next: ${tierInfo.nextTier.name} (${formatMoney(tierInfo.nextTier.min - balance)} needed)`, 
                        progressBarX, progressBarY + 100);
        }
        
        // 9. Avatar section
        const avatarX = card.x + card.width - 180;
        const avatarY = card.y + 150;
        const avatarSize = 150;
        
        // Avatar background
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fill();
        ctx.strokeStyle = tierInfo.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        
        // Draw avatar image
        if (avatarImage) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 - 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
        } else {
            // Default avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = tierInfo.color + "40";
            ctx.fill();
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px 'Arial'";
            ctx.textAlign = "center";
            ctx.fillText("AVATAR", avatarX + avatarSize/2, avatarY + avatarSize/2 + 5);
            ctx.restore();
        }
        
        // 10. Banknote indicators
        const notesY = card.y + 300;
        const noteWidth = 80;
        const noteHeight = 40;
        const noteSpacing = 20;
        
        // Draw banknotes for different denominations
        const denominations = [1000, 100, 10, 1];
        let noteX = card.x + 40;
        
        for (const denom of denominations) {
            const noteCount = Math.floor(balance / denom);
            if (noteCount > 0) {
                drawBanknote(ctx, noteX, notesY, noteWidth, noteHeight, denom, tierInfo.color);
                noteX += noteWidth + noteSpacing;
            }
        }
        
        // 11. Footer
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.font = "12px 'Arial'";
        ctx.textAlign = "left";
        ctx.fillText("🏦 Secure Banking System • Encrypted Transactions", 
                    card.x + 40, card.y + card.height - 20);
        
        ctx.textAlign = "right";
        ctx.fillText("© Fahad Islam", 
                    card.x + card.width - 40, card.y + card.height - 20);
        
        // ========== SAVE AND SEND CARD ==========
        const tmpDir = path.join(__dirname, "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const filePath = path.join(tmpDir, `balance_${targetID}_${Date.now()}.png`);
        
        try {
            // Save canvas to file
            const buffer = canvas.toBuffer("image/png");
            fs.writeFileSync(filePath, buffer);
            
            // Create response message
            const messageBody = `
💎 FINANCIAL PROFILE SUMMARY

👤 Account Holder: ${userName}
💰 Current Balance: ${formatMoney(balance)}
🏆 Wealth Tier: ${tierInfo.badge} ${tierInfo.name}
📊 Global Position: #${globalRank} of ${totalUsers} (Top ${percentile}%)
🎯 Progress to Next Tier: ${tierInfo.progress.toFixed(1)}%

📈 Stats:
• Daily Streak: ${userData.dailyStreak || 0} days
• Tier Multiplier: ${tierInfo.multiplier}x
• Account Status: ✅ Active

💡 Commands:
• !balance daily - Claim daily bonus
• !balance transfer @user amount - Send money
• !balance top - View leaderboard
• !balance rank - Check detailed rank
            `.trim();
            
            // Send message with attachment
            await message.reply({
                body: messageBody,
                attachment: fs.createReadStream(filePath)
            });
            
            // Clean up file
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (cleanupError) {
                    console.log("Cleanup error:", cleanupError.message);
                }
            }, 10000);
            
        } catch (error) {
            console.error("Card creation error:", error);
            
            // Fallback text response
            const fallbackMessage = `
💳 Balance Information

👤 User: ${userName}
💰 Balance: ${formatMoney(balance)}
🏆 Tier: ${tierInfo.name} ${tierInfo.badge}
📊 Global Rank: #${globalRank} of ${totalUsers}
🎯 Progress: ${tierInfo.progress.toFixed(1)}% to next tier

💡 Use commands:
• !balance daily - Daily bonus
• !balance transfer - Send money
• !balance top - Leaderboard
            `.trim();
            
            await message.reply(fallbackMessage);
        }
    },
    
    // ========== ON CHAT FUNCTION ==========
    ncPrefix: async function({ event, message, usersData }) {
        // You can add auto-bonus or other chat-based features here
        // Example: Random money drops in chat
        const randomChance = Math.random();
        
        if (randomChance < 0.001) { // 0.1% chance
            const bonus = Math.floor(Math.random() * 100) + 1;
            const userID = event.senderID;
            
            const userData = await usersData.get(userID);
            await usersData.set(userID, {
                money: (userData.money || 0) + bonus
            });
            
            await message.reply(
                `🎊 LUCKY DROP! 🎊\n` +
                `You found ${formatMoney(bonus)} on the ground!\n` +
                `New balance: ${formatMoney((userData.money || 0) + bonus)}`
            );
        }
    }
};