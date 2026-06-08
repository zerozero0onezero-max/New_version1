"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const BOT_ROOT = path.resolve(__dirname, "..", "..");
const attempted = new Set();

function isInstalled(pkgName) {
        try {
                require.resolve(pkgName, { paths: [BOT_ROOT] });
                return true;
        } catch (_) {
                return false;
        }
}

function tryInstall(pkgName, opts = {}) {
        const timeoutMs = opts.timeoutMs || 90000;
        if (attempted.has(pkgName)) return false;
        attempted.add(pkgName);

        if (isInstalled(pkgName)) return true;

        try {
                console.log(`[EnvMgr]   ↳ Just-in-Time install: npm install ${pkgName} ...`);
                execSync(
                        `npm install --prefer-offline --no-audit --no-fund --no-save ${pkgName}`,
                        {
                                cwd: BOT_ROOT,
                                stdio: ["ignore", "pipe", "pipe"],
                                timeout: timeoutMs,
                                env: { ...process.env, npm_config_loglevel: "error" }
                        }
                );
                return isInstalled(pkgName);
        } catch (err) {
                const msg = (err.stderr ? err.stderr.toString() : err.message).slice(0, 200);
                console.log(`[EnvMgr]   ↳ Install of ${pkgName} failed: ${msg.replace(/\s+/g, " ").trim()}`);
                return false;
        }
}

function tryRequire(pkgName, { jit = true } = {}) {
        try {
                return require(require.resolve(pkgName, { paths: [BOT_ROOT] }));
        } catch (_) {
                if (!jit) return null;
                if (tryInstall(pkgName)) {
                        try {
                                return require(require.resolve(pkgName, { paths: [BOT_ROOT] }));
                        } catch (_) {
                                return null;
                        }
                }
                return null;
        }
}

module.exports = { tryInstall, tryRequire, isInstalled, BOT_ROOT };
