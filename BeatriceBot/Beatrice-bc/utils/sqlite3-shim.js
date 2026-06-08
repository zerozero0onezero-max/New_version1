"use strict";
/**
 * utils/sqlite3-shim.js
 *
 * Wraps better-sqlite3 (synchronous API) behind the sqlite3 callback API
 * that Sequelize v6 expects — so the bot works on Node v24 without needing
 * to compile the native sqlite3 bindings.
 *
 * Parameter handling strategy
 * ───────────────────────────
 * Sequelize v6 (sqlite dialect) always sends params as an object
 * {$1: v1, $2: v2, …} even when the original caller used a positional
 * array. The SQL still contains `?` placeholders. better-sqlite3 can't
 * mix `?` SQL with a named-param object, so we:
 *   1. Convert every `?` in the SQL to `$1`, `$2`, … on the fly.
 *   2. Pass the `{$1:, $2:, …}` object directly — better-sqlite3 will
 *      simply ignore any extra `$N` keys that have no matching slot.
 *
 * For genuine array params (e.g. direct calls with `[v1, v2]`) we leave
 * the SQL unchanged and pass the array as-is — better-sqlite3 handles
 * `?` + array natively.
 *
 * What Sequelize v6 sqlite dialect uses from this module:
 *   - Database constructor  : new Database(path, mode, callback)
 *   - OPEN_READWRITE, OPEN_CREATE, OPEN_READONLY constants
 *   - db.serialize(cb)      : calls cb immediately (better-sqlite3 is sync)
 *   - db.run(sql, p, cb)    : execute, callback `this` has lastID + changes
 *   - db.all(sql, p, cb)    : fetch rows array
 *   - db.get(sql, p, cb)    : fetch single row
 *   - db.prepare(sql)       : Statement wrapper
 *   - db.configure(k, v)    : noop / busyTimeout
 *   - db.close(cb)          : close
 */

const BSQLite = require("better-sqlite3");

// ── Constants (same numeric values as real sqlite3) ────────────────────────
const OPEN_READONLY  = 1;
const OPEN_READWRITE = 2;
const OPEN_CREATE    = 4;

// ── Param + SQL normaliser ────────────────────────────────────────────────
/**
 * Given the raw SQL and raw params, returns { sql, params } that
 * better-sqlite3 can accept without errors.
 *
 * Cases:
 *  A) params is null/undefined/empty array  → no-bind, pass []
 *  B) params is a plain Array               → keep SQL + array as-is
 *  C) params is {$1:v1, $2:v2, …}          → replace ? in SQL with $1,$2,…
 *                                             pass object; BS3 ignores extras
 *  D) params is a generic object            → strip leading $/:@ from keys
 *                                             for BS3's named-param style
 */
function _prep(sql, params) {
    // A – no params
    if (params == null) return { sql, params: [] };
    if (Array.isArray(params)) {
        if (params.length === 0) return { sql, params: [] };
        return { sql, params };                                    // B
    }
    if (typeof params !== "object") return { sql, params: [] };

    const keys = Object.keys(params);
    if (keys.length === 0) return { sql, params: [] };

    // C – Sequelize's $N positional pattern: {$1: v1, $2: v2, …}
    //   better-sqlite3 named-param convention: `$N` in SQL → key `N` (no sigil)
    //   So we: replace ? → $1,$2,… in SQL  AND  strip $ from keys.
    //   Extra key/slot mismatches are silently ignored by BS3.
    if (keys.every(k => /^\$\d+$/.test(k))) {
        let newSql = sql;
        if (sql && sql.includes("?")) {
            let counter = 0;
            newSql = sql.replace(/\?/g, () => `$${++counter}`);
        }
        // Strip leading $ so {$1: v} becomes {"1": v}
        const out = {};
        for (const k of keys) out[k.slice(1)] = params[k];
        return { sql: newSql, params: out };
    }

    // D – genuine named params: strip sigil prefixes ($foo/:foo/@foo → foo)
    const out = {};
    for (const k of keys) {
        const name = /^[$:@]/.test(k) ? k.slice(1) : k;
        out[name] = params[k];
    }
    return { sql, params: out };
}

// ── Context object returned as `this` in run() callbacks ─────────────────
function _metaCtx(info) {
    return Object.create(
        { constructor: { name: "Statement" } },
        {
            lastID:  { value: info.lastInsertRowid, enumerable: true },
            changes: { value: info.changes,         enumerable: true },
        }
    );
}

// ── Statement wrapper ─────────────────────────────────────────────────────
class Statement {
    constructor(sql, bsDb) {
        this._sql  = sql;
        this._db   = bsDb;
        this._stmt = null;  // lazy compile so _prep can still rewrite sql
    }

    _compile(sql) {
        // Memoize if sql didn't change, else recompile
        if (!this._stmt || sql !== this._sql) {
            this._sql  = sql;
            this._stmt = this._db.prepare(sql);
        }
        return this._stmt;
    }

    bind() { /* noop — BS3 binds at run/get/all time */ }

    finalize(cb) {
        if (cb) process.nextTick(() => cb(null));
    }

    run(params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql, params: p } = _prep(this._sql, params);
        try {
            const info = this._compile(sql).run(p);
            const ctx  = _metaCtx(info);
            if (cb) process.nextTick(() => cb.call(ctx, null));
        } catch (e) {
            if (cb) process.nextTick(() => cb.call({}, e));
        }
    }

    get(params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql, params: p } = _prep(this._sql, params);
        try {
            const row = this._compile(sql).get(p);
            if (cb) process.nextTick(() => cb(null, row));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e, null));
        }
    }

    all(params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql, params: p } = _prep(this._sql, params);
        try {
            const rows = this._compile(sql).all(p);
            if (cb) process.nextTick(() => cb(null, rows));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e, []));
        }
    }
}

// ── Database wrapper ──────────────────────────────────────────────────────
class Database {
    constructor(filename, mode, cb) {
        // Support: new Database(path, cb)  OR  new Database(path, mode, cb)
        if (typeof mode === "function") { cb = mode; mode = OPEN_READWRITE | OPEN_CREATE; }
        if (!mode) mode = OPEN_READWRITE | OPEN_CREATE;

        this.filename = filename;
        this.uuid     = null;

        try {
            const readOnly = !!(mode & OPEN_READONLY) && !(mode & OPEN_READWRITE);
            this._db = new BSQLite(filename, { readonly: readOnly });
            this._db.pragma("journal_mode = WAL");
            this._db.pragma("busy_timeout = 5000");
            if (cb) process.nextTick(() => cb(null));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e));
            else throw e;
        }
    }

    // Sequelize wraps everything in serialize(); BS3 is already synchronous.
    serialize(cb) {
        if (typeof cb === "function") cb();
    }

    run(sql, params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql: s, params: p } = _prep(sql, params);
        try {
            const info = this._db.prepare(s).run(p);
            const ctx  = _metaCtx(info);
            if (cb) process.nextTick(() => cb.call(ctx, null));
        } catch (e) {
            if (cb) process.nextTick(() => cb.call({}, e));
        }
        return this;
    }

    get(sql, params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql: s, params: p } = _prep(sql, params);
        try {
            const row = this._db.prepare(s).get(p);
            if (cb) process.nextTick(() => cb(null, row));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e, null));
        }
        return this;
    }

    all(sql, params, cb) {
        if (typeof params === "function") { cb = params; params = undefined; }
        const { sql: s, params: p } = _prep(sql, params);
        try {
            const rows = this._db.prepare(s).all(p);
            if (cb) process.nextTick(() => cb(null, rows));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e, []));
        }
        return this;
    }

    prepare(sql) {
        return new Statement(sql, this._db);
    }

    configure(key, value) {
        if (key === "busyTimeout") {
            try { this._db.pragma(`busy_timeout = ${Number(value)}`); } catch (_) {}
        }
    }

    close(cb) {
        try {
            this._db.close();
            if (cb) process.nextTick(() => cb(null));
        } catch (e) {
            if (cb) process.nextTick(() => cb(e));
        }
    }
}

module.exports = {
    Database,
    OPEN_READONLY,
    OPEN_READWRITE,
    OPEN_CREATE,
    verbose() { return module.exports; },
};
