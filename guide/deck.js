/* NEMTV guide deck: sections are full-screen slides paged LEFT/RIGHT, tabs at the top show where you are. Loaded after the guide's own script. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var wrap = $("#scroller > .wrap") || $(".wrap"), top = $(".top");
  if (!wrap || !top || window.__deck) return; window.__deck = 1; var H0 = location.hash, booted = false; // H0: how the page was opened (the guide's own boot rewrites the hash)
  var DEFS = [["Overview", "s-ov", [".hero", "#gameday"]], ["News", "s-nw", ["#news"]], ["Roster", "s-ro", ["#roster"]], ["Team", "s-tm", ["#team"]], ["Games", "s-gm", ["#gamesView"]]];
  var deck = document.createElement("div"); deck.id = "deck";
  var slides = DEFS.map(function (d) {
    var s = document.createElement("section"), i = document.createElement("div");
    s.className = "slide " + d[1]; i.className = "si"; s.appendChild(i); deck.appendChild(s);
    d[2].forEach(function (q) { var e = $(q); if (e) { e.hidden = false; i.appendChild(e); } });
    if (d[1] === "s-ro") { var ln = document.createElement("div"); ln.id = "lines"; i.appendChild(ln); }
    return s;
  });
  wrap.appendChild(deck);
  /* ---- skeletons (docs/UI-RULES.md 25): shaped like the real content, shown until the data lands, replaced in place by the renderers ---- */
  var skl = function (w, h, m) { return '<i class="sk" style="width:' + w + ";height:" + h + (m ? ";margin-bottom:" + m : "") + '"></i>'; };
  var skRep = function (n, f) { var o = ""; for (var i = 0; i < n; i++) o += f(i); return o; };
  var skOv = function () {
    var c = function (cls, l, v, s) { return '<div class="ovc skm' + cls + '"><span class="ovl">' + l + '</span><b class="ovv">' + v + '</b><span class="ovs">' + s + "</span></div>"; };
    return '<section class="ov-hero skm"></section><div class="ovcards" inert aria-hidden="true">' + c("", "Record", "00-00-00", "00 games played") + c("", "Points", "00", "1st in Division") + c("", "Streak", "W0", "L10 0-0-0") + c(" ovnext", "Next game", "vs Team", "Today &middot; 7:00 PM ET &middot; Arena") + "</div>";
  };
  var skMc = function () { return '<div class="mc skm"><div class="mc-top"><span class="mc-time">7:00 PM</span></div><div>Team</div><div>Team</div></div>'; };
  var skFill = function (q, html) { var e = $(q); if (e && !e.firstElementChild && !e.textContent.trim()) e.innerHTML = html; };
  var o0 = $(".s-ov .si"); if (o0 && !$("#ov")) { var oh = document.createElement("div"); oh.id = "ov"; oh.innerHTML = skOv(); o0.insertBefore(oh, o0.firstChild); }
  skFill("#rail", skRep(2, function (r) { return '<div class="rrow" inert aria-hidden="true"><span class="eyebrow">' + (r ? "West" : "East") + '</span><div class="rlogos">' + skRep(16, function () { return '<i class="lg sk"></i>'; }) + "</div></div>"; }));
  skFill("#newsLead", skl("85%", "1.3em"));
  skFill("#newsList", skRep(4, function () { return '<div class="ni" inert aria-hidden="true">' + skl("70%", "1.1em", "6px") + skl("95%", ".9em", "4px") + skl("40%", ".8em") + "</div>"; }));
  skFill("#rosterBody", '<div class="skw" inert aria-hidden="true" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--g4)">' + skRep(18, function () { return skl("100%", "34px").replace('style="', 'style="border-radius:8px;'); }) + "</div>");
  skFill("#lines", '<div class="lblk f" style="--r:4" inert aria-hidden="true">' + skRep(4, function (r) { return '<div class="lrow"><h4>L' + (r + 1) + "</h4>" + skRep(3, function () { return '<span class="lp skm"></span>'; }) + "</div>"; }) + '</div><div class="lblk d" style="--r:4;--pr:3" inert aria-hidden="true">' + skRep(4, function (r) { return '<div class="lrow"><h4>' + (r < 3 ? "D" + (r + 1) : "G") + "</h4>" + skRep(2, function () { return '<span class="lp skm"></span>'; }) + "</div>"; }) + "</div>");
  var gs = $(".s-gm .si"); if (gs && !$("#calsk")) { var cs = document.createElement("div"); cs.id = "calsk"; cs.setAttribute("inert", ""); cs.setAttribute("aria-hidden", "true"); cs.style.cssText = "grid-column:1/-1;display:grid;grid-template-rows:auto repeat(5,minmax(0,1fr));grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--g4);height:100%;min-height:min(420px,60vh)"; cs.innerHTML = skl("30%", "18px").replace('style="', 'style="grid-column:1/-1;') + skRep(35, function () { return skl("100%", "100%").replace('style="', 'style="border-radius:10px;'); }); gs.appendChild(cs); } // month calendar; renderCal removes it
  skFill("#geo", skRep(6, function (i) { return skl(100 - i * 12 + "%", "18px", "6px"); }));
  skFill("#acqWho", skRep(4, function () { return skl("100%", "36px", "4px"); }));
  skFill("#depth", skRep(4, function () { return skl("100%", "28px", "4px"); }));
  skFill("#dstrip", skRep(15, function () { return '<i class="dchip sk" style="flex:1;height:40px"></i>'; }));
  skFill("#mgrid", '<div class="skw" inert aria-hidden="true">' + skRep(8, skMc) + "</div>");
  setTimeout(function () { document.documentElement.classList.add("skon"); }, 150); // skeletons stay invisible for the first 150ms (cache hits never flash)
  window.skFail = function () { // data never came: real message, no skeletons left behind
    document.querySelectorAll(".sk,.skm,.skw,.ni[inert]").forEach(function (e) { if (e.parentNode) e.remove(); });
    var o = $("#ov") || document.createElement("div"); o.id = "ov"; o.innerHTML = '<div class="fail"><p>Couldn\'t load the roster data.</p><button type="button" id="retry" class="rbtn">Try again</button></div>'; if (!o.parentNode && o0) o0.insertBefore(o, o0.firstChild);
    var rb = $("#retry"); if (rb) { rb.addEventListener("click", function () { location.reload(); }); rb.focus(); }
  };
  document.addEventListener("load", function (e) { if (e.target.tagName === "IMG") e.target.classList.add("ld"); }, true);
  document.addEventListener("error", function (e) { if (e.target.tagName === "IMG") e.target.classList.add("ld"); }, true);
  var tabs = document.createElement("nav"); tabs.id = "tabs"; tabs.setAttribute("aria-label", "Sections");
  tabs.innerHTML = DEFS.map(function (d, k) { return '<button type="button" data-slide="' + k + '">' + d[0] + "</button>"; }).join("");
  top.appendChild(tabs);
  var cur = 0;
  function width() { return deck.clientWidth || 1; }
  function mark() {
    cur = Math.max(0, Math.min(DEFS.length - 1, Math.round(deck.scrollLeft / width())));
    tabs.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-current", String(k === cur)); b.tabIndex = k === cur ? 0 : -1; }); // roving: one stop in the strip, Up/Down leaves it
  }
  function isTV() { try { return !!(window.Android || (window.parent && window.parent !== window && window.parent.Android)); } catch (e) { return false; } }
  window.deckIsTV = isTV;
  if (isTV()) document.documentElement.classList.add("tv");
  var syncT = 0;
  function sync() { // keep the guide's data mode in step with the slide
    clearTimeout(syncT); syncT = setTimeout(function () {
      if (typeof state === "undefined" || typeof DATA === "undefined" || !DATA) return;
      if (cur === 4 && state.mode !== "games") setMode("games", state.day);
      else if (cur !== 4 && state.mode === "games") { state.mode = "team"; try { history.replaceState(null, "", "#" + state.team); } catch (e) {} renderAll(); }
      fitSoon();
    }, 80);
  }
  function go(k, instant) {
    var from = cur; k = Math.max(0, Math.min(DEFS.length - 1, k)); cur = k;
    if (from === 2 && k !== 2 && typeof state !== "undefined" && (state.acq.size || state.q)) clearFilter(); // a filter lives only while the Roster slide is open, so the player page order is never stale
    deck.style.scrollBehavior = "auto"; deck.scrollLeft = k * width();
    mark(); sync(); if (k === 4) renderCal(); if (window.guideReport) guideReport();
  }
  function clearFilter() { state.pos = "all"; state.acq.clear(); state.q = ""; var q = $("#q"); if (q) q.value = ""; try { renderRoster(); } catch (e) {} }
  function firstFocus(root) { var q = root.querySelectorAll("button,a[href],[tabindex]:not([tabindex='-1']),summary"); for (var i = 0; i < q.length; i++) if (q[i].tabIndex >= 0 && q[i].offsetParent && q[i].getClientRects().length) return q[i]; return null; }
  deck.addEventListener("scroll", function () { var o = cur; mark(); if (o !== cur) sync(); });
  tabs.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.slide); });
  window.deckStep = function (d) { var o = cur; go(cur + d); return o !== cur; };
  window.deckGo = go;
  window.deckSlideEl = function () { return slides[cur]; };
  window.deckCur = function () { return cur; };
  // tab strip: selection follows focus (Left/Right changes the slide at once)
  tabs.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var b = e.target.closest("button"); if (!b) return;
    var k = +b.dataset.slide + (e.key === "ArrowRight" ? 1 : -1); e.preventDefault();
    if (k < 0 || k >= DEFS.length) return;
    go(k); tabs.querySelectorAll("button")[k].focus();
  });
  // arrow keys: move focus to the nearest control in that direction (plain browsers have no spatial navigation; on the TV the WebView
  // does it natively, so there we only act at the edge); left/right with nothing beside the focus pages to the next section; [ ] and PageUp/PageDown always page
  function focusables(scope) {
    var out = [], q = scope.querySelectorAll("button,a[href],input,select,summary,[tabindex]");
    for (var i = 0; i < q.length; i++) { var f = q[i]; if (f.tabIndex < 0 || f.disabled || !f.offsetParent) continue; var sl = f.closest(".slide"); if (sl && sl !== slides[cur]) continue; var r = f.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) continue; out.push(f); }
    return out;
  }
  function nearest(el, dx, dy, scope) {
    var r = el.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, best = null, bs = 1e9;
    focusables(scope).forEach(function (f) {
      if (f === el || el.contains(f) || f.contains(el)) return;
      var b = f.getBoundingClientRect(), bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2, p, c;
      if (dx) { p = (bx - cx) * dx; if (p < 2 || b.top >= r.bottom - 1 || b.bottom <= r.top + 1) return; c = Math.abs(by - cy); }
      else { p = (by - cy) * dy; if (p < 2) return; c = Math.abs(bx - cx) * 3; }
      if (p + c < bs) { bs = p + c; best = f; }
    });
    return best;
  }
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    var t = e.target || {}; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === "PageDown" || e.key === "]") { e.preventDefault(); window.deckStep(1); return; }
    if (e.key === "PageUp" || e.key === "[") { e.preventDefault(); window.deckStep(-1); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
    var pq = document.getElementById("pq"); if (pq && !pq.hidden) return; // the player page owns its arrows
    var ov = $("#picker:not([hidden]),#gdrawer:not([hidden]),#drawer:not([hidden])"), scope = ov || document.body;
    if (!t.matches || !scope.contains(t) || t === document.body) { var f0 = firstFocus(ov || slides[cur]); if (f0) { e.preventDefault(); f0.focus(); } return; }
    var dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (t.closest && t.closest("#rail .lg") && dx) { // the rail is one stop; Left/Right walk along it
      var lg = [].slice.call(document.querySelectorAll("#rail .lg")), i = lg.indexOf(t) + dx; if (lg[i]) { e.preventDefault(); lg[i].focus(); } return;
    }
    var n = nearest(t, dx, dy, scope);
    if (n) { if (!isTV()) { e.preventDefault(); n.focus(); } return; }
    if (dx && !ov && slides[cur].contains(t)) { e.preventDefault(); if (window.deckStep(dx)) { var nf = firstFocus(slides[cur]); if (nf) nf.focus(); } }
  });
  window.addEventListener("resize", function () { deck.scrollLeft = cur * width(); fitSoon(); });

  /* ---- fit: shrink a slide's content (zoom) until nothing clips, so no section ever scrolls or cuts off ---- */
  var fitT = 0;
  function fitSoon() { clearTimeout(fitT); fitT = setTimeout(fitAllSlides, 60); }
  function over(i) { // anything inside (not just the slide itself) that cuts off its own content?
    var q = i.querySelectorAll("*"), cut = /hidden|clip/;
    for (var k = 0; k < q.length; k++) {
      var e = q[k]; if (e.scrollHeight <= e.clientHeight + 1 && e.scrollWidth <= e.clientWidth + 1) continue;
      var c = getComputedStyle(e); if (!cut.test(c.overflowX) && !cut.test(c.overflowY)) continue;
      if (c.webkitLineClamp && c.webkitLineClamp !== "none") continue;
      if (e.closest(".skin")) continue;
      return true;
    }
    return i.scrollHeight > i.clientHeight + 1 || i.scrollWidth > i.clientWidth + 1;
  }
  /* compact = phone / narrow window drawn at real size (class html.cz switches deck.css's compact layout on). The TV's quarter-width side panel is
     drawn zoomed out by the host (root zoom < 1): that one keeps the zoom-fit deck. */
  var cmq = window.matchMedia("(max-width:900px),(max-width:1100px) and (min-height:640px),(max-height:440px)"), root = document.documentElement;
  function setCz() { var c = cmq.matches && !(parseFloat(root.style.zoom) < .99) && root.dataset.bz !== "1"; root.classList.toggle("cz", c); return c; }
  /* a big plain viewport (1080p monitor / Docker twin) draws the 960x540 design scaled up, so it reads from the sofa; a host-set zoom (side panel) is left alone */
  function bigZoom() {
    var mine = root.dataset.bz === "1", hz = parseFloat(root.style.zoom), z = Math.round(Math.min(innerWidth / 960, innerHeight / 540) * 100) / 100;
    if (!mine && hz && hz !== 1) return;
    if (innerWidth <= 1100 || cmq.matches && !mine || z < 1.05) { if (mine) { root.style.zoom = ""; delete root.dataset.bz; } return; }
    if (hz !== z) { root.style.zoom = z; root.dataset.bz = "1"; }
  }
  bigZoom(); setCz(); window.addEventListener("resize", function () { bigZoom(); setCz(); rtoggle(); });
  new MutationObserver(function () { var o = root.classList.contains("cz"); setCz(); if (o !== root.classList.contains("cz")) { fitSoon(); deck.scrollLeft = cur * width(); rtoggle(); } }).observe(root, { attributes: true, attributeFilter: ["style"] });
  function fitOne(s) {
    var i = s.firstChild; i.style.zoom = ""; var z = 1;
    if (root.classList.contains("cz")) { s.dataset.z = 1; return; }
    while (z > .88 && over(i)) { z = Math.round((z - .03) * 100) / 100; i.style.zoom = z; }
    s.dataset.z = z;
  }
  function fitAllSlides() { slides.forEach(fitOne); deck.scrollLeft = cur * width(); }
  window.deckFit = fitAllSlides;

  /* ---- dense roster: photo + name + role + stats, grouped F | D + G ---- */
  var money = function (v) { return v == null ? "" : v >= 1e6 ? "$" + (Math.round(v / 1e5) / 10) + "M" : "$" + Math.round(v / 1e3) + "K"; };
  var ph = function (p, c) { return '<img class="ph' + (c ? " " + c : "") + '" src="' + phSrc(p) + '" alt="">'; };
  function prow(p) {
    var s = p.now, st = !s || !s.gp ? "No games yet" : p.group === "G" ? s.w + "-" + s.l + "-" + s.otl + " · " + sv(s.sv) : s.g + "G " + s.a + "A " + s.pts + "P";
    var q = /injur/i.test(p.status || "") ? "" : /game-time|day-to-day|question/i.test(p.status || "") ? " q" : "";
    var dot = p.status && p.status !== "Active" ? '<span class="dt" title="' + esc(p.status) + '"></span>' : "";
    var slot = lineSlot(p).replace("Line ", "L").replace("Pair ", "D");
    return '<button type="button" class="pr2' + q + '" data-id="' + p.id + '">' + ph(p) + '<span class="nm">#' + (p.num == null ? "" : p.num) + " " + esc(p.first) + " " + dn(p.last) + (p.captain ? '<span class="cp">C</span>' : "") + dot + '</span><span class="sub2">' + p.pos + (slot ? " · " + slot : "") + " · " + age(p.born) + " yrs · " + esc(p.country) + '</span><span class="st">' + st + '</span><span class="av">' + (p.contract ? money(p.contract.aav) + " thru " + String(p.contract.ends).slice(-2) : "") + "</span></button>";
  }
  function col(title, list, split, det, open) {
    var n = list.length + " player" + (list.length === 1 ? "" : "s");
    var h = det ? '<summary class="h3">' + title + "<i>" + n + "</i></summary>" : '<div class="h3">' + title + "<i>" + n + "</i></div>", tag = det ? "details" : "div";
    var body = "", at = det ? ' class="rc"' + (open ? " open" : "") : ' class="rc"';
    if (list.length) {
      if (split && !det) { var k = Math.ceil(list.length / 2); body = '<div class="rr"><div>' + list.slice(0, k).map(prow).join("") + "</div><div>" + list.slice(k).map(prow).join("") + "</div></div>"; }
      else body = '<div class="rr"><div>' + list.map(prow).join("") + "</div></div>";
    } else body = "<div></div>";
    return "<" + tag + at + ">" + h + body + "</" + tag + ">";
  }
  function rosterHTML(det) {
    var list = PL().filter(matches).sort(sorter); if (!list.length) return "";
    var F = list.filter(function (p) { return p.group === "F"; }), D = list.filter(function (p) { return p.group === "D"; }), G = list.filter(function (p) { return p.group === "G"; });
    if (det) return '<div class="rg">' + col("Forwards", F, true, true, true) + col("Defence", D, false, true) + col("Goalies", G, false, true) + "</div>";
    return '<div class="rg">' + col("Forwards", F, true) + '<div class="rside">' + col("Defence", D, false) + col("Goalies", G, false) + "</div></div>";
  }
  function denseRoster() {
    var body = $("#rosterBody"); if (!body || typeof PL !== "function") return;
    var h = rosterHTML(false); if (h) body.innerHTML = h;
    renderFilt();
  }
  /* The Roster slide shows the lineup; once a Team-slide row or bar filters the roster (or on a phone) it shows the dense list instead, under a removable chip */
  var rf = null;
  function filtLabel() {
    var a = []; if (state.acq.size) state.acq.forEach(function (k) { try { a.push(ACQ[k].label(T().short)); } catch (e) { a.push(k); } }); if (state.q) a.push(state.q); return a.join(", ");
  }
  function renderFilt() {
    var s = slides[2], i = s && s.firstChild; if (!i || typeof PL !== "function" || typeof state === "undefined") return;
    if (!rf) { rf = document.createElement("div"); rf.id = "rfilt"; i.insertBefore(rf, i.firstChild); rf.addEventListener("click", function (e) { if (e.target.closest("#rfx")) { clearFilter(); var f = firstFocus(s); if (f) f.focus(); } }); }
    var on = state.acq.size || state.q, cz = root.classList.contains("cz"), a = document.activeElement, hadFocus = a && rf.contains(a) && a.id !== "rfx";
    s.classList.toggle("filt", !!(on || cz));
    if (!on && !cz) { rf.innerHTML = ""; return; }
    var list = rosterHTML(cz);
    rf.innerHTML = (on ? '<button type="button" class="rchip" id="rfx" aria-label="Clear filter ' + esc(filtLabel()) + '"><span>Filtered: ' + esc(filtLabel()) + '</span><b aria-hidden="true">&times;</b></button>' : "") + (list ? "<div class=\"rfl\">" + list + "</div>" : '<p class="caption">No players match.</p>');
    if (hadFocus) { var f = firstFocus(rf); if (f) f.focus({ preventScroll: true }); }
  }
  function rtoggle() { if (typeof state !== "undefined" && typeof DATA !== "undefined" && DATA) { try { renderFilt(); } catch (e) {} } }
  /* ---- Overview: the whole lineup, "starting lineup" cards (photo left, big number right, name under it) ---- */
  function renderLines() {
    var el = $("#lines"); if (!el || typeof T !== "function" || typeof DATA === "undefined" || !DATA) return;
    var t = T(), tc = (t.colors && t.colors[0]) || "#1B3A8A", tc2 = (t.colors && t.colors[1]) || "#FFFFFF";
    if (tc.toLowerCase() === tc2.toLowerCase()) tc2 = "#FFFFFF";
    var txt = function (c) { var l = lum(c); return (l + .05) / .05 > 1.05 / (l + .05) ? "#141217" : "#FFFFFF"; };
    var rs = document.documentElement.style; rs.setProperty("--tc", tc); rs.setProperty("--tc2", tc2); rs.setProperty("--tx", txt(tc)); rs.setProperty("--tx2", txt(tc2)); rs.setProperty("--lg", t.logo ? "url(" + t.logo + ")" : "none");
    var pl = function (id, pos) { var p = byId(id); if (!p) return '<span class="lp empty"></span>';
      var n = p.now, isG = p.group === "G", gaa = n && n.gp && n.ga != null ? (n.ga / n.gp).toFixed(2) : null,
        sx = !n || !n.gp ? "" : isG ? '<span class="s1">' + n.gp + " GP · " + n.w + "-" + n.l + "-" + n.otl + '</span><span class="s1">' + sv(n.sv) + " SV%" + (gaa ? " · " + gaa + " GAA" : "") + "</span>" : n.g + "G " + n.a + "A " + n.pts + "P";
      var hs = 'https://assets.nhle.com/mugs/nhl/20252026/' + state.team + '/' + p.id + '.png';
      return '<button type="button" class="lp' + (isG ? " g" : "") + (p.status && p.status !== "Active" ? " inj" : "") + '" data-id="' + p.id + '" aria-label="' + esc(p.first + " " + p.last) + '"><img class="ph" src="' + hs + '" data-f="' + phSrc(p) + '" onerror="this.onerror=null;this.src=this.dataset.f" alt=""><span class="tx"><i class="pp">' + pos + '</i><b class="no">' + (p.num == null ? "" : p.num) + '</b><span class="ln">' + dn(p.last) + (p.captain ? " ★" : "") + '</span><span class="sx">' + sx + "</span></span></button>"; };
    var row = function (h, ids, poss) { return '<div class="lrow"><h4>' + h + "</h4>" + ids.map(function (id, k) { return pl(id, poss[k]); }).join("") + "</div>"; };
    var F = t.lines.map(function (l, i) { return row("L" + (i + 1), l, ["LW", "C", "RW"]); }).join("");
    var D = t.pairs.map(function (l, i) { return row("D" + (i + 1), l, ["LD", "RD"]); }).join("");
    var G = row("G", t.goalies.slice(0, 2), ["G", "G"]);
    var used = {}; t.lines.concat(t.pairs).forEach(function (l) { l.forEach(function (id) { used[id] = 1; }); }); t.goalies.slice(0, 2).forEach(function (id) { used[id] = 1; });
    var rest = PL().filter(function (p) { return !used[p.id]; }).sort(function (a, b) { return (a.group === b.group ? 0 : a.group < b.group ? 1 : -1) || (a.num || 99) - (b.num || 99); });
    var out = (t.out || []).map(byId).filter(Boolean);
    var ex = rest.length ? '<div id="rest"><h4>Reserves and out</h4>' + rest.map(function (p) { return pl(p.id, p.pos); }).join("") + "</div>" : "";
    el.innerHTML = '<div class="lblk f" style="--r:' + t.lines.length + '">' + F + '</div><div class="lblk d" style="--r:' + (t.pairs.length + 1) + ';--pr:' + t.pairs.length + '">' + D + G + "</div>" + ex;
  }
  /* ---- Team: cap hits + scoring leaders ---- */
  function renderCap() {
    var host = $("#team .panels"); if (!host || typeof PL !== "function" || typeof DATA === "undefined" || !DATA) return;
    var col3 = $("#capcol"); if (!col3) { col3 = document.createElement("div"); col3.id = "capcol"; col3.innerHTML = '<div class="panel" id="cap"></div><div class="panel" id="lead"></div>'; host.appendChild(col3); }
    var P = PL(), row = function (p, r) { return '<button type="button" class="mrow" data-id="' + p.id + '">' + ph(p, "s") + "<b>" + esc(p.first[0]) + ". " + dn(p.last) + "</b><em>" + r + "</em></button>"; };
    var cap = P.filter(function (p) { return p.contract; }).sort(function (a, b) { return b.contract.aav - a.contract.aav; }).slice(0, 5);
    var sc = P.filter(function (p) { return p.group !== "G" && p.now && p.now.gp; }).sort(function (a, b) { return b.now.pts - a.now.pts || b.now.g - a.now.g; }).slice(0, 5);
    $("#cap").innerHTML = '<div class="h3">Top cap hits<i>AAV · through</i></div><div class="mini">' + (cap.length ? "" : '<div class="muted">Contract data not available yet</div>') + cap.map(function (p) { return row(p, money(p.contract.aav) + " · " + String(p.contract.ends).slice(0, 4) + "-" + String(p.contract.ends).slice(-2)); }).join("") + "</div>";
    $("#lead").innerHTML = '<div class="h3">Scoring leaders<i>G · A · P</i></div><div class="mini">' + (sc.length ? "" : '<div class="muted">No games played yet</div>') + sc.map(function (p) { return row(p, p.now.g + " · " + p.now.a + " · " + p.now.pts); }).join("") + "</div>";
  }
  /* ---- live NHL schedule for the current team. api-web.nhle.com sends no CORS header: on the TV the host fetches it (Android.get);
     on the PC Electron runs with webSecurity off, so a plain fetch works. Falls back to the bundled schedule. ---- */
  var nhlN = 0, LIVE = {}, OFF = {}; // OFF[abbr]: the last live refresh failed // LIVE[abbr] = that team's games, in the bundled schedule's shape
  function nhlGet(path, cb) {
    var url = "https://api-web.nhle.com/" + path, A = null;
    try { A = window.Android || (window.parent && window.parent.Android) || null; } catch (e) {}
    if (A && A.get) { var name = "__nhl" + (++nhlN); window[name] = function (t, e) { try { delete window[name]; } catch (x) {} cb(t, e || ""); }; A.get(url, "nhlRelay.bind(null,\"" + name + "\")"); return; }
    fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(function (t) { cb(t, ""); }).catch(function (e) { cb("", String(e)); });
  }
  window.addEventListener("message", function (e) { var m = e.data; if (m && m.nem && m.cmd === "nhl" && typeof window[m.n] === "function") window[m.n](m.t, m.e); }); // the top window relays Android.get results here
  function liveRows(j, ab) {
    return (j.games || []).map(function (g) {
      var home = g.homeTeam.abbrev === ab, us = home ? g.homeTeam : g.awayTeam, them = home ? g.awayTeam : g.homeTeam, o = g.gameOutcome && g.gameOutcome.lastPeriodType;
      return { id: g.id, start: g.startTimeUTC, home: home, opp: them.abbrev, oppShort: (them.commonName && them.commonName.default) || them.abbrev, venue: (g.venue && g.venue.default) || "", state: g.gameState, us: us.score, them: them.score, ot: o === "OT" || o === "SO" ? o : "REG" };
    });
  }
  function loadLive(ab) { // refresh every 10 minutes and on team change; a failed load keeps the last good data (or the bundled schedule)
    if (!ab) return;
    nhlGet("v1/club-schedule-season/" + ab + "/now", function (t, e) {
      OFF[ab] = true;
      try { var j = JSON.parse(t); if (j && j.games && j.games.length) { LIVE[ab] = liveRows(j, ab); OFF[ab] = false; } } catch (x) { console.log("deck live " + ab + " " + (e || x)); }
      if (typeof state !== "undefined" && state.team === ab) { renderOv(); renderCal(); }
    });
  }
  var fin = function (g) { return g.state === "OFF" || g.state === "FINAL"; };
  function teamGames(ab) {
    if (LIVE[ab]) return LIVE[ab];
    return (typeof DATA !== "undefined" && DATA && DATA.teams[ab] && DATA.teams[ab].schedule) || [];
  }
  function nextFor(ab) { return teamGames(ab).find(function (g) { return !fin(g); }) || null; }

  /* ---- Games: one team, a month calendar (Mon-Sun) + the selected day's games. Every day is a button (data-cday), every game is a button (data-gid). ---- */
  var calM = null, calSel = null, calBy = {}; // month shown {y, m}, selected day (ISO), games by ISO day
  var pad2 = function (n) { return String(n).padStart(2, "0"); };
  var isoOf = function (y, m, n) { return y + "-" + pad2(m + 1) + "-" + pad2(n); };
  var isLiveG = function (g) { return g.state === "LIVE" || g.state === "CRIT"; };
  var timeOf = function (g) { return new Date(g.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
  var arw = function (d) { return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="' + (d < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  function gShort(g) { // label for a calendar cell
    if (fin(g)) return (g.us > g.them ? "W " : "L ") + g.us + "-" + g.them + (g.ot !== "REG" ? " " + g.ot : "");
    if (isLiveG(g)) return "LIVE " + g.us + "-" + g.them;
    return (g.home ? "vs " : "@ ") + esc(g.opp);
  }
  function gRow(g, n, wd, today, skip) { // one game as a full-width button (compact month list); the day panel's copy is a read-only echo (tabindex -1)
    var pl = fin(g), lv = isLiveG(g);
    return '<button type="button" class="cr game' + (pl ? " done" : "") + (lv ? " live" : "") + (today ? " today" : "") + '" data-gid="' + g.id + '"' + (skip ? ' tabindex="-1"' : "") + '><span class="cd-d"><b>' + n + "</b><i>" + wd + '</i></span><img src="logos/' + esc(g.opp) + '.svg" alt=""><span class="cd-t"><b>' + (g.home ? "vs " : "at ") + esc(g.oppShort || g.opp) + "</b>" + (today ? '<em class="tpill">Today</em>' : "") + "<span>" + (pl ? "Final" + (g.ot !== "REG" ? " " + g.ot : "") : lv ? "Live" : timeOf(g)) + (g.venue ? " &middot; " + esc(g.venue) : "") + '</span></span><span class="cd-s">' + (pl ? (g.us > g.them ? "W " : "L ") + g.us + "-" + g.them : lv ? g.us + "-" + g.them : "") + "</span></button>";
  }
  function dayRows(iso) {
    var d = new Date(iso + "T12:00:00Z"), n = d.getUTCDate(), wd = d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }), l = calBy[iso] || [];
    return '<h4 class="calh">' + esc(d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" })) + " &middot; " + (l.length ? l.length + " game" + (l.length > 1 ? "s" : "") : "no games") + "</h4>" +
      (l.length ? l.map(function (g) { return gRow(g, n, wd, iso === todayET(), true); }).join("") : '<div class="none">No games on this day</div>');
  }
  function selectDay(iso) { // update in place (no rebuild), so the D-pad focus stays on the day button
    calSel = iso; var c = $("#cal"); if (!c) return;
    c.querySelectorAll("[data-cday]").forEach(function (b) { var on = b.dataset.cday === iso; b.setAttribute("aria-pressed", String(on)); var p = b.closest(".cd"); if (p) p.classList.toggle("sel", on); });
    var dp = c.querySelector(".calday"); if (dp) dp.innerHTML = dayRows(iso);
    var st = c.querySelector(".cs[aria-pressed=true]"); if (st && st.offsetParent) try { st.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    fitSoon();
  }
  function renderCal() {
    var s = $(".s-gm .si"); if (!s || typeof DATA === "undefined" || !DATA || typeof state === "undefined") return;
    var csk = $("#calsk"); if (csk) csk.remove();
    var c = $("#cal");
    if (!c) { c = document.createElement("div"); c.id = "cal"; s.appendChild(c); c.addEventListener("click", calClick); }
    var a = document.activeElement, keep = a && c.contains(a) ? (a.dataset.cday ? '[data-cday="' + a.dataset.cday + '"]' : a.dataset.gid ? '[data-gid="' + a.dataset.gid + '"]' : a.dataset.m ? '.calnav[data-m="' + a.dataset.m + '"]' : a.dataset.today ? ".caltoday" : "") : "";
    var today = todayET();
    if (!calM) calM = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 };
    var first = new Date(Date.UTC(calM.y, calM.m, 1)), lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(calM.y, calM.m + 1, 0)).getUTCDate(), rows = Math.ceil((lead + days) / 7), pre = calM.y + "-" + pad2(calM.m + 1);
    calBy = {}; teamGames(state.team).forEach(function (g) { var d = etDay(g.start); (calBy[d] = calBy[d] || []).push(g); });
    if (!calSel || calSel.slice(0, 7) !== pre) { calSel = today.slice(0, 7) === pre ? today : null; if (!calSel) for (var q = 1; q <= days; q++) if (calBy[isoOf(calM.y, calM.m, q)]) { calSel = isoOf(calM.y, calM.m, q); break; } if (!calSel) calSel = pre + "-01"; }
    var title = first.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" }), cells = "", strip = "", list = "";
    for (var i = 0; i < rows * 7; i++) {
      var n = i - lead + 1;
      if (n < 1 || n > days) { cells += '<div class="cd out"></div>'; continue; }
      var iso = isoOf(calM.y, calM.m, n), g = (calBy[iso] || [])[0], wd = new Date(Date.UTC(calM.y, calM.m, n)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }), sel = iso === calSel;
      var cls = "cd" + (iso === today ? " today" : "") + (sel ? " sel" : "") + (g ? " game" + (fin(g) ? " done" : "") + (isLiveG(g) ? " live" : "") : "");
      var lab = new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }) + (g ? ", game " + (g.home ? "vs " : "at ") + g.opp + ", " + (fin(g) ? "final" : isLiveG(g) ? "live" : timeOf(g)) + ", open game" : ", no games") + (iso === today ? ", today" : "");
      // a game day is ONE stop that opens the game; days without a game are mouse/touch only (tabindex -1)
      cells += '<div class="' + cls + '"><button type="button" class="cdb" data-cday="' + iso + '"' + (g ? ' data-gid="' + g.id + '"' : ' tabindex="-1"') + ' aria-pressed="' + sel + '" aria-label="' + esc(lab) + '"><span class="cdt"><b class="dn">' + n + "</b>" + (g ? '<img src="logos/' + esc(g.opp) + '.svg" alt="">' : "") + "</span>" +
        (g ? '<span class="cg"><span class="cl">' + gShort(g) + '</span><span class="ct">' + (fin(g) ? "Final" : isLiveG(g) ? "Live" : timeOf(g)) + "</span></span>" : "") + "</button></div>";
      strip += '<button type="button" class="cs' + (g ? " game" : "") + (iso === today ? " today" : "") + '" data-cday="' + iso + '" tabindex="-1" aria-pressed="' + sel + '" aria-label="' + esc(lab) + '"><i>' + wd + "</i><b>" + n + "</b><u></u></button>";
      if (g) list += gRow(g, n, wd, iso === today);
    }
    var head = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return '<div class="cdh">' + d + "</div>"; }).join("");
    var atToday = calM.y === +today.slice(0, 4) && calM.m === +today.slice(5, 7) - 1 && calSel === today;
    c.innerHTML = '<div class="calbar"><button type="button" class="calnav" data-m="-1" aria-label="Previous month">' + arw(-1) + "</button><h3>" + esc(title) + '</h3><button type="button" class="calnav" data-m="1" aria-label="Next month">' + arw(1) + '</button><button type="button" class="caltoday" data-today="1"' + (atToday ? ' tabindex="-1" aria-hidden="true" style="visibility:hidden"' : "") + ">Today</button>" + (OFF[state.team] ? '<span class="caption offl" role="status">Offline. Showing ' + (LIVE[state.team] ? "the last update" : "the saved schedule") + "</span>" : "") + "</div>" +
      '<div class="calstrip">' + strip + '</div><div class="calg" style="grid-template-rows:auto repeat(' + rows + ',minmax(0,1fr))">' + head + cells + '</div><div class="calday">' + dayRows(calSel) + '</div><div class="callist"><h4 class="calh">Games this month</h4>' + (list || '<div class="none">No games this month</div>') + "</div>";
    if (keep) { var k = c.querySelector(keep); if (k) k.focus({ preventScroll: true }); }
    var st = c.querySelector(".cs[aria-pressed=true]"); if (st && st.offsetParent) try { st.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
  }
  function calClick(e) {
    var t = e.target, b = t.closest && t.closest(".calnav"), dy = t.closest && t.closest("[data-cday]"), g = t.closest && t.closest("[data-gid]");
    if (t.closest && t.closest("[data-today]")) { var td = todayET(); calM = { y: +td.slice(0, 4), m: +td.slice(5, 7) - 1 }; calSel = td; renderCal(); var k = $('#cal [data-cday="' + td + '"]'); if (k) k.focus({ preventScroll: true }); return; }
    if (b) { var d = new Date(Date.UTC(calM.y, calM.m + (+b.dataset.m), 1)); calM = { y: d.getUTCFullYear(), m: d.getUTCMonth() }; renderCal(); return; }
    if (dy) selectDay(dy.dataset.cday);
    // any game (played, live, upcoming) opens the guide's game drawer: box score for finals, matchup for the rest
    if (g && typeof openGame === "function") openGame(+g.dataset.gid);
  }

  /* ---- Back: the player page first, then an open drawer (the guide's own Escape handler), then Overview; Overview goes to the host ---- */
  function deckHasBack() { var pq = document.getElementById("pq"); return !!(pq && !pq.hidden) || cur > 0; }
  window.deckHasBack = deckHasBack;
  function deckBack() {
    var pq = document.getElementById("pq");
    if (pq && !pq.hidden) { closePlayer(); return true; }
    if ($("#gdrawer:not([hidden]),#drawer:not([hidden]),#picker:not([hidden])")) return false;
    if (cur === 2 && (state.acq.size || state.q)) { clearFilter(); var f2 = firstFocus(slides[2]); if (f2) f2.focus(); return true; } // Back clears a Team-slide filter before it leaves the Roster
    if (cur > 0) { go(0); var t0 = tabs.querySelector("button"); if (t0) t0.focus(); return true; } // Back: Overview first, then out of the guide
    return false;
  }
  document.addEventListener("keydown", function (e) { // capture: runs before the guide's own Escape handler, so one press closes one thing
    if (e.defaultPrevented) return;
    var back = e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack" || e.keyCode === 4 || e.keyCode === 27;
    if (back && deckBack()) { e.preventDefault(); e.stopImmediatePropagation(); if (window.guideReport) guideReport(); }
  }, true);

  /* ---- Overview dashboard: team photo hero (or team-colour gradient) over frosted stat cards; "Next game" is the old #gameday ---- */
  var HM = null; // team hero photos, data/heroes.json
  var HF = {}; // focus point per team, data/heroes_focus.json ("x% y%" background-position: the player's eyes)
  fetch("data/heroes.json").then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { HM = j; renderOv(); }).catch(function () {});
  fetch("data/heroes_focus.json").then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { HF = j; renderOv(); }).catch(function () {});
  function renderOv() {
    var s = $(".s-ov .si"); if (!s || typeof T !== "function" || typeof DATA === "undefined" || !DATA) return;
    var t = T(), gd = $("#gameday"), h = $("#ov");
    if (!t) return; // no team loaded yet: the next renderAll/renderOv call draws it
    if (gd) s.appendChild(gd); // park the next-game card so the rebuild below cannot destroy it
    if (!h) { h = document.createElement("div"); h.id = "ov"; s.insertBefore(h, s.firstChild); }
    var photo = HM && HM[state.team]; // team hero photo, keyed by the current team code
    var bg = photo ? "background-image:linear-gradient(0deg,rgba(8,8,12,.85),rgba(8,8,12,.15) 60%,rgba(8,8,12,.05)),url('" + photo + "');background-position:" + (HF[state.team] || "50% 30%")
      : "background-image:linear-gradient(160deg,var(--tc,#1B3A8A) 0%,#0a0a0d 92%)";
    var rank = (t.divRank ? ordinal(t.divRank) + " in " : "") + esc(t.division || "");
    var hero = '<section class="ov-hero" style="' + bg + '"><div class="ov-id"><span class="ov-eye">' + rank + '</span><div class="ov-name"><h2>' + esc(t.name) + "</h2></div></div></section>";
    var card = function (lab, body, cls) { return '<div class="ovc' + (cls ? " " + cls : "") + '"><span class="ovl">' + lab + "</span>" + body + "</div>"; };
    var cards = [
      card("Record", '<b class="ovv">' + esc(t.record || "—").replace(/-/g, '<i class="rs">–</i>') + '</b><span class="ovs">' + (t.gp != null ? t.gp + " games played" : "") + "</span>"),
      card("Points", '<b class="ovv">' + (t.points == null ? "—" : t.points) + '</b><span class="ovs">' + (t.divRank ? ordinal(t.divRank) + " in " + esc(t.division || "") : "") + "</span>"),
      card("Streak", '<b class="ovv">' + esc(t.streak || "None") + '</b><span class="ovs">' + (t.l10 ? "L10 " + esc(t.l10) : t.streak ? "" : "Not played yet") + "</span>"),
      nextCard(t)
    ];
    var a = document.activeElement, refocus = a && a.classList && a.classList.contains("ovnext") && h.contains(a);
    h.innerHTML = hero + '<div class="ovcards">' + cards.join("") + "</div>";
    if (refocus) { var nb = h.querySelector(".ovnext[data-gid]"); if (nb) nb.focus({ preventScroll: true }); }
  }
  // Next game card: plain text from nextGame() (the old orb is hidden on this slide, #gameday stays parked)
  function nextCard(t) {
    var g = nextFor(state.team), today = g && etDay(g.start) === todayET(), lab = today ? "Game day" : "Next game";
    if (!g) return '<div class="ovc ovnext"><span class="ovl">' + lab + '</span><b class="ovv">Season over</b></div>';
    var when = (today ? "Tonight" : gDate(g)) + " · " + gTime(g) + " ET · " + esc(g.venue);
    return '<button type="button" class="ovc ovnext" data-gid="' + g.id + '" aria-label="' + lab + ": " + (g.home ? "vs " : "at ") + esc(g.oppShort) + ", " + (today ? "tonight" : gDate(g)) + " " + gTime(g) + ' ET. Open game"><span class="ovl">' + lab + '<span class="ovgo" aria-hidden="true">Open &rsaquo;</span></span>' +
      '<div class="ovrow"><img class="ovlg" src="logos/' + esc(g.opp) + '.svg" alt=""><b class="ovv">' + (g.home ? "vs" : "at") + " " + esc(g.oppShort) + "</b></div>" +
      '<span class="ovs">' + when + "</span></button>";
  }
  function extras() { renderLines(); renderOv(); renderCap(); }

  /* wrap the guide's own renderers (declared with function, so they can be replaced) */
  function wrapFn(name, after) { var f = window[name]; if (typeof f !== "function") return; window[name] = function () { var r = f.apply(this, arguments); try { after(); } catch (e) { console.log("deck " + name + " " + e); } return r; }; }
  wrapFn("renderRoster", function () { denseRoster(); fitSoon(); });
  wrapFn("renderAll", function () { extras(); railRove(); fitSoon(); });
  wrapFn("renderGames", function () { var g = $("#mgrid"); if (g) g.dataset.n = g.querySelectorAll(".mc").length; fitSoon(); });
  var _setTeam = window.setTeam;
  // any team switch (picker, rail logo, host message) lands on that team's Overview
  if (_setTeam) window.setTeam = function (ab) {
    if (typeof DATA !== "undefined" && DATA && DATA.teams && !DATA.teams[ab]) { var oo = $("#ov"); if (oo) oo.innerHTML = skOv(); } // not cached: skeleton Overview until it loads
    return _setTeam(ab).then(function () {
      loadLive(ab);
      go(0); fitSoon();
      var a = document.activeElement; // the picker or game drawer closed under the focus: put it back on the team button so the D-pad has somewhere to start
      if (booted && (!a || a === document.body || !a.offsetParent || !(top.contains(a) || slides[0].contains(a)))) { var sb = $("#switchBtn"); if (sb) sb.focus(); }
      railRove();
    }, function (e) { try { renderOv(); } catch (x) {} throw e; });
  };
  var _setMode = window.setMode;
  if (_setMode) window.setMode = function (m, d) { var r = _setMode(m, d); if (m === "games" && booted && cur !== 4) go(4); fitSoon(); return r; };
  window.showMode = function () { // never hide a slide: only update the pressed states
    var g = state.mode === "games"; document.querySelectorAll("#rail .lg").forEach(function (b) { b.setAttribute("aria-pressed", String(!g && b.dataset.team === state.team)); });
    railRove();
  };
  /* the rail is ONE tab stop (the current team); Left/Right walk along it (keydown above), Up/Down leaves. It is hidden on the TV and on narrow screens, where the picker is the single path. */
  function railRove() {
    var all = document.querySelectorAll("#rail .lg"), cur2 = document.querySelector('#rail .lg[aria-pressed="true"]') || all[0];
    all.forEach(function (b) { b.tabIndex = b === cur2 ? 0 : -1; if (!b.title) b.title = b.getAttribute("aria-label") || ""; });
  }
  // section buttons inside the guide ("News and lines ->") used scrollIntoView: page there instead
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-goto]"); if (!b) return;
    var m = { news: 1, roster: 2, team: 3 }[b.dataset.goto]; if (m != null) { e.stopImmediatePropagation(); go(m); }
  }, true);
  document.addEventListener("click", function (e) { // roster filters from the Team slide open the Roster slide, showing the filtered list under a chip
    var b = e.target.closest && e.target.closest(".acqrow,.bar[data-q]"); if (!b) return;
    setTimeout(function () { renderFilt(); go(2); var c = $("#rfx"); if (c) c.focus({ preventScroll: true }); }, 0);
  });
  document.addEventListener("click", function (e) { // Overview: the next-game card opens the game drawer
    var b = e.target.closest && e.target.closest(".ovnext[data-gid]"); if (b && typeof openGame === "function") openGame(+b.dataset.gid);
  });
  document.addEventListener("click", function (e) { // News on the TV: no browser to land in, so the story opens in the guide's own drawer
    var a = e.target.closest && e.target.closest("#newsList a[data-i]"); if (a && isTV() && typeof openNews === "function") { e.preventDefault(); openNews(+a.dataset.i); }
  });
  // boot: wait for the guide's data, then start on Overview in team mode
  var tries = 0, iv = setInterval(function () {
    tries++; if (typeof DATA !== "undefined" && DATA && typeof renderAll === "function" && $("#h1") && $("#h1").textContent !== "NHL Teams" || tries > 150) {
      clearInterval(iv);
      if (typeof state !== "undefined") { loadLive(state.team); setInterval(function () { loadLive(state.team); }, 600000); }
      if (typeof state !== "undefined") {
        if (state.mode === "games") { var wantGames = /^#games/i.test(H0); state.mode = "team"; try { renderAll(); } catch (e) { console.log("deck boot " + e); } if (wantGames) { booted = true; setMode("games", state.day); go(4); return; } }
        else { denseRoster(); extras(); }
      }
      booted = true; go(0); fitSoon(); railRove();
      var bootFocus = function () { var f = document.activeElement; if (f && f !== document.body && f.offsetParent) return; var nb = $(".ovnext[data-gid]"); if (nb && cur === 0) nb.focus({ preventScroll: true }); }; // the primary action is where the D-pad starts (retried: the first renders replace the card)
      bootFocus(); setTimeout(bootFocus, 500); setTimeout(bootFocus, 1800);
    }
  }, 100);
  mark();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
})();

/* Player page: full-screen card (replaces the old side drawer). Overrides openPlayer/closePlayer from index.html;
   the guide's click, Escape and Left/Right handlers call those by name, so they route here. */
(function () {
  var box = null;
  var sv3 = function (v) { return v == null ? "\u2013" : v.toFixed(3).replace(/^0/, ""); };
  var fmt = function (k, s) { if (!s || !s.gp) return "\u2013"; if (k === "sv") return sv3(s.sv); return s[k] == null ? "\u2013" : s[k]; };
  function build() {
    if (box) return box;
    box = document.createElement("div"); box.id = "pq"; box.className = "pq"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "ppName");
    box.addEventListener("click", function (e) { if (e.target.closest(".pq-back")) closePlayer(); });
    document.body.appendChild(box); return box;
  }

  function pqOpen(id) {
    var p = byId(id); if (!p) return;
    if (!state.open) lastFocus = document.activeElement;
    state.open = p.id;
    var t = T(), g = p.group === "G", c = p.contract, el = build();
    var order = PL().filter(matches).sort(sorter), i = Math.max(0, order.findIndex(function (x) { return x.id === p.id; }));
    var prev = order[(i - 1 + order.length) % order.length] || p, next = order[(i + 1) % order.length] || p;
    var cols = g ? [["GP", "gp"], ["W", "w"], ["L", "l"], ["OTL", "otl"], ["GA", "ga"], ["SV%", "sv"]]
                 : [["GP", "gp"], ["G", "g"], ["A", "a"], ["P", "pts"]];
    var statRow = function (label, s) {
      return '<tr><th scope="row">' + label + (s && s.gp ? "" : '<small>No NHL games</small>') + "</th>" +
        cols.map(function (k) { return '<td><b class="tab">' + fmt(k[1], s) + "</b></td>"; }).join("") + "</tr>";
    };
    var facts = p.ht || p.wt
      ? [["Height", ht(p.ht) || "\u2013"], ["Weight", p.wt ? p.wt + " lb" : "\u2013"]]
      : [["Age", age(p.born)], ["Position", p.pos]];
    var det = [
      ["Born", fmtDate(p.born) + " (" + age(p.born) + ")"],
      ["Birthplace", [place(p), p.countryName].filter(Boolean).join(", ")],
      ["Draft", p.draft],
      ["Contract", c ? money(c.aav) + " AAV \u00b7 to " + c.ends + " \u00b7 " + (c.fa === "RFA" ? "RFA" : "UFA") : null],
      [g ? "Catches" : "Shoots", p.shoots === "L" ? "Left" : "Right"],
      ["Role", p.role],
      ["Status", p.status]
    ].filter(function (r) { return r[1]; });
    var photo = '<img class="pq-photo" alt="' + esc(p.first + " " + p.last) + '" src="https://assets.nhle.com/mugs/nhl/20252026/' + state.team + "/" + p.id +
      '.png" data-f="' + phSrc(p) + '" onerror="this.onerror=null;this.src=this.dataset.f">';
    el.innerHTML =
      '<div class="pq-bar"><button type="button" class="pq-btn pq-back">&larr; <span class="pq-lbl">Back</span></button>' +
      '<div class="pq-nav">' +
      '<button type="button" class="pq-btn" id="dPrev" data-id="' + prev.id + '" aria-label="Previous player">&larr;<span class="pq-lbl"> ' + esc(prev.last) + "</span></button>" +
      '<button type="button" class="pq-btn" id="dNext" data-id="' + next.id + '" aria-label="Next player"><span class="pq-lbl">' + esc(next.last) + " </span>&rarr;</button>" +
      '<button type="button" class="pq-btn pq-x" id="dClose" aria-label="Close">&times;</button></div></div>' +
      '<div class="pq-top">' +
        '<div class="pq-art"><div class="pq-logo"></div>' + photo + "</div>" +
        '<div class="pq-info">' +
          '<div class="pq-first">' + esc(p.first) + "</div>" +
          '<h1 class="pq-last" id="ppName">' + esc(p.last) + "</h1>" +
          '<div class="pq-meta">' + (t.logo ? '<img src="' + t.logo + '" alt="">' : "") +
            "<span>#" + (p.num ?? "\u2013") + " | " + esc(p.pos) + "</span>" +
            (p.captain ? '<span class="pq-cap" title="Captain">C</span>' : "") + "</div>" +
          '<div class="pq-rule"></div>' +
          '<div class="pq-facts">' + facts.map(function (f) { return "<div><span>" + f[0] + "</span><b>" + esc(f[1]) + "</b></div>"; }).join("") + "</div>" +
          '<dl class="pq-det">' + det.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" +
        "</div></div>" +
      '<div class="pq-band"><table class="pq-stats"><thead><tr><th></th>' +
        cols.map(function (k) { return '<th scope="col">' + k[0] + "</th>"; }).join("") + "</tr></thead><tbody>" +
        statRow("This season", p.now) + statRow("Last season", p.prev) + "</tbody></table></div>";
    el.style.setProperty("--tc", t.colors ? t.colors[0] : "#1B3A8A");
    el.hidden = false; el.scrollTop = 0; el.querySelector("#dClose").focus();
    if (window.guideReport) guideReport();
  }
  openPlayer = pqOpen;
  closePlayer = function () {
    if (!box || box.hidden) return;
    state.open = null; box.hidden = true;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
    if (window.guideReport) guideReport();
  };
})();
