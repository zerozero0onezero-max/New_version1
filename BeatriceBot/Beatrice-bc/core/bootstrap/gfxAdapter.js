"use strict";

/*
 * Adaptive Graphics Engine
 * ────────────────────────
 * Levels:
 *   L1  native `canvas`            (Cairo/Pango — needs system libs)
 *   L2a `@napi-rs/canvas`          (prebuilt napi-rs binary, no system libs)
 *   L2b `skia-canvas`              (prebuilt Skia binary)
 *   L3  cloud APIs (QuickChart for QR codes, no-op for the rest)
 *   L4  graceful no-op             (returns a placeholder canvas + warns)
 *
 * Public surface (mirrors node-canvas):
 *   createCanvas(w, h)
 *   loadImage(src)
 *   Image, ImageData
 *   registerFont(file, opts)
 *   _backend         (string)
 *   generateQR(text, opts)        — convenience helper used by login flow
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { tryRequire } = require("./jitInstall");

function downloadBuffer(url) {
        return new Promise((resolve, reject) => {
                https
                        .get(url, (res) => {
                                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                                        return downloadBuffer(res.headers.location).then(resolve, reject);
                                }
                                if (res.statusCode !== 200) {
                                        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                                }
                                const chunks = [];
                                res.on("data", (c) => chunks.push(c));
                                res.on("end", () => resolve(Buffer.concat(chunks)));
                                res.on("error", reject);
                        })
                        .on("error", reject);
        });
}

function buildAdapter() {
        const trail = [];

        // ── L1: native node-canvas ──────────────────────────────────────────
        let mod = tryRequire("canvas", { jit: false });
        if (mod && typeof mod.createCanvas === "function") {
                try {
                        const c = mod.createCanvas(1, 1);
                        c.getContext("2d");
                        trail.push("native canvas");
                        return wrap(mod, "canvas", trail);
                } catch (e) {
                        trail.push(`native canvas failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("native canvas unavailable");
        }

        // ── L2a: @napi-rs/canvas ────────────────────────────────────────────
        mod = tryRequire("@napi-rs/canvas", { jit: true });
        if (mod && typeof mod.createCanvas === "function") {
                try {
                        const c = mod.createCanvas(1, 1);
                        c.getContext("2d");
                        trail.push("@napi-rs/canvas loaded");
                        return wrap(mod, "@napi-rs/canvas", trail);
                } catch (e) {
                        trail.push(`@napi-rs/canvas failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("@napi-rs/canvas unavailable");
        }

        // ── L2b: skia-canvas ────────────────────────────────────────────────
        mod = tryRequire("skia-canvas", { jit: true });
        if (mod && typeof mod.Canvas === "function") {
                try {
                        // skia-canvas ships its own Canvas class (no createCanvas)
                        const adapted = {
                                createCanvas: (w, h) => new mod.Canvas(w, h),
                                loadImage: mod.loadImage,
                                Image: mod.Image,
                                ImageData: mod.ImageData,
                                registerFont: mod.FontLibrary
                                        ? (file, opts) => mod.FontLibrary.use(opts && opts.family ? { [opts.family]: [file] } : [file])
                                        : () => {}
                        };
                        const c = adapted.createCanvas(1, 1);
                        c.getContext("2d");
                        trail.push("skia-canvas loaded");
                        return wrap(adapted, "skia-canvas", trail);
                } catch (e) {
                        trail.push(`skia-canvas failed (${(e.message || "").slice(0, 60)})`);
                }
        } else {
                trail.push("skia-canvas unavailable");
        }

        // ── L3 / L4: cloud + no-op fallback ────────────────────────────────
        trail.push("falling back to cloud / no-op");
        return wrap(null, "noop", trail);
}

function wrap(real, backend, trail) {
        const isNoop = backend === "noop";

        function noopCanvas(w, h) {
                const ctx = new Proxy(
                        {},
                        {
                                get(_t, prop) {
                                        if (prop === "canvas") return canvas;
                                        return () => {};
                                }
                        }
                );
                const transparentPng = Buffer.from(
                        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
                        "base64"
                );
                const canvas = {
                        width: w || 1,
                        height: h || 1,
                        getContext: () => ctx,
                        toBuffer: (cb) => (typeof cb === "function" ? cb(null, transparentPng) : transparentPng),
                        toDataURL: () => "data:image/png;base64," + transparentPng.toString("base64"),
                        createPNGStream: () => {
                                const { Readable } = require("stream");
                                return Readable.from([transparentPng]);
                        }
                };
                return canvas;
        }

        /**
         * Patch a real canvas object so its toBuffer() is compatible with
         * the node-canvas API expected by bot commands:
         *   - toBuffer()              → defaults to 'image/png'
         *   - toBuffer(mime)          → returns Buffer
         *   - toBuffer(mime, opts)    → returns Buffer
         *   - toBuffer(callback)      → callback(null, Buffer)
         *   - toBuffer(mime, callback)→ callback(null, Buffer)
         *   - createPNGStream()       → readable stream shim
         */
        function patchCanvas(c) {
                if (!c || typeof c.toBuffer !== "function") return c;
                const _origToBuffer = c.toBuffer.bind(c);
                c.toBuffer = function(mime, opts, callback) {
                        // toBuffer(callback)
                        if (typeof mime === "function") { callback = mime; mime = "image/png"; opts = undefined; }
                        // toBuffer(mime, callback)
                        if (typeof opts === "function") { callback = opts; opts = undefined; }
                        // toBuffer() with no args
                        if (mime === undefined || mime === null) mime = "image/png";
                        let result;
                        try {
                                result = _origToBuffer(mime);
                        } catch(e) {
                                // last-ditch: try 'image/png'
                                try { result = _origToBuffer("image/png"); } catch(_) { result = Buffer.alloc(0); }
                        }
                        if (typeof callback === "function") { callback(null, result); return; }
                        return result;
                };
                // add createPNGStream shim if missing
                if (typeof c.createPNGStream !== "function") {
                        c.createPNGStream = function() {
                                const { Readable } = require("stream");
                                const buf = c.toBuffer("image/png");
                                return Readable.from([buf]);
                        };
                }
                return c;
        }

        const adapter = {
                _backend: backend,
                _trail: trail,
                createCanvas: real
                        ? (w, h) => patchCanvas(real.createCanvas(w, h))
                        : (w, h) => {
                                  console.warn("[gfx/noop] createCanvas: returning placeholder canvas");
                                  return noopCanvas(w, h);
                          },
                loadImage: real
                        ? real.loadImage.bind(real)
                        : async (src) => {
                                  console.warn("[gfx/noop] loadImage: cannot load", typeof src === "string" ? src.slice(0, 60) : "(buffer)");
                                  return { width: 1, height: 1, src };
                          },
                Image: real ? real.Image : function NoopImage() {},
                ImageData: real ? real.ImageData : function NoopImageData() {},
                registerFont: real
                        ? (real.registerFont || (() => {})).bind(real)
                        : () => {},
                /**
                 * QR code helper that works on every level.
                 * Tries: local canvas via `qrcode` (if loadable) → QuickChart cloud → noop.
                 */
                async generateQR(text, opts = {}) {
                        const size = opts.size || 300;
                        const qrcode = tryRequire("qrcode", { jit: false });
                        if (qrcode && !isNoop) {
                                try {
                                        return await qrcode.toBuffer(text, { width: size });
                                } catch (e) {
                                        console.warn("[gfx] local QR generation failed:", e.message);
                                }
                        }
                        try {
                                const url =
                                        "https://quickchart.io/qr?size=" +
                                        size +
                                        "&text=" +
                                        encodeURIComponent(text);
                                return await downloadBuffer(url);
                        } catch (e) {
                                console.warn("[gfx] cloud QR (QuickChart) failed:", e.message);
                                return Buffer.alloc(0);
                        }
                }
        };

        return adapter;
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
