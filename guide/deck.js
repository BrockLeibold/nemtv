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
  var tabs = document.createElement("nav"); tabs.id = "tabs"; tabs.setAttribute("aria-label", "Sections");
  tabs.innerHTML = DEFS.map(function (d, k) { return '<button type="button" data-slide="' + k + '">' + d[0] + "</button>"; }).join("");
  top.appendChild(tabs);
  var cur = 0;
  function width() { return deck.clientWidth || 1; }
  function mark() {
    cur = Math.max(0, Math.min(DEFS.length - 1, Math.round(deck.scrollLeft / width())));
    tabs.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-current", String(k === cur)); });
  }
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
    k = Math.max(0, Math.min(DEFS.length - 1, k)); cur = k;
    deck.style.scrollBehavior = "auto"; deck.scrollLeft = k * width();
    mark(); sync(); if (k === 4) renderCal(); if (window.guideReport) guideReport();
  }
  deck.addEventListener("scroll", function () { var o = cur; mark(); if (o !== cur) sync(); });
  tabs.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.slide); });
  window.deckStep = function (d) { var o = cur; go(cur + d); return o !== cur; };
  window.deckGo = go;
  window.deckSlideEl = function () { return slides[cur]; };
  window.deckCur = function () { return cur; };
  // arrow keys: left/right at the edge of a slide page to the next section; [ ] and PageUp/PageDown always page
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    var t = e.target || {}; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === "PageDown" || e.key === "]") { e.preventDefault(); window.deckStep(1); }
    else if (e.key === "PageUp" || e.key === "[") { e.preventDefault(); window.deckStep(-1); }
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
  function fitOne(s) {
    var i = s.firstChild; i.style.zoom = ""; var z = 1;
    while (z > .5 && over(i)) { z = Math.round((z - .03) * 100) / 100; i.style.zoom = z; }
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
  function col(title, list, split) {
    var h = '<div class="h3">' + title + "<i>" + list.length + " players</i></div>";
    if (!list.length) return '<div class="rc">' + h + "<div></div></div>";
    var body;
    if (split) { var n = Math.ceil(list.length / 2); body = '<div class="rr"><div>' + list.slice(0, n).map(prow).join("") + "</div><div>" + list.slice(n).map(prow).join("") + "</div></div>"; }
    else body = '<div class="rr"><div>' + list.map(prow).join("") + "</div></div>";
    return '<div class="rc">' + h + body + "</div>";
  }
  function denseRoster() {
    var body = $("#rosterBody"); if (!body || typeof PL !== "function") return;
    var list = PL().filter(matches).sort(sorter); if (!list.length) return;
    var F = list.filter(function (p) { return p.group === "F"; }), D = list.filter(function (p) { return p.group === "D"; }), G = list.filter(function (p) { return p.group === "G"; });
    body.innerHTML = '<div class="rg">' + col("Forwards", F, true) + '<div class="rside">' + col("Defence", D, false) + col("Goalies", G, false) + "</div></div>";
  }
  /* ---- Overview: the whole lineup, "starting lineup" cards (photo left, big number right, name under it) ---- */
  function renderLines() {
    var el = $("#lines"); if (!el || typeof T !== "function" || typeof DATA === "undefined" || !DATA) return;
    var t = T(), tc = (t.colors && t.colors[0]) || "#1B3A8A", tc2 = (t.colors && t.colors[1]) || "#FFFFFF";
    if (tc.toLowerCase() === tc2.toLowerCase()) tc2 = "#FFFFFF";
    var txt = function (c) { var l = lum(c); return (l + .05) / .05 > 1.05 / (l + .05) ? "#141217" : "#FFFFFF"; };
    var rs = document.documentElement.style; rs.setProperty("--tc", tc); rs.setProperty("--tc2", tc2); rs.setProperty("--tx", txt(tc)); rs.setProperty("--tx2", txt(tc2)); rs.setProperty("--lg", t.logo ? "url(" + t.logo + ")" : "none");
    var pl = function (id, pos) { var p = byId(id); if (!p) return '<span class="lp empty"></span>';
      var n = p.now, sx = !n || !n.gp ? "" : p.group === "G" ? n.w + "-" + n.l + "-" + n.otl + " " + sv(n.sv) : n.g + "G " + n.a + "A " + n.pts + "P";
      var hs = 'https://assets.nhle.com/mugs/nhl/20252026/' + state.team + '/' + p.id + '.png';
      return '<button type="button" class="lp' + (p.status && p.status !== "Active" ? " inj" : "") + '" data-id="' + p.id + '" aria-label="' + esc(p.first + " " + p.last) + '"><img class="ph" src="' + hs + '" data-f="' + phSrc(p) + '" onerror="this.onerror=null;this.src=this.dataset.f" alt=""><span class="tx"><i class="pp">' + pos + '</i><b class="no">' + (p.num == null ? "" : p.num) + '</b><span class="ln">' + dn(p.last) + (p.captain ? " ★" : "") + '</span><span class="sx">' + sx + "</span></span></button>"; };
    var row = function (h, ids, poss) { return '<div class="lrow"><h4>' + h + "</h4>" + ids.map(function (id, k) { return pl(id, poss[k]); }).join("") + "</div>"; };
    var F = t.lines.map(function (l, i) { return row("L" + (i + 1), l, ["LW", "C", "RW"]); }).join("");
    var D = t.pairs.map(function (l, i) { return row("D" + (i + 1), l, ["LD", "RD"]); }).join("");
    var G = row("G", t.goalies.slice(0, 2), ["G", "G"]);
    var used = {}; t.lines.concat(t.pairs).forEach(function (l) { l.forEach(function (id) { used[id] = 1; }); }); t.goalies.slice(0, 2).forEach(function (id) { used[id] = 1; });
    var rest = PL().filter(function (p) { return !used[p.id]; }).sort(function (a, b) { return (a.group === b.group ? 0 : a.group < b.group ? 1 : -1) || (a.num || 99) - (b.num || 99); });
    var out = (t.out || []).map(byId).filter(Boolean);
    var ex = rest.length ? '<div id="rest"><h4>Reserves and out</h4>' + rest.map(function (p) { return pl(p.id, p.pos); }).join("") + "</div>" : "";
    el.innerHTML = '<div class="lblk f" style="--r:' + t.lines.length + '">' + F + '</div><div class="lblk d" style="--r:' + (t.pairs.length + 1) + '">' + D + G + "</div>" + ex;
  }
  /* ---- Team: cap hits + scoring leaders ---- */
  function renderCap() {
    var host = $("#team .panels"); if (!host || typeof PL !== "function" || typeof DATA === "undefined" || !DATA) return;
    var pn = $("#cap"); if (!pn) { pn = document.createElement("div"); pn.className = "panel"; pn.id = "cap"; host.appendChild(pn); }
    var P = PL(), row = function (p, r) { return '<button type="button" class="mrow" data-id="' + p.id + '">' + ph(p, "s") + "<b>" + esc(p.first[0]) + ". " + dn(p.last) + "</b><em>" + r + "</em></button>"; };
    var cap = P.filter(function (p) { return p.contract; }).sort(function (a, b) { return b.contract.aav - a.contract.aav; }).slice(0, 7);
    var sc = P.filter(function (p) { return p.group !== "G" && p.now && p.now.gp; }).sort(function (a, b) { return b.now.pts - a.now.pts || b.now.g - a.now.g; }).slice(0, 7);
    pn.innerHTML = '<div class="h3">Top cap hits<i>AAV · through</i></div><div class="mini">' + cap.map(function (p) { return row(p, money(p.contract.aav) + " · " + String(p.contract.ends).slice(0, 4) + "-" + String(p.contract.ends).slice(-2)); }).join("") + '</div><div class="h3">Scoring leaders<i>G · A · P</i></div><div class="mini">' + sc.map(function (p) { return row(p, p.now.g + " · " + p.now.a + " · " + p.now.pts); }).join("") + "</div>";
  }
  /* ---- live NHL schedule for the current team. api-web.nhle.com sends no CORS header: on the TV the host fetches it (Android.get);
     on the PC Electron runs with webSecurity off, so a plain fetch works. Falls back to the bundled schedule. ---- */
  var nhlN = 0, LIVE = {}; // LIVE[abbr] = that team's games, in the bundled schedule's shape
  function nhlGet(path, cb) {
    var url = "https://api-web.nhle.com/" + path, A = null;
    try { A = window.Android || (window.parent && window.parent.Android) || null; } catch (e) {}
    if (A && A.get) { var name = "__nhl" + (++nhlN); window[name] = function (t, e) { try { delete window[name]; } catch (x) {} cb(t, e || ""); }; A.get(url, name); return; }
    fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(function (t) { cb(t, ""); }).catch(function (e) { cb("", String(e)); });
  }
  function liveRows(j, ab) {
    return (j.games || []).map(function (g) {
      var home = g.homeTeam.abbrev === ab, us = home ? g.homeTeam : g.awayTeam, them = home ? g.awayTeam : g.homeTeam, o = g.gameOutcome && g.gameOutcome.lastPeriodType;
      return { id: g.id, start: g.startTimeUTC, home: home, opp: them.abbrev, oppShort: (them.commonName && them.commonName.default) || them.abbrev, venue: (g.venue && g.venue.default) || "", state: g.gameState, us: us.score, them: them.score, ot: o === "OT" || o === "SO" ? o : "REG" };
    });
  }
  function loadLive(ab) { // refresh every 10 minutes and on team change; a failed load keeps the last good data (or the bundled schedule)
    if (!ab) return;
    nhlGet("v1/club-schedule-season/" + ab + "/now", function (t, e) {
      try { var j = JSON.parse(t); if (j && j.games && j.games.length) LIVE[ab] = liveRows(j, ab); } catch (x) { console.log("deck live " + ab + " " + (e || x)); }
      if (typeof state !== "undefined" && state.team === ab) { renderOv(); renderCal(); }
    });
  }
  var fin = function (g) { return g.state === "OFF" || g.state === "FINAL"; };
  function teamGames(ab) {
    if (LIVE[ab]) return LIVE[ab];
    return (typeof DATA !== "undefined" && DATA && DATA.teams[ab] && DATA.teams[ab].schedule) || [];
  }
  function nextFor(ab) { return teamGames(ab).find(function (g) { return !fin(g); }) || null; }

  /* ---- Games: one team, a month calendar (Mon-Sun), no scroll ---- */
  var calM = null; // month shown: {y, m}
  function renderCal() {
    var s = $(".s-gm .si"); if (!s || typeof DATA === "undefined" || !DATA || typeof state === "undefined") return;
    var c = $("#cal");
    if (!c) { c = document.createElement("div"); c.id = "cal"; s.appendChild(c); c.addEventListener("click", calClick); }
    var today = todayET();
    if (!calM) calM = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 };
    var first = new Date(Date.UTC(calM.y, calM.m, 1)), lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(calM.y, calM.m + 1, 0)).getUTCDate(), rows = Math.ceil((lead + days) / 7);
    var byDay = {}; teamGames(state.team).forEach(function (g) { var d = etDay(g.start); (byDay[d] = byDay[d] || []).push(g); });
    var title = first.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" }), cells = "";
    for (var i = 0; i < rows * 7; i++) {
      var n = i - lead + 1;
      if (n < 1 || n > days) { cells += '<div class="cd out"></div>'; continue; }
      var iso = calM.y + "-" + String(calM.m + 1).padStart(2, "0") + "-" + String(n).padStart(2, "0"), g = (byDay[iso] || [])[0], cls = "cd" + (iso === today ? " today" : ""), body = '<div class="cdr"><b class="dn">' + n + "</b></div>", attr = "";
      if (g) {
        var played = fin(g), lab = played ? (g.us > g.them ? "W " : "L ") + g.us + "-" + g.them + (g.ot !== "REG" ? " " + g.ot : "") : (g.home ? "vs " : "@ ") + esc(g.opp);
        cls += " game" + (played ? " done" : ""); attr = ' data-gid="' + g.id + '"';
        body = '<div class="cdr"><b class="dn">' + n + '</b><img src="logos/' + esc(g.opp) + '.svg" alt=""></div><span class="cl">' + lab + '</span><span class="ct">' + (played ? "Final" : new Date(g.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })) + "</span>";
      }
      cells += '<div class="' + cls + '"' + attr + ">" + body + "</div>";
    }
    var head = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return '<div class="cdh">' + d + "</div>"; }).join("");
    c.innerHTML = '<div class="calbar"><button type="button" class="calnav" data-m="-1" aria-label="Previous month">&larr;</button><h3>' + esc(title) + '</h3><button type="button" class="calnav" data-m="1" aria-label="Next month">&rarr;</button></div>' +
      '<div class="calg" style="grid-template-rows:auto repeat(' + rows + ',minmax(0,1fr))">' + head + cells + "</div>";
  }
  function calClick(e) {
    var b = e.target.closest && e.target.closest(".calnav"), g = e.target.closest && e.target.closest("[data-gid]");
    if (b) { var d = new Date(Date.UTC(calM.y, calM.m + (+b.dataset.m), 1)); calM = { y: d.getUTCFullYear(), m: d.getUTCMonth() }; renderCal(); return; }
    // a played game opens the guide's game drawer (box score) when it has one in the bundled schedule; otherwise nothing
    if (g && typeof SCHED !== "undefined" && SCHED && SCHED.games.some(function (x) { return x.id === +g.dataset.gid; })) openGame(+g.dataset.gid);
  }

  /* ---- Back: the player page first, then an open drawer (the guide's own Escape handler), then the previous slide; slide 1 goes to the host ---- */
  function deckHasBack() { var pq = document.getElementById("pq"); return !!(pq && !pq.hidden) || cur > 0; }
  window.deckHasBack = deckHasBack;
  function deckBack() {
    var pq = document.getElementById("pq");
    if (pq && !pq.hidden) { closePlayer(); return true; }
    if ($("#gdrawer:not([hidden]),#drawer:not([hidden]),#picker:not([hidden])")) return false;
    if (cur > 0) { go(cur - 1); return true; }
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
      card("Record", '<b class="ovv">' + esc(t.record || "—") + '</b><span class="ovs">' + (t.gp != null ? t.gp + " games played" : "") + "</span>"),
      card("Points", '<b class="ovv">' + (t.points == null ? "—" : t.points) + '</b><span class="ovs">' + (t.divRank ? ordinal(t.divRank) + " in " + esc(t.division || "") : "") + "</span>"),
      card("Streak", '<b class="ovv">' + esc(t.streak || "—") + '</b><span class="ovs">L10 ' + esc(t.l10 || "—") + "</span>"),
      nextCard(t)
    ];
    h.innerHTML = hero + '<div class="ovcards">' + cards.join("") + "</div>";
  }
  // Next game card: plain text from nextGame() (the old orb is hidden on this slide, #gameday stays parked)
  function nextCard(t) {
    var g = nextFor(state.team), today = g && etDay(g.start) === todayET();
    return '<div class="ovc ovnext"><span class="ovl">' + (today ? "Game day" : "Next game") + "</span>" + (g ?
      '<div class="ovrow"><img class="ovlg" src="logos/' + esc(g.opp) + '.svg" alt=""><b class="ovv">' + (g.home ? "vs" : "at") + " " + esc(g.oppShort) + "</b></div>" +
      '<span class="ovs">' + (today ? "Tonight" : gDate(g)) + " · " + gTime(g) + " ET</span><span class=\"ovs\">" + esc(g.venue) + "</span>"
      : '<b class="ovv">Season over</b>') + "</div>";
  }
  function extras() { renderLines(); renderOv(); renderCap(); }

  /* wrap the guide's own renderers (declared with function, so they can be replaced) */
  function wrapFn(name, after) { var f = window[name]; if (typeof f !== "function") return; window[name] = function () { var r = f.apply(this, arguments); try { after(); } catch (e) { console.log("deck " + name + " " + e); } return r; }; }
  wrapFn("renderRoster", function () { denseRoster(); fitSoon(); });
  wrapFn("renderAll", function () { extras(); fitSoon(); });
  wrapFn("renderGames", function () { var g = $("#mgrid"); if (g) g.dataset.n = g.querySelectorAll(".mc").length; fitSoon(); });
  var _setTeam = window.setTeam;
  if (_setTeam) window.setTeam = function (ab) { return _setTeam(ab).then(function () { loadLive(ab); if (cur === 4) go(0); else fitSoon(); }); };
  var _setMode = window.setMode;
  if (_setMode) window.setMode = function (m, d) { var r = _setMode(m, d); if (m === "games" && booted && cur !== 4) go(4); fitSoon(); return r; };
  window.showMode = function () { // never hide a slide: only update the pressed states
    var g = state.mode === "games"; document.querySelectorAll("#rail .lg").forEach(function (b) { b.setAttribute("aria-pressed", String(!g && b.dataset.team === state.team)); });
  };
  // section buttons inside the guide ("News and lines ->") used scrollIntoView: page there instead
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-goto]"); if (!b) return;
    var m = { news: 1, roster: 2, team: 3 }[b.dataset.goto]; if (m != null) { e.stopImmediatePropagation(); go(m); }
  }, true);
  document.addEventListener("click", function (e) { // roster filters from the Team slide jump to Roster
    var b = e.target.closest && e.target.closest(".acqrow,.bar[data-q]"); if (b) setTimeout(function () { go(2); }, 0);
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
      booted = true; go(0); fitSoon();
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
