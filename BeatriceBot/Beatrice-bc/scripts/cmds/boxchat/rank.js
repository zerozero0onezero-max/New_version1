const { createCanvas, loadImage, registerFont } = require("canvas");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");
const CONFIG = {
    canvasWidth: 1400,
    canvasHeight: 800,
    deltaNext: 5,
    cacheDir: path.join(__dirname, "cache"),
    avatarCache: {},
    avatarCacheDuration: 5 * 60 * 1000, 
    facebookTokens: ["6628568379|c1e620fa708a1d5696fb991c1bde5662"],
    defaultAvatar: "https://i.imgur.com/I3VsBEt.png",
};
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function expToLevel(exp) {
    return Math.floor((1 + Math.sqrt(1 + (8 * exp) / CONFIG.deltaNext)) / 2);
}
function levelToExp(level) {
    return Math.floor(((level ** 2 - level) * CONFIG.deltaNext) / 2);
}
function formatNumber(num) {
    if (
        num === null ||
        num === undefined ||
        isNaN(num) ||
        !Number.isFinite(num)
    )
        return "0";
    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (absNum >= 1e12) return `${sign}${(absNum / 1e12).toFixed(2)}T`;
    if (absNum >= 1e9) return `${sign}${(absNum / 1e9).toFixed(2)}B`;
    if (absNum >= 1e6) return `${sign}${(absNum / 1e6).toFixed(2)}M`;
    if (absNum >= 1e3) return `${sign}${(absNum / 1e3).toFixed(1)}K`;
    return `${sign}${Math.round(absNum)}`;
}
function randomString(length = 6) {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function getRandomToken() {
    return CONFIG.facebookTokens[
        Math.floor(Math.random() * CONFIG.facebookTokens.length)
    ];
}
async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios({ url, timeout: 10000, ...options });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
try {
    const fontDir = path.join(__dirname, "assets", "fonts");
    ensureDir(fontDir);
    const fontFiles = {
        "Poppins-Bold": "Poppins-Bold.ttf",
        "Poppins-SemiBold": "Poppins-SemiBold.ttf",
        "Poppins-Regular": "Poppins-Regular.ttf",
        "Inter-Bold": "Inter-Bold.ttf",
        "Inter-SemiBold": "Inter-SemiBold.ttf",
    };
    for (const [fontName, fileName] of Object.entries(fontFiles)) {
        const fontPath = path.join(fontDir, fileName);
        if (fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: fontName });
        }
    }
} catch (error) {
    console.log("Font registration:", error.message);
}
const THEMES = [
    {
        id: "aurora",
        name: "Aurora Borealis",
        colors: {
            primary: "#7F00FF",    
            secondary: "#00FF9F",    
            accent: "#FF3E9D",
            background: ["#0A0F1E", "#1A1F35", "#2A2F4A"],
            card: "rgba(20, 25, 45, 0.95)",
            text: "#FFFFFF",
            success: "#00FF9F",
            warning: "#FFD700",
            danger: "#FF3E9D",
        },
        style: "cosmic",
        effects: ["glow", "particles", "gradient"],
    },
    {
        id: "neon_pulse",
        name: "Neon Pulse",
        colors: {
            primary: "#FF36AB",   
            secondary: "#6C4DFF",  
            accent: "#3B9EFF",  
            background: ["#0D0B1A", "#1A1530", "#262046"],
            card: "rgba(18, 15, 30, 0.95)",
            text: "#FFFFFF",
            success: "#00FFC6",
            warning: "#FFB347",
            danger: "#FF4D4D",
        },
        style: "cyber",
        effects: ["pulse", "glow", "scanlines"],
    },
    {
        id: "sunset_citrus",
        name: "Sunset Citrus",
        colors: {
            primary: "#FF7B00", 
            secondary: "#FFB200", 
            accent: "#FF4D4D",   
            background: ["#2B1B1B", "#3D2525", "#4F2F2F"],
            card: "rgba(43, 27, 27, 0.95)",
            text: "#FFF5E6",
            success: "#00FFAA",
            warning: "#FFD966",
            danger: "#FF6B6B",
        },
        style: "warm",
        effects: ["glow", "gradient", "shine"],
    },
    {
        id: "ocean_deep",
        name: "Ocean Deep",
        colors: {
            primary: "#00C2FF",    
            secondary: "#0066FF",    
            accent: "#7F00FF",       
            background: ["#001220", "#001C30", "#002640"],
            card: "rgba(0, 20, 35, 0.95)",
            text: "#E6F3FF",
            success: "#00FFC2",
            warning: "#FFB347",
            danger: "#FF4D4D",
        },
        style: "aquatic",
        effects: ["wave", "glow", "bubbles"],
    },
    {
        id: "midnight_royal",
        name: "Midnight Royal",
        colors: {
            primary: "#B829FF",    
            secondary: "#FF29B8",  
            accent: "#29FFB8",     
            background: ["#0A0515", "#150A25", "#200F35"],
            card: "rgba(10, 5, 25, 0.95)",
            text: "#FFFFFF",
            success: "#B8FF29",
            warning: "#FFB829",
            danger: "#FF2929",
        },
        style: "luxury",
        effects: ["glow", "sparkle", "gradient"],
    },
    {
        id: "forest_emerald",
        name: "Forest Emerald",
        colors: {
            primary: "#00FF88",   
            secondary: "#00CC88",    
            accent: "#88FF00",     
            background: ["#0A1F0A", "#0F2A0F", "#143514"],
            card: "rgba(10, 30, 10, 0.95)",
            text: "#E6FFE6",
            success: "#88FF00",
            warning: "#FFD966",
            danger: "#FF6B6B",
        },
        style: "natural",
        effects: ["glow", "particles", "gradient"],
    },
    {
        id: "cherry_blossom",
        name: "Cherry Blossom",
        colors: {
            primary: "#FF8AB5",   
            secondary: "#FFB3C6",    
            accent: "#D4A5FF",   
            background: ["#2A1B2A", "#352235", "#402940"],
            card: "rgba(42, 27, 42, 0.95)",
            text: "#FFF0F5",
            success: "#A5FFD4",
            warning: "#FFD4A5",
            danger: "#FFA5A5",
        },
        style: "cute",
        effects: ["soft-glow", "sparkle", "gradient"],
    },
    {
        id: "cyber_void",
        name: "Cyber Void",
        colors: {
            primary: "#00FFFF", 
            secondary: "#FF00FF",   
            accent: "#FFFF00",      
            background: ["#000000", "#0A0A0A", "#141414"],
            card: "rgba(10, 10, 10, 0.98)",
            text: "#FFFFFF",
            success: "#00FF00",
            warning: "#FFFF00",
            danger: "#FF0000",
        },
        style: "cyberpunk",
        effects: ["glitch", "scanlines", "glow"],
    },
    {
        id: "royal_gold",
        name: "Royal Gold",
        colors: {
            primary: "#FFD700",  
            secondary: "#FFA500",  
            accent: "#FF69B4",   
            background: ["#1A0F00", "#2A1F00", "#3A2F00"],
            card: "rgba(26, 15, 0, 0.95)",
            text: "#FFF9E6",
            success: "#FFD700",
            warning: "#FFA500",
            danger: "#FF4500",
        },
        style: "luxury",
        effects: ["shine", "glow", "gradient"],
    },
    {
        id: "galaxy_nebula",
        name: "Galaxy Nebula",
        colors: {
            primary: "#9933FF",   
            secondary: "#FF3399",  
            accent: "#33FFFF",   
            background: ["#0B0719", "#150E2D", "#1F1541"],
            card: "rgba(11, 7, 25, 0.95)",
            text: "#FFFFFF",
            success: "#33FF99",
            warning: "#FFFF33",
            danger: "#FF3333",
        },
        style: "cosmic",
        effects: ["stars", "nebula", "glow"],
    },
];
class AvatarService {
    static async getAvatarUrl(userId, size = 600) {
        const cacheKey = `${userId}_${size}`;
        const now = Date.now();
        if (
            CONFIG.avatarCache[cacheKey] &&
            now - CONFIG.avatarCache[cacheKey].timestamp <
                CONFIG.avatarCacheDuration
        ) {
            return CONFIG.avatarCache[cacheKey].url;
        }
        const methods = [
            this._getFromFacebookAPI,
            this._getFromGraphAPI,
            this._getFromFacebookCDN,
        ];
        for (const method of methods) {
            try {
                const url = await method(userId, size);
                if (url) {
                    CONFIG.avatarCache[cacheKey] = {
                        url: url,
                        timestamp: now,
                    };
                    return url;
                }
            } catch (error) {
                console.log(
                    `Avatar method ${method.name} failed:`,
                    error.message,
                );
            }
        }
        return CONFIG.defaultAvatar;
    }
    static async _getFromFacebookAPI(userId, size) {
        try {
            const token = getRandomToken();
            const url = `https://graph.facebook.com/${userId}/picture?width=1000&height=1000&access_token=${token}`;
            const response = await fetchWithRetry(url, {
                responseType: "arraybuffer",
            });
            if (response.status === 200 && response.data) {
                return url;
            }
        } catch (error) {
            throw error;
        }
        return null;
    }
    static async _getFromGraphAPI(userId, size) {
        try {
            const url = `https://graph.facebook.com/${userId}/picture?width=${size}&height=${size}&redirect=false`;
            const response = await fetchWithRetry(url);
            if (response.data && response.data.data && response.data.data.url) {
                return response.data.data.url;
            }
        } catch (error) {
            console.log("Graph API failed:", error.message);
        }
        return null;
    }
    static async _getFromFacebookCDN(userId, size) {
        try {
            const url = `https://graph.facebook.com/${userId}/picture?width=${size}&height=${size}`;
            await fetchWithRetry(url, { method: "HEAD" });
            return url;
        } catch (error) {
            console.log("Facebook CDN failed:", error.message);
        }
        return null;
    }
}
class RankCardRenderer {
    constructor(data) {
        this.data = data;
        this.theme = THEMES[data.themeIndex] || THEMES[0];
        this.canvas = createCanvas(CONFIG.canvasWidth, CONFIG.canvasHeight);
        this.ctx = this.canvas.getContext("2d");
        this.time = Date.now() / 1000;
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";
        this.ctx.textDrawingMode = "glyph";
    }
    async render() {
        try {
            await this.drawBackground();
            this.drawCardBase();
            await this.drawAvatar();
            this.drawUserInfo();
            this.drawLevelProgress();
            this.drawStatsGrid();
            this.drawRankInfo();
            this.drawFooter();
            return this.canvas.toBuffer("image/png");
        } catch (error) {
            console.error("Render error:", error);
            throw error;
        }
    }
    async drawBackground() {
        const { colors } = this.theme;
        if (this.data.customBg) {
            try {
                const bgImage = await loadImage(this.data.customBg);
                this.ctx.drawImage(
                    bgImage,
                    0,
                    0,
                    CONFIG.canvasWidth,
                    CONFIG.canvasHeight,
                );
                this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                this.ctx.fillRect(
                    0,
                    0,
                    CONFIG.canvasWidth,
                    CONFIG.canvasHeight,
                );
                return;
            } catch (error) {
                console.log("Custom background failed:", error.message);
            }
        }
        const gradient = this.ctx.createRadialGradient(
            CONFIG.canvasWidth / 2,
            CONFIG.canvasHeight / 2,
            0,
            CONFIG.canvasWidth / 2,
            CONFIG.canvasHeight / 2,
            Math.max(CONFIG.canvasWidth, CONFIG.canvasHeight) / 1.5
        );
        gradient.addColorStop(0, colors.background[0]);
        gradient.addColorStop(0.5, colors.background[1]);
        gradient.addColorStop(1, colors.background[2]);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
        if (this.theme.effects.includes("particles") || this.theme.effects.includes("sparkle")) {
            this.drawParticles();
        }
        if (this.theme.effects.includes("stars") || this.theme.effects.includes("nebula")) {
            this.drawStars();
        }
        if (this.theme.effects.includes("scanlines") || this.theme.effects.includes("glitch")) {
            this.drawScanlines();
        }
        if (this.theme.effects.includes("nebula")) {
            this.drawNebula();
        }
        if (this.theme.effects.includes("bubbles")) {
            this.drawBubbles();
        }
        if (this.theme.effects.includes("wave")) {
            this.drawWaves();
        }
    }
    drawParticles() {
        this.ctx.save();
        for (let i = 0; i < 40; i++) {
            const x = (Math.sin(this.time * 0.5 + i) * 100 + (i * 70) % CONFIG.canvasWidth);
            const y = (Math.cos(this.time * 0.3 + i) * 50 + (i * 40) % CONFIG.canvasHeight);
            const size = Math.sin(this.time + i) * 2 + 3;
            this.ctx.shadowColor = this.theme.colors.primary;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.theme.colors.primary + '80';
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    drawStars() {
        this.ctx.save();
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * CONFIG.canvasWidth;
            const y = Math.random() * CONFIG.canvasHeight;
            const radius = Math.random() * 2 + 1;
            const twinkle = Math.sin(this.time * 2 + i) * 0.3 + 0.7;
            this.ctx.globalAlpha = twinkle;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    drawScanlines() {
        this.ctx.save();
        this.ctx.strokeStyle = this.theme.colors.primary + '20';
        this.ctx.lineWidth = 1;
        for (let y = 0; y < CONFIG.canvasHeight; y += 4) {
            this.ctx.globalAlpha = Math.random() * 0.1 + 0.1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.canvasWidth, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
    drawNebula() {
        this.ctx.save();
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * CONFIG.canvasWidth;
            const y = Math.random() * CONFIG.canvasHeight;
            const radius = Math.random() * 200 + 100;
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, this.theme.colors.primary + '40');
            gradient.addColorStop(0.5, this.theme.colors.secondary + '20');
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    drawBubbles() {
        this.ctx.save();
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * CONFIG.canvasWidth;
            const y = Math.random() * CONFIG.canvasHeight;
            const radius = Math.random() * 30 + 10;
            this.ctx.strokeStyle = this.theme.colors.primary + '40';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y - 5, radius * 0.2, 0, Math.PI * 2);
            this.ctx.fillStyle = '#FFFFFF40';
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    drawWaves() {
        this.ctx.save();
        this.ctx.strokeStyle = this.theme.colors.primary + '30';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const offset = i * 100 + this.time * 50;
            this.ctx.beginPath();
            for (let x = 0; x < CONFIG.canvasWidth; x += 20) {
                const y = CONFIG.canvasHeight - 100 + 
                         Math.sin(x / 50 + offset) * 30 + 
                         Math.cos(x / 30 + this.time) * 20;
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.strokeStyle = i % 2 === 0 ? this.theme.colors.primary + '20' : this.theme.colors.secondary + '20';
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
    drawCardBase() {
        const cardX = 50;
        const cardY = 50;
        const cardWidth = CONFIG.canvasWidth - 100;
        const cardHeight = CONFIG.canvasHeight - 100;
        const radius = 40;
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 30;
        this.ctx.shadowOffsetY = 0;
        const cardGradient = this.ctx.createLinearGradient(
            cardX, cardY, 
            cardX + cardWidth, cardY + cardHeight
        );
        cardGradient.addColorStop(0, this.theme.colors.card);
        cardGradient.addColorStop(1, this.theme.colors.background[1] + 'CC');
        this.ctx.fillStyle = cardGradient;
        this.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.save();
        const pulseIntensity = Math.sin(this.time * 3) * 0.2 + 0.8;
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 20 * pulseIntensity;
        this.ctx.strokeStyle = this.theme.colors.primary;
        this.ctx.lineWidth = 4;
        this.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
        this.ctx.stroke();
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = this.theme.colors.secondary;
        this.ctx.lineWidth = 2;
        this.roundRect(cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4, radius - 2);
        this.ctx.stroke();
        this.ctx.restore();
        this.drawCornerAccents(cardX, cardY, cardWidth, cardHeight);
    }
    drawCornerAccents(x, y, width, height) {
        const size = 30;
        this.ctx.save();
        this.ctx.strokeStyle = this.theme.colors.accent;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x + size, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - size, y);
        this.ctx.lineTo(x + width, y);
        this.ctx.lineTo(x + width, y + size);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height - size);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x + size, y + height);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - size, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x + width, y + height - size);
        this.ctx.stroke();
        this.ctx.restore();
    }
    async drawAvatar() {
        const avatarX = 210;
        const avatarY = 210;
        const avatarSize = 230;
        try {
            const avatarUrl = await AvatarService.getAvatarUrl(
                this.data.uid,
                avatarSize * 2,
            );
            const avatarImage = await loadImage(avatarUrl);
            this.ctx.save();
            const pulseIntensity = Math.sin(this.time * 4) * 0.3 + 0.7;
            this.ctx.shadowColor = this.theme.colors.primary;
            this.ctx.shadowBlur = 30 * pulseIntensity;
            this.ctx.beginPath();
            this.ctx.arc(avatarX, avatarY, avatarSize / 2 + 8, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.theme.colors.primary;
            this.ctx.lineWidth = 6;
            this.ctx.stroke();
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.theme.colors.secondary;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(
                avatarImage,
                avatarX - avatarSize / 2,
                avatarY - avatarSize / 2,
                avatarSize,
                avatarSize,
            );
            this.ctx.restore();
            this.ctx.save();
            const rotation = this.time * 0.5;
            for (let i = 0; i < 3; i++) {
                const ringSize = avatarSize / 2 + 20 + i * 10;
                const opacity = 0.2 - i * 0.05;
                this.ctx.beginPath();
                this.ctx.arc(avatarX, avatarY, ringSize, rotation, rotation + Math.PI * 1.5);
                this.ctx.strokeStyle = this.theme.colors.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            this.ctx.restore();
        } catch (error) {
            console.log("Avatar draw failed:", error.message);
            this.drawFallbackAvatar(avatarX, avatarY, avatarSize);
        }
    }
    drawFallbackAvatar(x, y, size) {
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size / 2);
        gradient.addColorStop(0, this.theme.colors.primary);
        gradient.addColorStop(0.5, this.theme.colors.secondary);
        gradient.addColorStop(1, this.theme.colors.accent);
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 30;
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.save();
        this.ctx.shadowColor = '#FFFFFF';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = "bold 80px Poppins-Bold, Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        const initial = this.data.name.charAt(0).toUpperCase();
        this.ctx.fillText(initial, x, y);
        this.ctx.restore();
    }
    drawUserInfo() {
        const startX = 400;
        const startY = 150;
        const displayName =
            this.data.name.length > 20
                ? this.data.name.substring(0, 18) + "..."
                : this.data.name;
        this.ctx.font = "bold 60px Poppins-Bold, Arial";
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        this.ctx.fillText(displayName, startX + 3, startY + 3);
        const nameGradient = this.ctx.createLinearGradient(
            startX, startY - 20,
            startX + 400, startY + 20
        );
        nameGradient.addColorStop(0, this.theme.colors.primary);
        nameGradient.addColorStop(0.5, this.theme.colors.secondary);
        nameGradient.addColorStop(1, this.theme.colors.accent);
        this.ctx.fillStyle = nameGradient;
        this.ctx.fillText(displayName, startX, startY);
        this.ctx.font = "20px Poppins-Regular, Arial";
        this.ctx.fillStyle = this.theme.colors.text + 'CC';
        this.ctx.fillText(`ID: ${this.data.uid}`, startX, startY + 35);
        this.ctx.font = "22px Poppins-SemiBold, Arial";
        const genderData = this.data.gender;
        let genderDisplay = "Unknown";
        let genderIcon = "❓";
        const normalizedGender =
            typeof genderData === "string"
                ? genderData.toUpperCase()
                : genderData;
        if (normalizedGender === 1 || normalizedGender === "FEMALE") {
            genderDisplay = "Female";
            genderIcon = "👩";
        } else if (normalizedGender === 2 || normalizedGender === "MALE") {
            genderDisplay = "Male";
            genderIcon = "👨";
        } else if (typeof genderData === "string" && genderData.length > 0) {
            genderDisplay =
                genderData.charAt(0).toUpperCase() +
                genderData.slice(1).toLowerCase();
            genderIcon = "👤";
        }
        const infoLines = [
            { icon: "📧", text: `@${this.data.username}` },
            { icon: genderIcon, text: genderDisplay },
            { icon: "⭐", text: `Level ${this.data.level}` },
        ];
        infoLines.forEach((line, index) => {
            const y = startY + 65 + index * 30;
            this.ctx.font = "24px Arial";
            this.ctx.fillStyle = this.theme.colors.primary;
            this.ctx.fillText(line.icon, startX, y);
            this.ctx.font = "20px Poppins-Regular, Arial";
            this.ctx.fillStyle = this.theme.colors.text + 'CC';
            this.ctx.fillText(line.text, startX + 35, y);
        });
    }
    drawLevelProgress() {
        const barX = 400;
        const barY = 280;
        const barWidth = 600;
        const barHeight = 40;
        const radius = 20;
        const progress = this.data.exp / this.data.neededExp;
        const progressWidth = Math.max(barWidth * progress, 10);
        this.ctx.save();
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        this.roundRect(barX, barY, barWidth, barHeight, radius);
        this.ctx.fill();
        this.ctx.restore();
        const progressGradient = this.ctx.createLinearGradient(
            barX, barY,
            barX + barWidth, barY + barHeight
        );
        progressGradient.addColorStop(0, this.theme.colors.primary);
        progressGradient.addColorStop(0.5, this.theme.colors.secondary);
        progressGradient.addColorStop(1, this.theme.colors.accent);
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = progressGradient;
        this.roundRect(barX, barY, progressWidth, barHeight, radius);
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.save();
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        this.ctx.shadowBlur = 5;
        this.ctx.font = "bold 20px Poppins-SemiBold, Arial";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        const expText = `${formatNumber(this.data.exp)} / ${formatNumber(this.data.neededExp)} EXP`;
        this.ctx.fillText(expText, barX + barWidth / 2, barY + barHeight / 2);
        this.ctx.restore();
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 10;
        this.ctx.font = "bold 24px Poppins-Bold, Arial";
        this.ctx.fillStyle = this.theme.colors.primary;
        this.ctx.textAlign = "right";
        this.ctx.fillText(
            `${(progress * 100).toFixed(1)}%`,
            barX + barWidth + 70,
            barY + barHeight / 2
        );
        this.ctx.restore();
    }
    drawStatsGrid() {
        const stats = [
            {
                icon: "💰",
                label: "Money",
                value: formatNumber(this.data.money),
                color: this.theme.colors.success,
                bgColor: this.theme.colors.success + '20',
            },
            {
                icon: "💬",
                label: "Messages",
                value: formatNumber(this.data.totalMessages),
                color: this.theme.colors.primary,
                bgColor: this.theme.colors.primary + '20',
            },
            {
                icon: "⚡",
                label: "Total EXP",
                value: formatNumber(this.data.totalExp),
                color: this.theme.colors.warning,
                bgColor: this.theme.colors.warning + '20',
            },
            {
                icon: "📊",
                label: "EXP/Day",
                value: formatNumber(this.data.expPerDay || 0),
                color: this.theme.colors.accent,
                bgColor: this.theme.colors.accent + '20',
            },
        ];
        const startX = 400;
        const startY = 350;
        const cardWidth = 280;
        const cardHeight = 100;
        const gap = 20;
        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = startX + col * (cardWidth + gap);
            const y = startY + row * (cardHeight + gap);
            this.ctx.save();
            const cardGradient = this.ctx.createLinearGradient(
                x, y,
                x + cardWidth, y + cardHeight
            );
            cardGradient.addColorStop(0, stat.bgColor);
            cardGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
            this.ctx.fillStyle = cardGradient;
            this.roundRect(x, y, cardWidth, cardHeight, 20);
            this.ctx.fill();
            this.ctx.shadowColor = stat.color;
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = stat.color + '80';
            this.ctx.lineWidth = 2;
            this.roundRect(x, y, cardWidth, cardHeight, 20);
            this.ctx.stroke();
            this.ctx.restore();
            this.ctx.save();
            this.ctx.shadowColor = stat.color;
            this.ctx.shadowBlur = 15;
            this.ctx.font = "36px Arial";
            this.ctx.fillStyle = stat.color;
            this.ctx.textAlign = "left";
            this.ctx.fillText(stat.icon, x + 20, y + 50);
            this.ctx.restore();
            this.ctx.font = "16px Poppins-SemiBold, Arial";
            this.ctx.fillStyle = this.theme.colors.text + 'AA';
            this.ctx.fillText(stat.label, x + 70, y + 30);
            const valueGradient = this.ctx.createLinearGradient(
                x + 70, y + 40,
                x + 70, y + 70
            );
            valueGradient.addColorStop(0, stat.color);
            valueGradient.addColorStop(1, this.theme.colors.text);
            this.ctx.font = "bold 26px Poppins-Bold, Arial";
            this.ctx.fillStyle = valueGradient;
            this.ctx.fillText(stat.value, x + 70, y + 65);
        });
    }
    drawRankInfo() {
        const rankX = 1000;
        const rankY = 350;
        const rankWidth = 300;
        const rankHeight = 200;
        this.ctx.save();
        const rankGradient = this.ctx.createLinearGradient(
            rankX, rankY,
            rankX + rankWidth, rankY + rankHeight
        );
        rankGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        rankGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        this.ctx.fillStyle = rankGradient;
        this.roundRect(rankX, rankY, rankWidth, rankHeight, 20);
        this.ctx.fill();
        const pulseIntensity = Math.sin(this.time * 3) * 0.2 + 0.8;
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 15 * pulseIntensity;
        this.ctx.strokeStyle = this.theme.colors.primary;
        this.ctx.lineWidth = 3;
        this.roundRect(rankX, rankY, rankWidth, rankHeight, 20);
        this.ctx.stroke();
        this.ctx.restore();
        this.ctx.save();
        this.ctx.font = "24px Poppins-Bold, Arial";
        this.ctx.fillStyle = this.theme.colors.text;
        this.ctx.textAlign = "center";
        this.ctx.fillText("🏆 GLOBAL RANK", rankX + rankWidth / 2, rankY + 40);
        this.ctx.restore();
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 25;
        this.ctx.font = "bold 60px Poppins-Bold, Arial";
        const textGradient = this.ctx.createLinearGradient(
            rankX, rankY + 70,
            rankX + rankWidth, rankY + 120
        );
        textGradient.addColorStop(0, this.theme.colors.primary);
        textGradient.addColorStop(0.5, this.theme.colors.secondary);
        textGradient.addColorStop(1, this.theme.colors.accent);
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText(
            `#${this.data.expRank}`,
            rankX + rankWidth / 4,
            rankY + 100
        );
        this.ctx.restore();
        const totalUsers = this.data.totalUsers;
        const rankPercentile = ((totalUsers - this.data.expRank + 1) / totalUsers * 100).toFixed(1);
        const details = [
            { label: "📊 Top", value: `${rankPercentile}%`, color: this.theme.colors.primary },
            { label: "💰 Money Rank", value: `#${this.data.moneyRank}`, color: this.theme.colors.success },
            { label: "👥 Total Users", value: formatNumber(totalUsers), color: this.theme.colors.accent },
        ];
        details.forEach((detail, index) => {
            const y = rankY + 140 + index * 25;
            this.ctx.font = "16px Poppins-SemiBold, Arial";
            this.ctx.fillStyle = this.theme.colors.text + 'CC';
            this.ctx.textAlign = "left";
            this.ctx.fillText(detail.label, rankX + 20, y);
            const valueGradient = this.ctx.createLinearGradient(
                rankX + rankWidth - 50, y - 10,
                rankX + rankWidth - 50, y + 10
            );
            valueGradient.addColorStop(0, detail.color);
            valueGradient.addColorStop(1, this.theme.colors.text);

            this.ctx.font = "16px Poppins-Bold, Arial";
            this.ctx.fillStyle = valueGradient;
            this.ctx.textAlign = "right";
            this.ctx.fillText(detail.value, rankX + rankWidth - 20, y);
        });
    }
    drawFooter() {
        const footerY = CONFIG.canvasHeight - 20;
        const bdtTime = moment().tz("Asia/Dhaka").format("YYYY-MM-DD HH:mm:ss");
        const footerText = `📅 ${bdtTime}  •  💻ɴᴏᴏʙ ᴄᴏʀᴇ⚡ `;
        this.ctx.save();
        this.ctx.font = "18px Poppins-Regular, Arial";
        this.ctx.fillStyle = this.theme.colors.text + 'AA';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(footerText, CONFIG.canvasWidth / 2, footerY);
        this.ctx.restore();
        this.ctx.save();
        this.ctx.shadowColor = this.theme.colors.primary;
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = this.theme.colors.primary + '80';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(CONFIG.canvasWidth / 2 - 250, footerY - 15);
        this.ctx.lineTo(CONFIG.canvasWidth / 2 - 150, footerY - 15);
        this.ctx.stroke();
        this.ctx.strokeStyle = this.theme.colors.secondary + '80';
        this.ctx.beginPath();
        this.ctx.moveTo(CONFIG.canvasWidth / 2 + 150, footerY - 15);
        this.ctx.lineTo(CONFIG.canvasWidth / 2 + 250, footerY - 15);
        this.ctx.stroke();
        this.ctx.restore();
    }
    roundRect(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.ctx.arcTo(x, y + height, x, y, radius);
        this.ctx.arcTo(x, y, x + width, y, radius);
        this.ctx.closePath();
    }
}
module.exports = {
    config: {
        name: "rank",
        aliases: ["rk"],
        version: "12.0",
        author: "NC-FAHAD",
        countDown: 5,
        role: 0,
        description: {
            en: "Generate beautiful animated rank cards with enhanced visuals",
        },
        category: "info",
        guide: {
            en: `🎯 RANK COMMAND - ENHANCED EDITION 🎯

Basic Commands:
• {pn} - View your rank card
• {pn} @mention - View mentioned user's rank
• {pn} [user_id] - View specific user's rank
• {pn} [1-10] - Apply theme (1-10)

Theme Commands:
• {pn} themes - List all themes
• {pn} setbg - Set custom background (reply to image)
• {pn} removebg - Remove custom background

Available Themes:
1. Aurora Borealis 🌌
2. Neon Pulse ⚡
3. Sunset Citrus 🌅
4. Ocean Deep 🌊
5. Midnight Royal 👑
6. Forest Emerald 🌿
7. Cherry Blossom 🌸
8. Cyber Void 💀
9. Royal Gold 🏆
10. Galaxy Nebula 🪐

Example Usage:
• {pn} 5 - Use Midnight Royal theme
• {pn} @user 3 - View user with Sunset Citrus theme
• {pn} setbg - Set custom background`,
        },
    },
    ncStart: async function ({
        message,
        event,
        usersData,
        threadsData,
        api,
        args,
    }) {
        try {
            const { senderID, threadID, mentions, messageReply } = event;
            const command = args[0]?.toLowerCase();
            if (command === "help" || command === "guide") {
                return message.reply(this.config.guide.en);
            }
            if (command === "themes" || command === "list") {
                let themeList = "🎨 AVAILABLE THEMES 🎨\n\n";
                THEMES.forEach((theme, index) => {
                    const effects = theme.effects.map(e => {
                        if (e === 'glow') return '✨';
                        if (e === 'stars') return '⭐';
                        if (e === 'pulse') return '💫';
                        if (e === 'particles') return '⚡';
                        return '';
                    }).join(' ');
                    themeList += `${index + 1}. ${theme.name} ${effects}\n`;
                });
                themeList += "\nUse `rank [number]` to apply a theme!";
                return message.reply(themeList);
            }
            if (command === "setbg" || command === "background") {
                if (
                    !messageReply ||
                    !messageReply.attachments ||
                    !messageReply.attachments[0]
                ) {
                    return message.reply(
                        "❌ Please reply to an image message!",
                    );
                }
                const attachment = messageReply.attachments[0];
                if (attachment.type !== "photo") {
                    return message.reply("❌ Please reply to a photo!");
                }
                try {
                    const userData = (await usersData.get(senderID)) || {};
                    userData.rankBackground = attachment.url;
                    await usersData.set(senderID, userData);
                    return message.reply(
                        "✅ Custom background set successfully!",
                    );
                } catch (error) {
                    return message.reply("❌ Failed to set background!");
                }
            }
            if (command === "removebg" || command === "deletebg") {
                try {
                    const userData = (await usersData.get(senderID)) || {};
                    if (userData.rankBackground) {
                        delete userData.rankBackground;
                        await usersData.set(senderID, userData);
                        return message.reply("✅ Background removed!");
                    }
                    return message.reply("ℹ️ No custom background found.");
                } catch (error) {
                    return message.reply("❌ Failed to remove background!");
                }
            }
            let targetID;
            if (messageReply) {
                targetID = messageReply.senderID;
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
            } else if (args[0] && !isNaN(args[0]) && parseInt(args[0]) > 1000) {
                targetID = args[0];
            } else {
                targetID = senderID;
            }
            let themeIndex = Math.floor(Math.random() * THEMES.length);
            let themeArgIndex = -1;
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (
                    !isNaN(arg) &&
                    parseInt(arg) >= 1 &&
                    parseInt(arg) <= THEMES.length
                ) {
                    themeIndex = parseInt(arg) - 1;
                    themeArgIndex = i;
                    break;
                }
            }
            const filteredArgs = args.filter((_, index) => index !== themeArgIndex);
            if (
                filteredArgs[0] &&
                !isNaN(filteredArgs[0]) &&
                parseInt(filteredArgs[0]) > 1000
            ) {
                targetID = filteredArgs[0];
            }
            const [userData, threadData, allUsersData] = await Promise.all([
                usersData.get(targetID).catch(() => null),
                threadsData.get(threadID).catch(() => ({})),
                usersData.getAll().catch(() => []),
            ]);
            if (!userData) {
                await message.unsend(loadingMsg.messageID);
                return message.reply("❌ User data not found!");
            }
            let userInfo = {};
            try {
                const fbInfo = await api.getUserInfo(targetID);
                userInfo = fbInfo[targetID] || {};
            } catch (error) {
                console.log(
                    "Facebook API failed, using basic info:",
                    error.message,
                );
                userInfo = {
                    name: userData.name || `User_${targetID}`,
                    gender: 0,
                    vanity: targetID,
                };
            }
            const sortedExp = [...allUsersData]
                .filter((u) => u && u.exp > 0)
                .sort((a, b) => (b.exp || 0) - (a.exp || 0));
            const expRank =
                sortedExp.findIndex((u) => u.userID === targetID) + 1 ||
                allUsersData.length;
            const sortedMoney = [...allUsersData]
                .filter((u) => u && u.money > 0)
                .sort((a, b) => (b.money || 0) - (a.money || 0));
            const moneyRank =
                sortedMoney.findIndex((u) => u.userID === targetID) + 1 ||
                allUsersData.length;
            const threadMembers = threadData?.members || [];
            const threadMember =
                threadMembers.find((m) => m && m.userID === targetID) || {};
            const nickname =
                threadData?.nicknames?.[targetID] ||
                userInfo.name ||
                userData.name ||
                "User";
            const exp = userData.exp || 0;
            const level = expToLevel(exp);
            const currentLevelExp = levelToExp(level);
            const nextLevelExp = levelToExp(level + 1);
            const progressExp = Math.max(0, exp - currentLevelExp);
            const neededExp = Math.max(1, nextLevelExp - currentLevelExp);
            const now = Date.now();
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            const expPerDay =
                userData.lastActive && userData.lastActive > thirtyDaysAgo
                    ? Math.round((exp || 0) / 30)
                    : 0;
            const genderData = userInfo.gender || userData.gender || 0;
            const renderData = {
                uid: targetID,
                name: userInfo.name || userData.name || "User",
                nickname: nickname,
                username:
                    userInfo.vanity |
                    userInfo.profileUrl?.split("/").pop() ||
                    userInfo.name?.replace(/\s+/g, ".")
                     .toLowerCase()
                     .replace(/[^a-z0-9.]/g, "") ||
                    targetID,
                gender: genderData,
                level: level,
                exp: progressExp,
                neededExp: neededExp,
                totalExp: exp,
                money: userData.money || 0,
                totalMessages: threadMember.count || 0,
                expPerDay: expPerDay,
                expRank: expRank,
                moneyRank: moneyRank,
                totalUsers: sortedExp.length || allUsersData.length,
                customBg: userData.rankBackground,
                themeIndex: themeIndex,
            };
            ensureDir(CONFIG.cacheDir);
            const fileName = `rank_${targetID}_${Date.now()}.png`;
            const filePath = path.join(CONFIG.cacheDir, fileName);
            const renderer = new RankCardRenderer(renderData);
            const buffer = await renderer.render();
            fs.writeFileSync(filePath, buffer);
            const isSelf = targetID === senderID;
            const rankEmoji =
                expRank <= 3 ? ["🥇", "🥈", "🥉"][expRank - 1] || "🏆" : "📊";
            const theme = THEMES[themeIndex];
            const topPercent = ((renderData.totalUsers - expRank + 1) / renderData.totalUsers * 100).toFixed(1);
            const responseText = isSelf
                ? `✨ YOUR ENHANCED RANK CARD ✨\n\n` +
                  `${rankEmoji} Global Rank: #${expRank} (Top ${topPercent}%)\n` +
                  `⭐ Level: ${level}\n` +
                  `⚡ Total EXP: ${formatNumber(renderData.totalExp)}\n` +
                  `📈 Progress: ${((renderData.exp / renderData.neededExp) * 100).toFixed(1)}%\n` +
                  `💰 Money: ${formatNumber(renderData.money)}\n` +
                  `💬 Messages: ${formatNumber(renderData.totalMessages)}\n` +
                  `🎨 Theme: ${theme.name}`
                : `✨ ${renderData.name}'s RANK CARD ✨\n\n` +
                  `${rankEmoji} Global Rank: #${expRank}\n` +
                  `⭐ Level: ${level}\n` +
                  `⚡ Total EXP: ${formatNumber(renderData.totalExp)}\n` +
                  `📈 Progress: ${((renderData.exp / renderData.neededExp) * 100).toFixed(1)}%\n` +
                  `💰 Money: ${formatNumber(renderData.money)}\n` +
                  `💬 Messages: ${formatNumber(renderData.totalMessages)}\n` +
                  `🎨 Theme: ${theme.name}`;
            await message.reply({
                body: responseText,
                attachment: fs.createReadStream(filePath),
            });
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                }
            }, 30000);
        } catch (error) {
            console.error("Rank command error:", error);
            let errorMessage = "❌ Failed to generate rank card!\n\n";
            if (
                error.message.includes("avatar") ||
                error.message.includes("profile")
            ) {
                errorMessage +=
                    "Possible issues:\n" +
                    "• Facebook API temporary issue\n" +
                    "• User profile privacy settings\n" +
                    "• Network connectivity problem\n\n" +
                    "Try:\n" +
                    "• Waiting a few minutes\n" +
                    "• Using a different user\n" +
                    "• Checking internet connection";
            } else if (error.message.includes("timeout")) {
                errorMessage +=
                    "Request timeout. The server might be busy. Please try again in a moment.";
            } else if (error.message.includes("token")) {
                errorMessage +=
                    "Facebook token issue. Please contact the bot administrator.";
            } else {
                errorMessage += `Error: ${error.message}`;
            }
            return message.reply(errorMessage);
        }
    },
    ncPrefix: async function ({ event, usersData, threadsData }) {
        if (!event.isGroup || event.senderID === global.BeatriceBC?.botID) return;
        const { senderID, threadID } = event;
        try {
            const user = (await usersData.get(senderID)) || {};
            const currentExp = user.exp || 0;
            const baseExp = 2; 
            const randomBonus =
                Math.random() < 0.15 ? Math.floor(Math.random() * 5) + 1 : 0; 
            const newExp = currentExp + baseExp + randomBonus;
            const currentMoney = user.money || 0;
            const moneyGain =
                Math.random() < 0.08 ? Math.floor(Math.random() * 15) + 1 : 0; 
            const newMoney = currentMoney + moneyGain;
            await usersData.set(senderID, {
                exp: newExp,
                money: newMoney,
                lastActive: Date.now(),
            });
            const thread = (await threadsData.get(threadID)) || {};
            if (!Array.isArray(thread.members)) {
                thread.members = [];
            }
            const memberIndex = thread.members.findIndex(
                (m) => m && m.userID === senderID,
            );
            if (memberIndex >= 0) {
                thread.members[memberIndex].count =
                    (thread.members[memberIndex].count || 0) + 1;
                thread.members[memberIndex].lastMessage = Date.now();
            } else {
                thread.members.push({
                    userID: senderID,
                    name: user.name || `User_${senderID}`,
                    count: 1,
                    lastMessage: Date.now(),
                });
            }
            await threadsData.set(threadID, { members: thread.members });
            const oldLevel = expToLevel(currentExp);
            const newLevel = expToLevel(newExp);
            if (newLevel > oldLevel && newLevel % 10 === 0) {
            }
        } catch (error) {
            console.error("ncPrefix error:", error);
        }
    },
};