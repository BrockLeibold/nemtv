// Controller test: press the real arrow keys and check, per screen, that every focus target can be reached and none is a dead end.
// returns lines like "FAIL guide slide2 unreachable: button.pr2#73" / "ok guide slide2 (41 targets)"
module.exports = async function navtest(w, ev, sleep, page, out) {
  if (page === "guide") return require("./guidenav.js")(w, ev, sleep, out); // the guide has its own zone-based test (guidenav.js)
  const guide = false;
  const DOC = guide ? "document.getElementById('gf').contentDocument" : "document";
  const key = async (k) => { for (const t of ["keyDown", "keyUp"]) w.webContents.sendInputEvent({ type: t, keyCode: k }); await sleep(70); };
  const nodesJs = (scopeSlide) => `(function(){var D=${DOC},SEL='button,a[href],input,select,textarea,[tabindex]',cs=${guide ? "D.defaultView.deckSlideEl&&D.defaultView.deckSlideEl()" : "null"};
    var vis=function(e){var r=e.getBoundingClientRect();if(r.width<4||r.height<4)return false;var s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden]')};
    var root=${guide ? "D" : "D.body"};var l=[].filter.call(root.querySelectorAll(SEL),function(e){if(e.tabIndex<0||e.disabled||!vis(e))return false;if(${guide ? "true" : "false"}){var s=e.closest('.slide');if(s&&s!==cs)return false}
      if(!${guide ? "true" : "false"}&&e.closest('#pl,#boot,#gpop,#gd,#gp')&&!e.closest('main,header'))return false;return true});
    ${guide ? "D.defaultView" : "window"}.__N=l;return l.map(function(e){return (e.id||e.tagName.toLowerCase())+(e.dataset&&(e.dataset.id||e.dataset.team||e.dataset.slide||e.dataset.game||e.dataset.t||e.dataset.g)?'#'+(e.dataset.id||e.dataset.team||e.dataset.slide||e.dataset.game||e.dataset.t||e.dataset.g):'')})})()`;
  const where = () => ev(`(function(){var D=${DOC},a=D.activeElement,N=${guide ? "D.defaultView.__N" : "window.__N"};return a?N.indexOf(a):-1})()`);
  const focusIdx = (i) => ev(`(function(){${guide ? "document.getElementById('gf').focus();" : ""}var D=${DOC},N=${guide ? "D.defaultView.__N" : "window.__N"};N[${i}].focus();return D.activeElement===N[${i}]})()`);
  const slides = guide ? [0, 1, 2, 3, 4] : [0];
  for (const k of slides) {
    if (guide) { await ev("document.getElementById('gf').contentWindow.deckGo(" + k + ")"); await sleep(900); }
    const names = await ev(nodesJs()); if (!Array.isArray(names) || !names.length) { out.push("FAIL nav " + page + (guide ? " slide" + (k + 1) : "") + " no focus targets"); continue; }
    const n = names.length, edges = Array.from({ length: n }, () => ({})), dirs = ["Up", "Down", "Left", "Right"];
    for (let i = 0; i < n; i++) for (const d of dirs) {
      await ev(nodesJs()); if (!(await focusIdx(i))) { edges[i][d] = "nofocus"; continue; }
      const cur0 = guide ? await ev("document.getElementById('gf').contentWindow.deckCur()") : 0;
      await key(d); const cur1 = guide ? await ev("document.getElementById('gf').contentWindow.deckCur()") : 0;
      if (cur1 !== cur0) { edges[i][d] = "page"; await ev("document.getElementById('gf').contentWindow.deckGo(" + k + ")"); await sleep(300); await ev(nodesJs()); continue; }
      edges[i][d] = await where();
    }
    // reachable from the first target (the top bar) through real key presses (a page edge counts as an exit, not a dead end)
    const seen = new Set([0]), q = [0]; while (q.length) { const a = q.shift(); for (const d of dirs) { const b = edges[a][d]; if (typeof b === "number" && b >= 0 && !seen.has(b)) { seen.add(b); q.push(b); } } }
    const lost = names.map((x, i) => [x, i]).filter(([, i]) => !seen.has(i)).map(([x]) => x);
    const dead = names.map((x, i) => [x, i]).filter(([, i]) => dirs.every(d => !(typeof edges[i][d] === "number" && edges[i][d] >= 0 && edges[i][d] !== i) && edges[i][d] !== "page")).map(([x]) => x);
    const tag = "nav " + page + (guide ? " slide" + (k + 1) : "") + " (" + n + " targets)";
    out.push((lost.length || dead.length ? "FAIL " : "ok   ") + tag + (lost.length ? " unreachable: " + lost.slice(0, 8).join(",") : "") + (dead.length ? " dead-end: " + dead.slice(0, 8).join(",") : ""));
  }
};
