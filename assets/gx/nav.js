// NEMTV controller layer, injected into the guide page. D-pad = spatial focus, OK = click, Back = parent asks via postMessage.
(function(){
  var SEL='button,a[href],input,select,textarea,[onclick],[role=button],[tabindex]';
  function vis(e){var r=e.getBoundingClientRect();if(r.width<4||r.height<4)return false;var s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden]')}
  function scan(){document.querySelectorAll('*').forEach(function(e){
    if(e.tabIndex<0&&!e.hasAttribute('tabindex')&&e.tagName!=='BODY'&&getComputedStyle(e).cursor==='pointer'&&!(e.parentElement&&getComputedStyle(e.parentElement).cursor==='pointer'))e.setAttribute('tabindex','0')})}
  function items(){
    var dr=[].filter.call(document.querySelectorAll('.drawer'),function(d){return !d.hidden});
    var root=dr.length?dr[dr.length-1]:document;
    var cs=window.deckSlideEl&&window.deckSlideEl(); // deck guide: only the slide you are on (plus the bars above it)
    return [].filter.call(root.querySelectorAll(SEL),function(e){if(cs&&!dr.length){var sl=e.closest('.slide');if(sl&&sl!==cs)return false}return e.tabIndex>=0&&!e.disabled&&vis(e)})}
  function mid(r){return{x:r.left+r.width/2,y:r.top+r.height/2}}
  function move(dx,dy){
    var a=document.activeElement,list=items();if(!list.length)return false;
    if(!a||a===document.body||list.indexOf(a)<0){list[0].focus();return true}
    var ra=a.getBoundingClientRect(),ca=mid(ra),best=null,bs=1e9;
    list.forEach(function(e){if(e===a)return;var r=e.getBoundingClientRect(),c=mid(r),ox=c.x-ca.x,oy=c.y-ca.y;
      var along=dx?ox*dx:oy*dy;if(along<=2)return;
      var across=dx?Math.abs(oy):Math.abs(ox);
      var sc=along+across*2.2;if(sc<bs){bs=sc;best=e}});
    if(best){best.focus();return true}
    if(dx&&window.deckStep&&!a.closest('.drawer')){if(window.deckStep(dx)){var n=items().filter(function(e){return e.closest('.slide')});if(n.length)n[0].focus();return true}return false}
    // nothing further: scroll the page/drawer so more content can appear
    var sc=a.closest('.drawer')||document.scrollingElement;
    if(dy>0){sc.scrollBy(0,160);return true}
    if(dy<0&&sc.scrollTop>4){sc.scrollBy(0,-160);return true}
    if(dy<0)parent.postMessage({nem:'guide',exit:'up'},'*');
    return dy<0}
  document.addEventListener('focusin',function(e){try{e.target.scrollIntoView({block:'center',inline:'nearest'})}catch(x){}});
  document.addEventListener('keydown',function(e){
    var k=e.key,d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];
    if(d){if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName)&&d[0])return;if(move(d[0],d[1])){e.preventDefault();e.stopPropagation()}}
    else if(k==='Enter'||k==='OK'){var a=document.activeElement;if(a&&a!==document.body&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(a.tagName)){a.click();e.preventDefault()}}
  },true);
  function depth(){return [].some.call(document.querySelectorAll('.drawer'),function(d){return !d.hidden})?1:0}
  var last=-1;function report(){var d=depth();if(d!==last){last=d;parent.postMessage({nem:'guide',depth:d},'*')}}
  new MutationObserver(function(){clearTimeout(window.__t);window.__t=setTimeout(function(){scan();report()},250)}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('message',function(e){var m=e.data||{};if(!m.nem)return;
    if(m.cmd==='team'&&window.setTeam)setTeam(m.ab);
    else if(m.cmd==='game'&&window.openGame)openGame(m.id);
    else if(m.cmd==='matchup'){var g=typeof SCHED!=='undefined'&&SCHED&&SCHED.games.filter(function(x){return x.away===m.away&&x.home===m.home}).sort(function(a,b){return Math.abs(Date.parse(a.start)-m.start)-Math.abs(Date.parse(b.start)-m.start)})[0];
      if(g&&Math.abs(Date.parse(g.start)-m.start)<24*36e5)openGame(g.id);else if(window.setTeam)setTeam(m.home)}
    else if(m.cmd==='zoom'){document.documentElement.style.zoom=m.z}
    else if(m.cmd==='api'){try{liveApply(m)}catch(x){console.log('liveApply '+x)}}
    else if(m.cmd==='games'){location.hash='#games';if(window.setMode)setMode('games')}
    else if(m.cmd==='back'){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));setTimeout(report,300)}
    else if(m.cmd==='focus'){var l=items();(l[0]||document.body).focus()}
  });
  window.addEventListener('load',function(){scan();report();setTimeout(function(){scan();report();parent.postMessage({nem:'guide',ready:1},'*')},1200)});
})();

// live NHL API data pushed from the app: standings -> LEAGUE, scores -> SCHED, then redraw. No routine needed for these.
var lastSig='';
function liveApply(m){
  if(typeof LEAGUE==='undefined'||typeof SCHED==='undefined'||!LEAGUE||!SCHED)return;
  var sig=JSON.stringify([(m.standings||[]).map(function(x){return x.teamAbbrev.default+x.points+x.gamesPlayed}),(m.scores||[]).map(function(x){return x.id+x.gameState+x.awayTeam.score+x.homeTeam.score})]);
  if(sig===lastSig)return; lastSig=sig;
  (m.standings||[]).forEach(function(x){var t=LEAGUE.teams.filter(function(q){return q.abbrev===x.teamAbbrev.default})[0]; if(!t)return;
    t.points=x.points;t.gp=x.gamesPlayed;t.record=x.wins+'-'+x.losses+'-'+x.otLosses;t.streak=(x.streakCode||'')+(x.streakCount||'');
    t.l10=x.l10Wins+'-'+x.l10Losses+'-'+x.l10OtLosses;t.home=x.homeWins+'-'+x.homeLosses+'-'+x.homeOtLosses;t.road=x.roadWins+'-'+x.roadLosses+'-'+x.roadOtLosses;
    t.gf=x.goalFor;t.ga=x.goalAgainst;t.diff=x.goalDifferential;t.ppct=x.pointPctg;t.leagueRank=x.leagueSequence;t.confRank=x.conferenceSequence;t.divRank=x.divisionSequence});
  (m.scores||[]).forEach(function(x){var g=SCHED.games.filter(function(q){return q.id===x.id})[0]; if(!g)return;
    g.state=x.gameState; g.as=x.awayTeam.score; g.hs=x.homeTeam.score; var pt=(x.periodDescriptor||{}).periodType; g.ot=(pt==='OT'||pt==='SO')?pt:(g.ot&&x.gameState==='OFF'?g.ot:'')});
  if(typeof renderAll==='function'){renderAll(); if(typeof state!=='undefined'&&state.mode==='games'&&typeof setMode==='function')setMode('games',state.day); else if(typeof showMode==='function')showMode()}
}
