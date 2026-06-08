"use strict";

/*
 *  Self-Adaptive Environment Manager
 *  ─────────────────────────────────
 *  Runs once at boot. It probes every "sensitive" library, picks the best
 *  available implementation, and exposes a unified API on `global`:
 *
 *      global.db          ← unified DB adapter (better-sqlite3 → sqlite3 → sql.js → JSON)
 *      global.gfx         ← unified canvas adapter (canvas → @napi-rs/canvas → skia → cloud → noop)
 *      global.envMgr      ← { db, gfx, port, install, report }
 *
 *  It also installs a Module hook so that *existing* code calling
 *  `require("canvas")` transparently receives the adaptive backend, even when
 *  the native node-canvas package is not installed or fails to compile.
 */

const Module = require("module");
const path = require("path");

const { tryInstall, tryRequire, BOT_ROOT } = require("./jitInstall");
const dbAdapter = require("./dbAdapter");
const gfxAdapter = require("./gfxAdapter");
const portAdapter = require("./portAdapter");

let _initialized = false;

function banner(line) {
        console.log("[EnvMgr] " + line);
}

function init() {
        if (_initialized) return global.envMgr;
        _initialized = true;

        const t0 = Date.now();
        banner("──────────── Bootstrap diagnostic ────────────");

        // ── 1. Database ─────────────────────────────────────────────────
        banner("Checking SQLite stack...");
        const db = dbAdapter.init();
        for (const step of db._trail) banner("  • " + step);
        banner(`  ✓ DB backend selected: ${db._backend}`);
        global.db = db;

        // ── 2. Graphics ─────────────────────────────────────────────────
        banner("Checking Canvas stack...");
        const gfx = gfxAdapter.init();
        for (const step of gfx._trail) banner("  • " + step);
        banner(`  ✓ Graphics backend selected: ${gfx._backend}`);
        global.gfx = gfx;

        // ── 3. Module hook so legacy `require("canvas")` works everywhere
        installCanvasHook(gfx);

        // ── 4. expose helpers
        global.envMgr = {
                db,
                gfx,
                install: tryInstall,
                tryRequire,
                resolvePort: portAdapter.findAvailablePort,
                report: () => ({
                        db: { backend: db._backend, trail: db._trail },
                        gfx: { backend: gfx._backend, trail: gfx._trail },
                        bootMs: Date.now() - t0
                })
        };

        banner(`Bootstrap complete in ${Date.now() - t0}ms`);
        banner("──────────────────────────────────────────────");
        return global.envMgr;
}

/*
 * Module-loader hook: intercept `require("canvas")` (and a couple of related
 * sub-paths) so that callers receive our adaptive `gfx` object. This lets the
 * dozens of pre-existing `const Canvas = require("canvas")` lines in
 * scripts/cmds/** continue to work even when node-canvas is not installed.
 */
function installCanvasHook(gfx) {
        const originalRequire = Module.prototype.require;

        Module.prototype.require = function patchedRequire(request) {
                if (request === "canvas") {
                        // Try the real package first; if it throws (missing native
                        // binary, broken Cairo, etc.) fall through to the adapter.
                        try {
                                return originalRequire.apply(this, arguments);
                        } catch (e) {
                                if (!installCanvasHook._warned) {
                                        console.log(
                                                "[EnvMgr] require('canvas') intercepted → adaptive backend (" +
                                                        gfx._backend +
                                                        ")"
                                        );
                                        installCanvasHook._warned = true;
                                }
                                return gfx;
                        }
                }
                return originalRequire.apply(this, arguments);
        };
}

module.exports = { init };
