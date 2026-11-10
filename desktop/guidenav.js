// Guide D-pad test. Real arrow keys drive assets/gx/nav.js. Per slide: press the four arrows on every focus target and prove each is reachable
// from the team dropdown with no dead ends; then replay the key sequences a remote user does (dropdown -> tabs -> content -> back, picker,
// team switch, player page, box score). Lines: "ok   nav guide ..." / "FAIL nav guide ...". Called by navtest.js.
module.exports = async function guideNav(w, ev, sleep, out) {
  const W = "document.getElementById('gf').contentWindow";
  const key = async (k) => { for (const t of ["keyDown", "char", "keyUp"]) { if (t === "char" && k !== "Return") continue; w.webContents.sendInputEvent(t === "char" ? { type: t, keyCode: "\r" } : { type: t, keyCode: k }); } await sleep(110); }; // Return needs the char event for a focused button to click
  const lab = "function(e){if(!e)return 'none';var d=e.dataset||{};var x=d.id||d.team||d.slide||d.gid||d.m||d.q;return (e.id||e.tagName.toLowerCase()+(e.className&&e.className.split?'.'+e.className.split(' ')[0]:''))+(x?'#'+x:'')}";
  const list = () => ev("(function(){var w=" + W + ",L=" + lab + ";w.__N=w.navItems();return w.__N.map(L)})()");
  const focus = (i) => ev("(function(){document.getElementById('gf').focus();var w=" + W + ",n=w.__N[" + i + "];n.focus();return w.document.activeElement===n})()");
  const focusSel = (sel) => ev("(function(){document.getElementById('gf').focus();var w=" + W + ",n=w.document.querySelector(" + JSON.stringify(sel) + ");if(!n)return false;n.focus();return w.document.activeElement===n})()");
  const where = () => ev("(function(){var w=" + W + ",L=" + lab + ",a=w.document.activeElement,i=w.__N.indexOf(a);return i>=0?i:'out:'+L(a)})()");
  const st = () => ev("(function(){try{var w=" + W + ",L=" + lab + ",a=w.document.activeElement,t=[].indexOf.call(w.document.querySelectorAll('#tabs button'),a),ov=w.navOverlay();" +
    "var vis=function(e){if(!e||e===w.document.body)return false;var r=e.getBoundingClientRect();return r.width>3&&r.height>3&&!e.closest('[hidden]')};" +
    "return JSON.stringify({cur:w.deckCur(),team:w.eval('state.team'),act:L(a),tab:t,sw:!!(a&&a.id==='switchBtn'),slide:!!(a&&a.closest&&a.closest('.slide')),ov:ov?ov.id:'',inOv:!!(ov&&a&&ov.contains(a)),vis:vis(a),pk:!w.document.getElementById('picker').hidden})}catch(e){return JSON.stringify({err:String(e)})}})()").then(JSON.parse);
  const go = async (k) => { await ev(W + ".deckGo(" + k + ")"); await sleep(700); };
  const exits = () => ev("window.__ex|0");
  await ev("window.__ex=0;if(!window.__exw){window.__exw=1;var o=window.postMessage;window.postMessage=function(m){if(m&&m.exit)window.__ex=(window.__ex|0)+1;return o.apply(this,arguments)}};0");
  const fail = (m) => out.push("FAIL nav guide " + m), ok = (m) => out.push("ok   nav guide " + m);
  const check = (cond, name, extra) => cond ? ok(name) : fail(name + (extra ? " :: " + extra : ""));

  // tabs[] indexes: the tab buttons are targets too; a Left/Right press on a tab changes section ("page") and lands on a neighbour tab, which is a real edge
  async function graph(tag, relist) {
    const names = await list(); if (!names.length) { fail(tag + " no focus targets"); return; }
    const n = names.length, edges = Array.from({ length: n }, () => ({})), dirs = ["Up", "Down", "Left", "Right"];
    for (let i = 0; i < n; i++) for (const d of dirs) {
      if (!(await focus(i))) { edges[i][d] = "nofocus"; continue; }
      const e0 = await exits(), s0 = await st(); await key(d); const s1 = await st(), e1 = await exits();
      if (e1 !== e0) { edges[i][d] = "exit"; continue; }
      if (s1.cur !== s0.cur || s1.ov !== s0.ov) {
        edges[i][d] = s1.tab >= 0 ? "tab" + s1.tab : "page";
        if (relist) await relist(); await list(); continue;
      }
      edges[i][d] = await where();
    }
    const tabIdx = {}; names.forEach((x, i) => { const m = /^button#?(\d)?$/.exec(x); });
    const seen = new Set([0]), q = [0];
    const tabAt = (k) => names.findIndex((x, i) => i > 0 && x.indexOf("#" + k) > 0 && /^button/.test(x) && i <= 5);
    while (q.length) { const a = q.shift(); for (const d of dirs) { let b = edges[a][d]; if (typeof b === "string" && /^tab\d$/.test(b)) b = tabAt(+b[3]); if (typeof b === "number" && b >= 0 && !seen.has(b)) { seen.add(b); q.push(b); } } }
    const lost = names.map((x, i) => [x, i]).filter(([, i]) => !seen.has(i)).map(([x]) => x);
    const moved = (v) => (typeof v === "number" && v >= 0) || /^tab\d$/.test(v) || v === "page" || v === "exit";
    const dead = names.map((x, i) => [x, i]).filter(([, i]) => dirs.every(d => !moved(edges[i][d]) || edges[i][d] === i)).map(([x]) => x);
    out.push((lost.length || dead.length ? "FAIL " : "ok   ") + "nav guide " + tag + " (" + n + " targets)" + (lost.length ? " unreachable: " + lost.slice(0, 8).join(",") : "") + (dead.length ? " dead-end: " + dead.slice(0, 8).join(",") : ""));
  }

  if (!process.env.NEMTV_CALONLY) {
  const SL = ["Overview", "News", "Roster", "Team", "Games"];
  await ev("document.getElementById('gf').focus()"); await ev(W + ".setTeam('TOR')"); await sleep(2500);
  for (let k = 0; k < 5; k++) { await go(k); await graph("slide" + (k + 1) + " " + SL[k], () => go(k)); }

  // ---- key sequences ----
  await go(0); await list();
  let s;
  for (const d of ["Right", "Down"]) { await focusSel("#switchBtn"); await key(d); s = await st(); check(s.tab === s.cur && s.cur === 0, "dropdown " + d + " -> Overview tab", JSON.stringify(s)); }
  await focusSel("#tabs button"); for (let i = 0; i < 4; i++) await key("Right"); s = await st(); check(s.tab === 4 && s.cur === 4, "tabs Right x4 -> Games tab + Games section", JSON.stringify(s));
  for (let i = 0; i < 4; i++) await key("Left"); s = await st(); check(s.tab === 0 && s.cur === 0, "tabs Left x4 -> Overview", JSON.stringify(s));
  await key("Left"); s = await st(); check(s.sw, "Left from first tab -> dropdown", JSON.stringify(s));
  for (let k = 0; k < 5; k++) {
    await go(k); await list(); await focusSel("#tabs button:nth-child(" + (k + 1) + ")");
    await key("Down"); s = await st(); check(s.slide && s.cur === k, SL[k] + ": tab Down -> section content", JSON.stringify(s));
    let back = false; for (let i = 0; i < 14 && !back; i++) { await key("Up"); s = await st(); back = s.tab >= 0; }
    check(back && s.tab === k, SL[k] + ": Up from content returns to its tab", JSON.stringify(s));
    const e0 = await exits(); await key("Up"); check((await exits()) === e0 + 1, SL[k] + ": Up from tab leaves guide to the app nav");
  }
  // team picker: open, move, choose another team from the Team section -> back on Overview
  await go(3); await focusSel("#switchBtn"); await key("Return"); await sleep(500); s = await st();
  check(s.pk && s.inOv, "dropdown OK opens picker with focus inside", JSON.stringify(s));
  await list(); await key("Down"); await key("Right"); s = await st(); check(s.inOv && s.act !== "none", "picker D-pad stays inside picker", JSON.stringify(s));
  await graph("team picker", null);
  await key("Escape"); await sleep(300); s = await st(); check(!s.pk && s.sw, "Back closes picker, focus on dropdown", JSON.stringify(s));
  await go(3); await focusSel("#switchBtn"); await key("Return"); await sleep(400);
  const other = await ev("(function(w){return w.eval('state.team')==='NYR'?'BOS':'NYR'})(" + W + ")");
  await list(); await focusSel("#picker .pr[data-team=" + other + "]"); await key("Return"); await sleep(3500); s = await st();
  check(s.team === other && s.cur === 0 && !s.pk && s.vis, "picker: choose " + other + " from Team section -> Overview, focus kept", JSON.stringify(s));
  await go(4); await ev(W + ".document.querySelector('#rail .lg[data-team=TOR]').click()"); await sleep(3500); s = await st();
  check(s.team === "TOR" && s.cur === 0, "rail logo click from Games -> TOR Overview", JSON.stringify(s));
  await go(2); await ev(W + ".postMessage({nem:1,cmd:'team',ab:'BOS'},'*')"); await sleep(3500); s = await st();
  check(s.team === "BOS" && s.cur === 0, "host team message from Roster -> BOS Overview", JSON.stringify(s));
  await ev(W + ".setTeam('TOR')"); await sleep(3000);
  // player page from Roster: OK opens, D-pad works inside, Back x3 = player page, Overview, leave
  await go(2); await list(); await focusSel("#lines .lp"); await key("Return"); await sleep(900); s = await st();
  check(s.ov === "pq" && s.inOv, "Roster: OK opens player page, focus inside", JSON.stringify(s));
  await graph("player page", null);
  await key("Escape"); await sleep(400); s = await st(); check(s.ov === "" && s.cur === 2 && s.slide && s.vis, "Back: player page closes, still on Roster, focus on a card", JSON.stringify(s));
  await key("Escape"); await sleep(400); s = await st(); check(s.cur === 0 && s.tab === 0, "Back: Roster -> Overview (Overview tab focused)", JSON.stringify(s));
  const hb = await ev(W + ".deckHasBack()"); check(!hb, "Back on Overview: nothing left inside the guide, the app leaves the guide");
  } else { await ev("document.getElementById('gf').focus()"); await ev(W + ".setTeam('TOR')"); await sleep(3000); }
  // Games calendar: days are buttons (OK selects, day list follows), games are buttons (OK opens the drawer), Back closes the drawer and focus returns
  await go(4); await sleep(500); await list();
  const pick = (q) => ev("(function(w){var c=w.document.querySelector(" + JSON.stringify(q) + ");return c?(c.dataset.gid||c.dataset.cday||''):''})(" + W + ")");
  const nDays = await ev("document.getElementById('gf').contentWindow.document.querySelectorAll('#cal .cdb').length");
  check(nDays >= 28, "Games: every day of the month is a button (" + nDays + ")");
  // D-pad: tab Down -> calendar, then walk Right/Down over the days; OK on a day with no game must still select it
  const dayEmpty = await ev("(function(w){var c=[].filter.call(w.document.querySelectorAll('#cal .cd:not(.game):not(.out) .cdb'),function(e){return e.offsetParent})[0];return c?c.dataset.cday:''})(" + W + ")");
  await focusSel("#cal .cdb[data-cday='" + dayEmpty + "']"); await key("Return"); await sleep(300);
  s = await ev("(function(w){try{var a=w.document.activeElement,c=w.document.querySelector('#cal .cd.sel .cdb');return JSON.stringify({sel:c?c.dataset.cday:'none',act:a.dataset.cday||'',day:w.document.querySelector('.calday').innerText.slice(0,80)})}catch(e){return JSON.stringify({err:String(e)})}})(" + W + ")").then(JSON.parse);
  check(s.sel === dayEmpty && s.act === dayEmpty && /no games/i.test(s.day), "Games: OK on an empty day selects it, focus stays, list says no games", JSON.stringify(s));
  const dayGame = await ev("(function(w){var c=[].filter.call(w.document.querySelectorAll('#cal .cd.game:not(.done) .cdb'),function(e){return e.offsetParent})[0]||[].filter.call(w.document.querySelectorAll('#cal .cd.game .cdb'),function(e){return e.offsetParent})[0];return c?c.dataset.cday:''})(" + W + ")");
  await focusSel("#cal .cdb[data-cday='" + dayGame + "']"); await key("Return"); await sleep(300);
  s = await ev("(function(w){return w.document.querySelectorAll('.calday .cr[data-gid]').length})(" + W + ")");
  check(s === 1, "Games: OK on a game day shows that day's game in the day list");
  await key("Down"); const onGame = await ev("(function(w){var a=w.document.activeElement;return a.classList.contains('cg')?a.dataset.gid:''})(" + W + ")");
  check(!!onGame, "Games: Down from a game day lands on its game button");
  const kinds = [["done", "#cal .cd.game.done .cg[data-gid]"], ["upcoming", "#cal .cd.game:not(.done) .cg[data-gid]"]];
  for (const [kind, q] of kinds) {
    const gid = await pick(q);
    if (!gid) { out.push("skip nav guide " + kind + " game: none in the visible month"); continue; }
    await list(); await focusSel("#cal .cg[data-gid='" + gid + "']"); await key("Return"); await sleep(3500); s = await st();
    check(s.ov === "gdrawer" && s.inOv, "Games: OK on a " + kind + " game opens the drawer, focus inside", JSON.stringify(s));
    if (kind === "done" && !process.env.NEMTV_CALONLY) await graph("box-score drawer", null);
    await key("Escape"); await sleep(500); s = await st();
    const back = await ev("(function(w){var a=w.document.activeElement;return a.dataset.gid||''})(" + W + ")");
    check(s.ov === "" && s.cur === 4 && s.slide && s.vis && back === gid, "Back: " + kind + " drawer closes, focus back on the same calendar game", JSON.stringify(s) + " back=" + back);
  }
  // game row from the selected-day list opens the drawer too
  await focusSel("#cal .cdb[data-cday='" + dayGame + "']"); await key("Return"); await sleep(300);
  const rowId = await pick(".calday .cr[data-gid]"); await list(); await focusSel(".calday .cr[data-gid='" + rowId + "']"); await key("Return"); await sleep(3500); s = await st();
  check(s.ov === "gdrawer" && s.inOv, "Games: OK on a game in the day list opens the drawer", JSON.stringify(s));
  await key("Escape"); await sleep(500); s = await st();
  const back2 = await ev("(function(w){var a=w.document.activeElement;return a.dataset.gid||''})(" + W + ")");
  check(s.ov === "" && back2 === rowId, "Back: focus returns to the day-list game", JSON.stringify(s) + " back=" + back2);
};
