"use strict";

const net = require("net");

function probe(port) {
        return new Promise((resolve) => {
                const srv = net.createServer();
                srv.once("error", () => resolve(false));
                srv.once("listening", () => srv.close(() => resolve(true)));
                srv.listen(port, "0.0.0.0");
        });
}

async function findAvailablePort(preferred, fallbacks = [3000, 7860, 8080, 8081, 5050]) {
        const tried = [];
        const list = [];
        if (preferred) list.push(Number(preferred));
        for (const p of fallbacks) if (!list.includes(p)) list.push(p);

        for (const p of list) {
                const ok = await probe(p);
                tried.push(`${p}=${ok ? "free" : "busy"}`);
                if (ok) {
                        console.log(`[EnvMgr] Port resolver: chose ${p}  (tried: ${tried.join(", ")})`);
                        return p;
                }
        }
        const ephemeral = 0;
        console.log(`[EnvMgr] Port resolver: all fallbacks busy (${tried.join(", ")}) → using ephemeral port`);
        return ephemeral;
}

module.exports = { findAvailablePort, probe };
