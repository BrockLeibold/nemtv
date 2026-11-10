// UI rule checker (see docs/UI-RULES.md). Evaluates to a function (D, scopeSelector, kind) -> list of problems.
// FAIL = overlap, content clipped by its box, content outside the screen, text cut off. WARN = tiny text, ellipsis, unreachable focus targets.
(function (D, scope, kind) {
  var W = D.defaultView, bad = [], iw = W.innerWidth, ih = W.innerHeight;
  var root = scope ? D.querySelector(scope) : D.body; if (!root) return ["no element " + scope];
  var cs = function (e) { return W.getComputedStyle(e); };
  var R = function (e) { return e.getBoundingClientRect(); };
  var shown = function (e) { for (var x = e; x && x !== D.body; x = x.parentElement) { var s = cs(x); if (s.display === "none" || s.visibility === "hidden" || x.hidden) return false; } var r = R(e); return r.width > 1 && r.height > 1; };
  var nm = function (e) { var c = typeof e.className === "string" ? e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""; return e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (c ? "." + c : ""); };
  var hit = function (a, b) { return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2; };
  var seen = {}, add = function (k, m) { if (!seen[k + m]) { seen[k + m] = 1; bad.push(k + " " + m); } };
  var all = [root].concat([].slice.call(root.querySelectorAll("*"))).filter(function (e) { return !/^(SCRIPT|STYLE|LINK|META|BR|PATH|CIRCLE|RECT|LINE|POLYLINE|G|DEFS|SVG|USE|STOP)$/i.test(e.tagName) || e.tagName === "svg"; });
  var zoomOf = function (e) { var z = 1; for (var x = e; x && x.style; x = x.parentElement) { if (x.style.zoom) z *= parseFloat(x.style.zoom) || 1; } return z; };
  var minfs = 99, minEl = null;
  // inside a scrolling box only the part within that box is on screen: the rest is scrolled out of view (null = fully outside the box)
  function visRect(e, r) {
    for (var p = e.parentElement; p && p !== D.body && p !== D.documentElement; p = p.parentElement) {
      var po = getComputedStyle(p);
      if (/auto|scroll/.test(po.overflowY + po.overflowX)) { var b = R(p);
        var o = { left: Math.max(r.left, b.left), right: Math.min(r.right, b.right), top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom) };
        return (o.right <= o.left || o.bottom <= o.top) ? null : o; }
    }
    return r;
  }
  all.forEach(function (e) {
    if (!shown(e)) return; var s = cs(e), r = R(e);
    // 1. the box must not cut off its own content
    if (e.closest && e.closest("[data-pages],.skin")) return; // paged strip / decorative orb art
    if (r.left < -1000) return; // screen-reader-only text // deliberately paged strip (D-pad slides it), not clipped content
    var ox = s.overflowX, oy = s.overflowY, cuts = /hidden|clip|auto|scroll/;
    var clamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
    if ((cuts.test(ox) || cuts.test(oy)) && !clamp && e !== D.documentElement && e !== D.body) {
      var ex = e.scrollWidth - e.clientWidth, ey = e.scrollHeight - e.clientHeight;
      if (ex > 1 && cuts.test(ox) && !/auto|scroll/.test(ox)) add(s.textOverflow === "ellipsis" ? "WARN ellipsis" : "FAIL clipped-x", nm(e) + " by " + ex + "px");
      if (ey > 1 && cuts.test(oy) && !/auto|scroll/.test(oy)) add("FAIL clipped-y", nm(e) + " by " + ey + "px");
    }
    // 2. nothing outside the screen
    var vr = visRect(e, r);
    if (vr && (vr.right > iw + 1.5 || vr.bottom > ih + 1.5 || vr.left < -1.5 || vr.top < -1.5)) { var inDeck = e.closest && e.closest("#deck"); if (!inDeck || (r.right <= R(inDeck).right + 1.5)) add("FAIL off-screen", nm(e) + " [" + Math.round(r.left) + "," + Math.round(r.top) + "," + Math.round(r.right) + "," + Math.round(r.bottom) + "] in " + iw + "x" + ih); }
    // 3. siblings must not overlap (in-flow boxes only)
    var kids = [].slice.call(e.children).filter(function (k) { if (!shown(k)) return false; var p = cs(k).position; return p !== "absolute" && p !== "fixed" && !/^(SVG|PATH)$/i.test(k.tagName) && cs(k).display !== "inline" && cs(k).display !== "contents"; });
    for (var i = 0; i < kids.length; i++) for (var j = i + 1; j < kids.length; j++) if (hit(R(kids[i]), R(kids[j]))) add("FAIL overlap", nm(kids[i]) + " x " + nm(kids[j]) + " in " + nm(e));
    // 4. children stay inside a clipping parent
    if (cuts.test(ox) || cuts.test(oy)) { var P = R(e); kids.forEach(function (k) { var q = R(k); if (q.right > P.right + 2 || q.bottom > P.bottom + 2 || q.left < P.left - 2 || q.top < P.top - 2) { if (!(/auto|scroll/.test(ox) && q.left >= P.left - 2) && !e.matches("#deck,.slide")) add("FAIL outside-parent", nm(k) + " of " + nm(e)); } }); }
    // 5. smallest text actually drawn
    if (e.childNodes.length) for (var c = 0; c < e.childNodes.length; c++) if (e.childNodes[c].nodeType === 3 && e.childNodes[c].textContent.trim()) { var fs = parseFloat(s.fontSize) * zoomOf(e); if (fs < minfs) { minfs = fs; minEl = e; } break; }
  });
  if (minfs < 8.5 && minEl) bad.push("WARN tiny-text " + minfs.toFixed(1) + "px " + nm(minEl));
  // 6. controller: every focusable thing in the scope is a real, visible, non-zero target
  var f = [].slice.call(root.querySelectorAll("button,a[href],input,select,[tabindex]")).filter(shown);
  f.forEach(function (e) { var r = R(e); if (r.width < 14 || r.height < 14) add("WARN tiny-target", nm(e) + " " + Math.round(r.width) + "x" + Math.round(r.height)); });
  if (kind === "home") {
    if (!D.querySelector(".lz")) return ["WARN no home grid (no games today?)"];
    var gw = D.querySelector(".gw"); if (gw) { var g = R(gw), ps = [].slice.call(gw.querySelectorAll(".pill")).filter(function (p) { var r = R(p); return r.top >= g.top - 2 && r.bottom <= g.bottom + 2; }); if (!ps.length) bad.push("FAIL no game pill fits in the strip (" + Math.round(g.height) + "px)"); }
  }
  var si = root.querySelector(".si"); if (si && si.style.zoom && parseFloat(si.style.zoom) < .85) bad.push("WARN shrunk-to " + si.style.zoom + " (content too big for its cell)");
  if (D.documentElement.scrollWidth > iw + 1) bad.push("FAIL page scrolls sideways");
  return bad;
})
