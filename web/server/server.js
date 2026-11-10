"use strict";
// NEMTV web server: static app + guide, window.Android shim, /api/get, /api/epg, /hls proxy. No dependencies.
// Request URLs carry tokens (playlist, stream urls): they are never logged, only method + path + status.
const http = require("http"), fs = require("fs"), path = require("path"), dns = require("dns").promises, net = require("net"), zlib = require("zlib");
const PUB = path.join(__dirname, "public"), PORT = +process.env.PORT || 8080, DATA = process.env.DATA || "/data";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".ttf": "font/ttf", ".woff2": "font/woff2", ".woff": "font/woff" };

// hosts /api/get and /api/epg may fetch: fixed list + hosts of stremio.json base, the config.js playlist, any x-tvg-url the playlist names (remembered in DATA/hosts.json)
const hosts = new Set(["api-web.nhle.com", "assets.nhle.com", "binged.net", "premium.highfly.to", ...(process.env.EXTRA_HOSTS || "").split(",").filter(Boolean)]);
const addHost = u => { try { const h = new URL(u).hostname; if (!hosts.has(h)) { hosts.add(h); saveHosts() } } catch (e) {} };
function saveHosts() { try { fs.writeFileSync(path.join(DATA, "hosts.json"), JSON.stringify([...hosts])) } catch (e) {} }
try { JSON.parse(fs.readFileSync(path.join(DATA, "hosts.json"), "utf8")).forEach(h => hosts.add(h)) } catch (e) {}
try { addHost(JSON.parse(fs.readFileSync(path.join(PUB, "stremio.json"), "utf8")).base) } catch (e) {}
try { addHost((/playlist:\s*"([^"]+)"/.exec(fs.readFileSync(path.join(PUB, "config.js"), "utf8")) || [])[1]) } catch (e) {}

const log = (q, code) => console.log(new Date().toISOString().slice(11, 19), q.method, q.url.split("?")[0], code);
const send = (r, code, body, type) => { r.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" }); r.end(body) };

// ---- SSRF guard for /hls (stream hosts are arbitrary): no private / loopback / link-local targets, checked on every redirect hop
function priv(ip) {
  if (net.isIPv4(ip)) { const [a, b] = ip.split(".").map(Number); return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) }
  ip = ip.toLowerCase(); return ip === "::1" || ip === "::" || /^f[cd]|^fe[89ab]/.test(ip) || (ip.startsWith("::ffff:") && priv(ip.slice(7)));
}
async function safeUrl(u) {
  const x = new URL(u); if (!/^https?:$/.test(x.protocol)) throw new Error("bad scheme");
  const h = x.hostname.replace(/^\[|\]$/g, "");
  const ips = net.isIP(h) ? [h] : (await dns.lookup(h, { all: true })).map(a => a.address);
  if (!ips.length || ips.some(priv)) throw new Error("blocked host"); return x;
}
async function fetchSafe(u, headers, signal) {
  for (let i = 0; i < 6; i++) {
    const x = await safeUrl(u), res = await fetch(x, { headers, signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { u = new URL(res.headers.get("location"), x).href; continue }
    return { res, url: x.href };
  }
  throw new Error("too many redirects");
}

// ---- /hls?u=<url>: CORS-free proxy; m3u8 playlists get every URI sent back through here
function rewrite(text, base) {
  const P = u => { if (/^data:/i.test(u)) return u; try { return "/hls?u=" + encodeURIComponent(new URL(u, base).href) } catch (e) { return u } };
  return text.split(/\r?\n/).map(l => !l.trim() ? l : l[0] === "#" ? l.replace(/URI="([^"]*)"/g, (m, u) => 'URI="' + P(u) + '"') : P(l.trim())).join("\n");
}
async function hls(q, r, u) {
  const ac = new AbortController(); r.on("close", () => ac.abort());
  const h = { "user-agent": UA }; if (q.headers.range) h.range = q.headers.range;
  const { res, url } = await fetchSafe(u, h, ac.signal), rd = res.body ? res.body.getReader() : null;
  const first = rd ? await rd.read() : { done: true };
  const head = first.value ? Buffer.from(first.value) : Buffer.alloc(0);
  if (head.slice(0, 7).toString() === "#EXTM3U") { // playlist: buffer it (capped), rewrite, send
    const parts = [head]; let n = head.length;
    for (;;) { const c = await rd.read(); if (c.done || (n += c.value.length) > 4e6) break; parts.push(Buffer.from(c.value)) }
    const out = Buffer.from(rewrite(Buffer.concat(parts).toString("utf8"), url), "utf8");
    r.writeHead(res.status, { "Content-Type": "application/vnd.apple.mpegurl", "Content-Length": out.length, "Cache-Control": "no-store" }); return r.end(out);
  }
  const o = { "Cache-Control": "no-store" }, ct = res.headers.get("content-type") || "", p = new URL(url).pathname.toLowerCase();
  o["Content-Type"] = /^(video|audio)\/|mpegurl|mp4/i.test(ct) ? ct : /\.ts$/.test(p) ? "video/mp2t" : /\.(m4s|mp4|cmfv)$/.test(p) ? "video/mp4" : /\.(aac|m4a|cmfa)$/.test(p) ? "audio/aac" : ct || "application/octet-stream";
  if (!res.headers.get("content-encoding")) for (const k of ["content-length", "content-range", "accept-ranges"]) if (res.headers.get(k)) o[k] = res.headers.get(k); // fetch() already decoded gzip: length would lie
  r.writeHead(res.status, o); if (head.length && !r.write(head)) await new Promise(k => r.once("drain", k));
  while (rd && !first.done) { const c = await rd.read(); if (c.done) break; if (!r.write(c.value)) await new Promise(k => r.once("drain", k)) }
  r.end();
}

// ---- /api/get?url=  (Android.get / load)
async function get(q, r, u) {
  const x = new URL(u); if (!/^https?:$/.test(x.protocol) || !hosts.has(x.hostname)) return send(r, 403, "host not allowed");
  const res = await fetch(x, { headers: { "user-agent": "NEMTV" }, signal: AbortSignal.timeout(30000) }), t = await res.text();
  if (!res.ok) return send(r, 502, "HTTP " + res.status);
  const eu = /(?:x-tvg-url|url-tvg)="([^",]+)/.exec(t.slice(0, 2000)); if (eu) addHost(eu[1]); // playlist names its EPG host
  send(r, 200, t);
}

// ---- /api/epg?url=  same object Main.java's epg() hands gotEpg: {channel:[[startMs,stopMs,text,hockey]]}
const ymd = s => { const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(?:\s*([+-]\d{4}))?/.exec(s || ""); if (!m) return 0; const z = m[7] || "+0000", o = (z[0] === "-" ? -1 : 1) * (+z.slice(1, 3) * 60 + +z.slice(3, 5)); return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - o * 60000 };
const ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (m, c) => c.replace(/&/g, "&#38;")).replace(/<[^>]+>/g, "").replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ent[e] || m);
function epgParse(x) {
  const all = {}, now = Date.now(), re = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g; let m;
  while ((m = re.exec(x))) {
    const at = {}; m[1].replace(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k, a, b) => { at[k] = dec(a != null ? a : b) });
    const s = ymd(at.start), e = ymd(at.stop), parts = [];
    m[2].replace(/<(title|sub-title|desc)\b[^>]*>([\s\S]*?)<\/\1>/g, (_, t, v) => { parts.push([t, dec(v)]) });
    const ti = (parts.find(p => p[0] === "title") || [0, ""])[1], tx = parts.map(p => p[1]).join(" | "), hk = /nhl|hockey/i.test(tx);
    if (hk || (e > now - 4 * 36e5 && s < now + 36e5 * 36)) (all[at.channel] = all[at.channel] || []).push([s, e, (hk ? tx : ti).slice(0, 300), hk ? 1 : 0]);
  }
  return all;
}
const epgCache = new Map();
async function epg(q, r, u) {
  const x = new URL(u); if (!/^https?:$/.test(x.protocol) || !hosts.has(x.hostname)) return send(r, 403, "host not allowed");
  const c = epgCache.get(u); if (c && Date.now() - c.t < 6e5) return send(r, 200, c.j, "application/json");
  const res = await fetch(x, { headers: { "user-agent": "NEMTV" }, signal: AbortSignal.timeout(90000) });
  if (!res.ok) return send(r, 502, "HTTP " + res.status);
  let b = Buffer.from(await res.arrayBuffer()); if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  const j = JSON.stringify(epgParse(b.toString("utf8"))); epgCache.set(u, { t: Date.now(), j }); send(r, 200, j, "application/json");
}

// ---- static files
function file(q, r, p) {
  if (p === "/") p = "/index.html"; if (p === "/guide" || p === "/guide/") p = "/guide/index.html";
  if (p === "/_web-shim.js") p = null;
  const f = p ? path.normalize(path.join(PUB, p)) : path.join(__dirname, "shim.js");
  if ((p && !f.startsWith(PUB + path.sep)) || /[\\/]config\.example/.test(f) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(r, 404, "not found");
  let d = fs.readFileSync(f);
  if (p === "/app.html") d = Buffer.from(d.toString("utf8").replace("<head>", '<head><script src="/_web-shim.js"></script>'));
  if (p === "/guide/index.html") d = Buffer.from(d.toString("utf8").replace("</body>", "<link rel=stylesheet href=/_dark.css><script src=/_nav.js></script></body>"));
  r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }); r.end(d);
}

http.createServer(async (q, r) => {
  try {
    const x = new URL(q.url, "http://x"), u = x.searchParams.get("url") || x.searchParams.get("u") || "";
    if (q.method !== "GET" && q.method !== "HEAD") return send(r, 405, "GET only");
    if (x.pathname === "/healthz") return send(r, 200, "ok");
    if (x.pathname === "/api/get") await get(q, r, u);
    else if (x.pathname === "/api/epg") await epg(q, r, u);
    else if (x.pathname === "/hls") await hls(q, r, u);
    else return file(q, r, decodeURIComponent(x.pathname));
    log(q, r.statusCode);
  } catch (e) {
    console.log(new Date().toISOString().slice(11, 19), q.method, q.url.split("?")[0], "ERR", String(e.message || e).replace(/https?:\/\/\S+/g, "<url>"));
    if (!r.headersSent) send(r, 502, String(e.message || e).replace(/https?:\/\/\S+/g, "<url>")); else r.destroy();
  }
}).listen(PORT, () => console.log("nemtv listening", PORT));
