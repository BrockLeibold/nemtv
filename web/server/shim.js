// web stand-in for the Android bridge (Main.java): same methods, backed by the nemtv server
(function () {
  var T = function (u) { return fetch("/api/get?url=" + encodeURIComponent(u)).then(function (r) { return r.text().then(function (t) { if (!r.ok) throw new Error(t || "HTTP " + r.status); return t }) }) };
  var msg = function (e) { return String((e && e.message) || e) };
  // Android.get(u, cb): cb is a global function name OR an expression ("nhlRelay.bind(null,\"__nhl1\")"), called as cb(text, err)
  var run = function (cb, t, e) { (0, eval)(cb + "(" + JSON.stringify(t) + "," + JSON.stringify(e) + ")") };
  window.NEMDESK = true; // mouse UI: first click previews a game in the hero, second opens it
  window.Android = {
    load: function (u) { T(u).then(function (x) { window.gotList(x, "") }).catch(function (e) { window.gotList("", msg(e)) }) },
    guideSync: function () {}, // guide is baked into the image
    get: function (u, cb) { T(u).then(function (t) { run(cb, t, "") }).catch(function (e) { run(cb, "", msg(e)) }) },
    epg: function (u) { fetch("/api/epg?url=" + encodeURIComponent(u)).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json() }).then(function (o) { window.gotEpg(o, "") }).catch(function (e) { window.gotEpg(null, msg(e)) }) },
    asset: function (n) { try { var x = new XMLHttpRequest(); x.open("GET", "/" + n, false); x.send(); return x.status === 200 ? x.responseText : "" } catch (e) { return "" } }
  };
  // stream urls go through /hls (browsers need CORS for hls.js and block http:// on an https page)
  var prox = function (u) { return typeof u === "string" && /^https?:\/\//i.test(u) && u.indexOf(location.origin) !== 0 ? "/hls?u=" + encodeURIComponent(u) : u };
  var d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
  Object.defineProperty(HTMLMediaElement.prototype, "src", { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { d.set.call(this, prox(v)) } });
  document.addEventListener("DOMContentLoaded", function () { // hls.min.js has run by now
    if (window.Hls && Hls.prototype.loadSource) { var o = Hls.prototype.loadSource; Hls.prototype.loadSource = function (u) { return o.call(this, prox(u)) } }
  });
})();

// web only: volume slider in the player top bar (TV uses its remote volume). Applies to every <video> (player + multiview tiles).
(function () {
  var K = "nemtv-vol", v = 1;
  try { var s = parseFloat(localStorage.getItem(K)); if (s >= 0 && s <= 1) v = s } catch (e) {}
  var all = function () { document.querySelectorAll("video").forEach(function (x) { x.volume = v }) };
  document.addEventListener("play", function (e) { if (e.target.tagName === "VIDEO") e.target.volume = v }, true);
  var add = function () {
    var fs = document.getElementById("pfs"); if (!fs || document.getElementById("pvol")) return;
    var w = document.createElement("label"); w.id = "pvol"; w.title = "Volume";
    w.innerHTML = '<span>&#128266;</span><input type="range" min="0" max="100" step="1">';
    var r = w.querySelector("input"); r.value = Math.round(v * 100);
    r.addEventListener("input", function () { v = r.value / 100; all(); try { localStorage.setItem(K, v) } catch (e) {} });
    r.addEventListener("keydown", function (e) { e.stopPropagation() });
    fs.parentNode.insertBefore(w, fs);
    var st = document.createElement("style");
    st.textContent = "#pvol{display:flex;align-items:center;gap:6px;margin-right:8px;color:#fff;font-size:14px}#pvol input{width:110px;accent-color:#fff;cursor:pointer}";
    document.head.appendChild(st);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();

// web only: Back. Escape / Backspace (outside inputs) / browser-back / TV remote back keys call the same nemBack the Android bridge uses
window.addEventListener("keydown", function (e) { // window = after the app's own document handlers
  var t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  var back = e.key === "Escape" || e.key === "BrowserBack" || e.key === "GoBack" || e.keyCode === 4 || e.keyCode === 10009 || e.keyCode === 461 || (e.key === "Backspace" && !typing);
  if (!back || e.defaultPrevented) return;
  e.preventDefault();
  if (typeof window.nemBack !== "function" || !window.nemBack()) history.back();
});
