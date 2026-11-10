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
