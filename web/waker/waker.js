"use strict";
// Starts container TARGET on the first request, proxies to it, stops it after IDLE_MIN minutes with no requests (and no open ones).
const http = require("http");
const NAME = process.env.TARGET || "nemtv", PORT = 8080, IDLE = (+process.env.IDLE_MIN || 30) * 6e4;
let last = Date.now(), active = 0, starting = null;

const dock = (method, p) => new Promise((ok, no) => {
  const q = http.request({ socketPath: "/var/run/docker.sock", path: p, method }, r => { let b = ""; r.on("data", d => b += d); r.on("end", () => ok({ s: r.statusCode, b })) });
  q.on("error", no); q.end();
});
const running = async () => { const r = await dock("GET", "/containers/" + NAME + "/json"); if (r.s === 404) return null; return !!JSON.parse(r.b).State.Running };
const ping = () => new Promise(ok => { const q = http.get({ host: NAME, port: PORT, path: "/healthz", timeout: 1500 }, r => { r.resume(); ok(r.statusCode === 200) }); q.on("error", () => ok(false)); q.on("timeout", () => { q.destroy(); ok(false) }) });
const sleep = t => new Promise(r => setTimeout(r, t));

// resolves "up" | "wait" | "missing"
async function ensure(wait) {
  if (await ping()) return "up";
  if (!starting) starting = (async () => {
    const s = await running(); if (s === null) return "missing";
    if (!s) { const r = await dock("POST", "/containers/" + NAME + "/start"); console.log("start", NAME, r.s) }
    return "ok";
  })().finally(() => setTimeout(() => { starting = null }, 3000));
  if ((await starting) === "missing") return "missing";
  for (let i = 0; wait && i < 40; i++) { if (await ping()) return "up"; await sleep(500) }
  return (await ping()) ? "up" : "wait";
}

const page = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=3><title>NEMTV</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0F0E11;color:#eee;font:600 22px system-ui,sans-serif">Starting NEMTV...</body>`;

function proxy(q, r) {
  const u = http.request({ host: NAME, port: PORT, path: q.url, method: q.method, headers: q.headers }, p => { r.writeHead(p.statusCode, p.headers); p.pipe(r) });
  u.on("error", e => { if (!r.headersSent) { r.writeHead(502); r.end("bad gateway") } else r.destroy() });
  r.on("close", () => { if (!r.writableFinished) u.destroy() });
  q.pipe(u);
}

http.createServer(async (q, r) => {
  last = Date.now(); active++; r.on("close", () => { active--; last = Date.now() });
  try {
    const html = /text\/html/.test(q.headers.accept || "");
    const s = await ensure(!html); // browsers get the refresh page right away; curl/XHR wait for the boot
    if (s === "up") return proxy(q, r);
    if (s === "missing") { r.writeHead(503, { "Content-Type": "text/plain" }); return r.end("container '" + NAME + "' not created: docker compose -f web/docker-compose.yml create nemtv") }
    r.writeHead(503, { "Content-Type": html ? "text/html" : "text/plain", "Retry-After": "3", "Cache-Control": "no-store" }); r.end(html ? page : "starting");
  } catch (e) { console.log("error", e.message); if (!r.headersSent) { r.writeHead(502); r.end("waker error") } }
}).listen(PORT, () => console.log("waker on", PORT, "idle min", IDLE / 6e4));

setInterval(async () => {
  if (active > 0 || Date.now() - last < IDLE) return;
  try { if (await running()) { const r = await dock("POST", "/containers/" + NAME + "/stop?t=5"); console.log("idle stop", NAME, r.s) } } catch (e) { console.log("stop error", e.message) }
}, 6e4);
