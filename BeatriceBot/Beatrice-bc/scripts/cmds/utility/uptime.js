const os = require('os');
const pidusage = require('pidusage');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: 'uptime',
        aliases: ["up", "upt"],
        version: '1.2',
        author: "𝑵𝑪-𝒀𝑬𝑨𝑺𝑰𝑵",
        countDown: 5,
        role: 0,
        shortDescription: 'Show all Information of Uptime',
        longDescription: 'Show all uptime information of bot including system stats',
        category: 'info',
        guide: '{p}uptime'
    },

    byte2mb(bytes) {
        if (bytes === 0 || bytes === undefined) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let l = 0, n = parseInt(bytes, 10) || 0;
        while (n >= 1024 && ++l) n /= 1024;
        return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`;
    },

    getUptime(seconds) {
        if (!seconds || seconds <= 0) return '0s';
        const months = Math.floor(seconds / 2592000);
        const days = Math.floor((seconds % 2592000) / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (months > 0) parts.push(`${months}M`);
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    },

    async getDiskSpaceInfo() {
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption');
                const lines = stdout.trim().split('\n').slice(1);
                let total = 0, used = 0, free = 0;
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const freeSpace = parseInt(parts[1]) || 0;
                        const totalSpace = parseInt(parts[2]) || 0;
                        total += totalSpace;
                        used += (totalSpace - freeSpace);
                        free += freeSpace;
                    }
                }
                return { total: this.byte2mb(total), used: this.byte2mb(used), free: this.byte2mb(free), percent: total > 0 ? ((used / total) * 100).toFixed(1) : '0' };
            } else {
                const { stdout } = await execPromise('df -h /');
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const parts = lastLine.trim().split(/\s+/);
                return { total: parts[1], used: parts[2], free: parts[3], percent: parts[4].replace('%', '') };
            }
        } catch {
            return { total: 'N/A', used: 'N/A', free: 'N/A', percent: 'N/A' };
        }
    },

    async getCpuUsage() {
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execPromise('wmic cpu get loadpercentage');
                const lines = stdout.trim().split('\n');
                return lines.length > 1 ? (parseInt(lines[1].trim()) || 0) : 0;
            } else {
                const { stdout } = await execPromise("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
                return parseFloat(stdout.trim()) || 0;
            }
        } catch { return 0; }
    },

    getInstalledPackages() {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(packagePath)) {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                return Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length;
            }
            return 0;
        } catch { return 0; }
    },

    ncStart: async function({ api, event, usersData, threadsData }) {
        try {
            const startTime = Date.now();
            
            const [usage, allUsers, allThreads, diskSpaceInfo, cpuUsage] = await Promise.all([
                pidusage(process.pid).catch(() => ({ memory: 0 })),
                usersData.getAll().catch(() => []),
                threadsData.getAll().catch(() => []),
                this.getDiskSpaceInfo(),
                this.getCpuUsage()
            ]);

            const uptimeSeconds = Math.floor(process.uptime());
            const totalMemory = this.byte2mb(os.totalmem());
            const freeMemory = this.byte2mb(os.freemem());
            const usedMemory = this.byte2mb(usage.memory || 0);
            const memoryPercent = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);

            const msg = `
╔═══════════════════════════╗
║      🖥️ SYSTEM STATUS     ║
╠═══════════════════════════╣
║ 📅 Date: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}
║ ⏱️ Bot Uptime: ${this.getUptime(uptimeSeconds)}
║ 💻 CPU Usage: ${cpuUsage}%
║ 🎯 RAM: ${usedMemory} / ${totalMemory} (${memoryPercent}%)
║ 💾 Disk: ${diskSpaceInfo.used} / ${diskSpaceInfo.total}
║ 📊 Users: ${allUsers.length} | Groups: ${allThreads.length}
║ ⚡ Speed: ${Date.now() - startTime}ms
╚═══════════════════════════╝`.trim();

            return api.sendMessage(msg, event.threadID, event.messageID);
        } catch (e) {
            return api.sendMessage(`Error: ${e.message}`, event.threadID);
        }
    }
};