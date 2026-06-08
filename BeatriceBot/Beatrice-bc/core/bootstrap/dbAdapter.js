"use strict";

/*
 * Adaptive Database Engine
 * ────────────────────────
 * Levels:
 *   L1  better-sqlite3   (fast synchronous, prebuilt for most platforms)
 *   L2  sqlite3          (classic, async — wrapped to look sync)
 *   L3  sql.js           (WebAssembly — runs anywhere, no native build)
 *   L4  lowdb / JSON     (last-resort key/value persistence)
 *
 * Public surface (the unified `global.db`):
 *   db.exec(sql)
 *   db.run(sql, params?)            → { changes, lastInsertRowid }
 *   db.get(sql, params?)            → row | undefined
 *   db.all(sql, params?)            → row[]
 *   db.prepare(sql)                 → { run, get, all }
 *   db.close()
 *   db.kv                           → { get(k), set(k,v), del(k), all() } (always works, even on JSON)
 *   db._backend                     → 'better-sqlite3' | 'sqlite3' | 'sql.js' | 'json'
 *   db._trail                       → string[] (diagnostic trail)
 */

const fs = require("fs");
const path = require("path");
const { tryRequire, BOT_ROOT } = require("./jitInstall");

const DEFAULT_DB_FILE = path.join(BOT_ROOT, "core", "database", "data", "adaptive.sqlite");
const JSON_FALLBACK_FILE = path.join(BOT_ROOT, "core", "database", "data", "adaptive.kv.json");

function ensureDir(p) {
        try {
                fs.mkdirSync(path.dirname(p), { recursive: true });
        } catch (_) {}
}

/* ─── Wrappers ─────────────────────────────────────────────────────────── */

function wrapBetterSqlite3(BSQL, file, trail) {
        ensureDir(file);
        const db = new BSQL(file);
        db.pragma("journal_mode = WAL");
        ensureKVTable({ exec: (s) => db.exec(s) });

        const adapter = {
                _backend: "better-sqlite3",
                _trail: trail,
                _native: db,
                exec: (sql) => db.exec(sql),
                run: (sql, params) => {
                        const s = db.prepare(sql);
                        return params == null ? s.run() : s.run(params);
                },
                get: (sql, params) => {
                        const s = db.prepare(sql);
                        return params == null ? s.get() : s.get(params);
                },
                all: (sql, params) => {
                        const s = db.prepare(sql);
                        return params == null ? s.all() : s.all(params);
                },
                prepare: (sql) => {
                        const s = db.prepare(sql);
                        return {
                                run: (p) => (p == null ? s.run() : s.run(p)),
                                get: (p) => (p == null ? s.get() : s.get(p)),
                                all: (p) => (p == null ? s.all() : s.all(p))
                        };
                },
                close: () => db.close()
        };
        adapter.kv = makeKV(adapter);
        return adapter;
}

function wrapSqlite3(SQLITE3, file, trail) {
        ensureDir(file);
        // Synchronous behaviour is faked by deasync-style polling — but to keep
        // the dependency graph minimal we instead rely on sqlite3 being already
        // synchronous when called via `.serialize()` + immediate callbacks.
        // Practically, almost every call site in the bot already runs from an
        // async context (Sequelize), so we expose true async helpers here too,
        // but the synchronous shim is a best-effort placeholder used by simple
        // KV-style calls.
        const db = new SQLITE3.Database(file);

        function execAsync(sql, params = []) {
                return new Promise((resolve, reject) => {
                        db.run(sql, params, function (err) {
                                if (err) return reject(err);
                                resolve({ changes: this.changes, lastInsertRowid: this.lastID });
                        });
                });
        }
        function getAsync(sql, params = []) {
                return new Promise((resolve, reject) => {
                        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
                });
        }
        function allAsync(sql, params = []) {
                return new Promise((resolve, reject) => {
                        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
                });
        }

        // Best-effort sync façade. We try `deasync` first (proper libuv tick),
        // and fall back to a sub-process spin that gives libuv a chance to
        // process IO. Used only for low-volume KV reads/writes.
        let _busyAwait;
        try {
                const deasync = tryRequire("deasync", { jit: false });
                if (deasync && typeof deasync.runLoopOnce === "function") {
                        _busyAwait = (p) => {
                                let done = false, val, err;
                                p.then(v => { val = v; done = true; }, e => { err = e; done = true; });
                                while (!done) deasync.runLoopOnce();
                                if (err) throw err;
                                return val;
                        };
                }
        } catch (_) {}
        if (!_busyAwait) {
                _busyAwait = (promise) => {
                        let done = false, value, error;
                        promise.then(v => { value = v; done = true; },
                                     e => { error = e; done = true; });
                        const deadline = Date.now() + 5000;
                        while (!done && Date.now() < deadline) {
                                try { require("child_process").spawnSync(process.execPath, ["-e", ""], { timeout: 5 }); } catch (_) {}
                        }
                        if (error) throw error;
                        return value;
                };
        }

        const adapter = {
                _backend: "sqlite3",
                _trail: trail,
                _native: db,
                exec: (sql) => _busyAwait(new Promise((res, rej) => db.exec(sql, (e) => (e ? rej(e) : res())))),
                run: (sql, params) => _busyAwait(execAsync(sql, params || [])),
                get: (sql, params) => _busyAwait(getAsync(sql, params || [])),
                all: (sql, params) => _busyAwait(allAsync(sql, params || [])),
                prepare: (sql) => ({
                        run: (p) => _busyAwait(execAsync(sql, p || [])),
                        get: (p) => _busyAwait(getAsync(sql, p || [])),
                        all: (p) => _busyAwait(allAsync(sql, p || []))
                }),
                close: () => db.close(),
                runAsync: execAsync,
                getAsync,
                allAsync
        };
        try {
                adapter.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)");
        } catch (_) {}
        adapter.kv = makeKV(adapter);
        return adapter;
}

function wrapSqlJs(SQL, file, trail) {
        ensureDir(file);
        // SQL.js requires async init. Run it synchronously by spinning the loop.
        const initSqlJs = SQL.default || SQL;
        const sqljs = waitFor(initSqlJs());
        const fileBytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
        const db = fileBytes ? new sqljs.Database(fileBytes) : new sqljs.Database();

        let dirty = false;
        const persist = () => {
                if (!dirty) return;
                try {
                        fs.writeFileSync(file, Buffer.from(db.export()));
                        dirty = false;
                } catch (e) {
                        console.warn("[db/sql.js] persist failed:", e.message);
                }
        };
        // Save every 5s and on exit
        const saver = setInterval(persist, 5000);
        saver.unref && saver.unref();
        process.on("exit", persist);
        process.on("SIGINT", () => {
                persist();
                process.exit(0);
        });

        function rowsFromStmt(sql, params) {
                const stmt = db.prepare(sql);
                if (params != null) stmt.bind(Array.isArray(params) ? params : [params]);
                const out = [];
                while (stmt.step()) out.push(stmt.getAsObject());
                stmt.free();
                return out;
        }

        const adapter = {
                _backend: "sql.js",
                _trail: trail,
                _native: db,
                exec: (sql) => {
                        db.exec(sql);
                        dirty = true;
                },
                run: (sql, params) => {
                        db.run(sql, params == null ? [] : Array.isArray(params) ? params : [params]);
                        dirty = true;
                        return { changes: db.getRowsModified(), lastInsertRowid: undefined };
                },
                get: (sql, params) => {
                        const rows = rowsFromStmt(sql, params);
                        return rows[0];
                },
                all: (sql, params) => rowsFromStmt(sql, params),
                prepare: (sql) => ({
                        run: (p) => {
                                db.run(sql, p == null ? [] : Array.isArray(p) ? p : [p]);
                                dirty = true;
                                return { changes: db.getRowsModified() };
                        },
                        get: (p) => rowsFromStmt(sql, p)[0],
                        all: (p) => rowsFromStmt(sql, p)
                }),
                close: () => {
                        persist();
                        db.close();
                        clearInterval(saver);
                }
        };
        try {
                adapter.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)");
        } catch (_) {}
        adapter.kv = makeKV(adapter);
        return adapter;
}

function wrapJson(file, trail) {
        ensureDir(file);
        let store = {};
        if (fs.existsSync(file)) {
                try {
                        store = JSON.parse(fs.readFileSync(file, "utf8")) || {};
                } catch (_) {
                        store = {};
                }
        }
        let dirty = false;
        const persist = () => {
                if (!dirty) return;
                try {
                        fs.writeFileSync(file, JSON.stringify(store, null, 2));
                        dirty = false;
                } catch (e) {
                        console.warn("[db/json] persist failed:", e.message);
                }
        };
        const saver = setInterval(persist, 5000);
        saver.unref && saver.unref();
        process.on("exit", persist);

        const unsupported = (name) => () => {
                console.warn(`[db/json] ${name}() not supported on JSON fallback — use db.kv.* instead`);
                return name === "all" ? [] : undefined;
        };
        const adapter = {
                _backend: "json",
                _trail: trail,
                _store: store,
                exec: () => {},
                run: unsupported("run"),
                get: unsupported("get"),
                all: unsupported("all"),
                prepare: () => ({
                        run: unsupported("prepare.run"),
                        get: unsupported("prepare.get"),
                        all: unsupported("prepare.all")
                }),
                close: () => {
                        persist();
                        clearInterval(saver);
                }
        };
        adapter.kv = {
                get: (k) => store[k],
                set: (k, v) => {
                        store[k] = v;
                        dirty = true;
                },
                del: (k) => {
                        delete store[k];
                        dirty = true;
                },
                all: () => ({ ...store })
        };
        return adapter;
}

/* ─── KV helper that works on every SQL backend ────────────────────────── */

function ensureKVTable(adapter) {
        try {
                adapter.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)");
        } catch (_) {}
}
function makeKV(adapter) {
        return {
                get: (k) => {
                        const row = adapter.get("SELECT v FROM kv WHERE k = ?", [k]);
                        if (!row) return undefined;
                        try {
                                return JSON.parse(row.v);
                        } catch (_) {
                                return row.v;
                        }
                },
                set: (k, v) => {
                        adapter.run(
                                "INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
                                [k, JSON.stringify(v)]
                        );
                },
                del: (k) => adapter.run("DELETE FROM kv WHERE k = ?", [k]),
                all: () => {
                        const rows = adapter.all("SELECT k, v FROM kv") || [];
                        const out = {};
                        for (const r of rows) {
                                try {
                                        out[r.k] = JSON.parse(r.v);
                                } catch (_) {
                                        out[r.k] = r.v;
                                }
                        }
                        return out;
                }
        };
}

/* ─── Tiny event-loop spinner used to await the SQL.js init promise ──── */

function waitFor(promise) {
        let done = false;
        let value, error;
        promise.then(
                (v) => {
                        value = v;
                        done = true;
                },
                (e) => {
                        error = e;
                        done = true;
                }
        );
        const deadline = Date.now() + 30000;
        while (!done && Date.now() < deadline) {
                // Spin the libuv loop one tick.
                try {
                        require("child_process").spawnSync(process.execPath, ["-e", ""], { timeout: 5 });
                } catch (_) {}
        }
        if (!done) throw new Error("sql.js init timed out");
        if (error) throw error;
        return value;
}

/* ─── Public init() — runs the fallback chain ─────────────────────────── */

function buildAdapter() {
        const trail = [];
        const file = DEFAULT_DB_FILE;

        // L1
        let mod = tryRequire("better-sqlite3", { jit: true });
        if (mod) {
                try {
                        const a = wrapBetterSqlite3(mod, file, trail);
                        trail.push("better-sqlite3 OK");
                        return a;
                } catch (e) {
                        trail.push(`better-sqlite3 failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("better-sqlite3 unavailable");
        }

        // L2
        mod = tryRequire("sqlite3", { jit: true });
        if (mod) {
                try {
                        const a = wrapSqlite3(mod, file, trail);
                        trail.push("sqlite3 OK");
                        return a;
                } catch (e) {
                        trail.push(`sqlite3 failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("sqlite3 unavailable");
        }

        // L3
        mod = tryRequire("sql.js", { jit: true });
        if (mod) {
                try {
                        const a = wrapSqlJs(mod, file, trail);
                        trail.push("sql.js (wasm) OK");
                        return a;
                } catch (e) {
                        trail.push(`sql.js failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("sql.js unavailable");
        }

        // L4
        const a = wrapJson(JSON_FALLBACK_FILE, trail);
        trail.push("JSON fallback OK (read-only SQL, kv only)");
        console.warn("[EnvMgr] DB: degraded to JSON KV mode — SQL queries will be no-ops.");
        return a;
}

let _adapter = null;
function init() {
        if (_adapter) return _adapter;
        _adapter = buildAdapter();
        return _adapter;
}

function get() {
        return _adapter || init();
}

module.exports = { init, get };
