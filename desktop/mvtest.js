// Multiview visual + behaviour test (real Chromium). Needs `node ../web/stage.js` and 4 multi-level HLS test sources in $MV_HLS/g0..g3/index.m3u8.
// usage: MV_HLS=dir MV_OUT=dir npx electron mvtest.js [WxH ...]   -> writes <out>/<name>_<WxH>.png and prints PASS/FAIL lines (exit 1 on FAIL)
const {app,BrowserWindow}=require("electron"),http=require("http"),fs=require("fs"),path=require("path");
const A=path.join(__dirname,"..","web","app"),HL=path.resolve(process.env.MV_HLS),OUT=process.env.MV_OUT||path.join(__dirname,"shots","mv");
const MT={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ttf":"font/ttf",".woff2":"font/woff2",".m3u8":"application/vnd.apple.mpegurl",".ts":"video/mp2t"};
let masters=0; const serve=(root,cnt)=>http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";const f=path.normalize(path.join(root,p));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  if(cnt&&/index\.m3u8$/.test(p))masters++;
  r.writeHead(200,{"Content-Type":MT[path.extname(f)]||"application/octet-stream","Access-Control-Allow-Origin":"*"});fs.createReadStream(f).pipe(r)});
const sleep=t=>new Promise(r=>setTimeout(r,t)); let fails=0; const log=(ok,m)=>{if(!ok)fails++;console.log((ok?"PASS ":"FAIL ")+m)};
process.on("uncaughtException",e=>{try{fs.writeSync(1,"CRASH "+(e&&e.stack||e)+String.fromCharCode(10))}catch(x){}console.log("CRASH",e&&e.stack||e);app.exit(1)});
app.on("window-all-closed",()=>{}); for(const n of ["render-process-gone","child-process-gone"])app.on(n,(e,x,y)=>{try{fs.writeSync(1,"GONE "+n+" "+JSON.stringify(y||x)+String.fromCharCode(10))}catch(z){}}); process.on("exit",c=>{try{fs.writeSync(1,"EXIT "+c+String.fromCharCode(10))}catch(z){}}); app.commandLine.appendSwitch("autoplay-policy","no-user-gesture-required"); app.setPath("userData",path.join(require("os").tmpdir(),"mvtest-ud"));
app.whenReady().then(async()=>{
  await new Promise(r=>serve(A).listen(47190,"127.0.0.1",r)); await new Promise(r=>serve(HL,true).listen(47191,"127.0.0.1",r)); fs.mkdirSync(OUT,{recursive:true});
  const sizes=process.argv.slice(2).filter(a=>/^\d+x\d+$/.test(a)); if(!sizes.length)sizes.push("960x540");
  for(const sz of sizes){
    const [W,H]=sz.split("x").map(Number), phone=W<700; masters=0;
    const w=new BrowserWindow({width:W,height:H,useContentSize:true,show:true,frame:false,backgroundColor:"#000",webPreferences:{contextIsolation:false,webSecurity:false,zoomFactor:1,backgroundThrottling:false}});
    w.setContentSize(W,H); if(process.env.MV_DEBUG)w.webContents.on("console-message",(e,l,m)=>console.log("CONSOLE",l,String(m).slice(0,200))); const ev=js=>w.webContents.executeJavaScript(js), shot=async n=>{const im=await w.webContents.capturePage();fs.writeFileSync(path.join(OUT,n+"_"+sz+".png"),im.toPNG())};
    const key=async k=>{w.webContents.sendInputEvent({type:"keyDown",keyCode:k});w.webContents.sendInputEvent({type:"keyUp",keyCode:k});await sleep(120)};
    if(process.env.MV_CPU){w.webContents.debugger.attach("1.3");await w.webContents.debugger.sendCommand("Emulation.setCPUThrottlingRate",{rate:+process.env.MV_CPU})} // weak-SoC stand-in
    await w.loadURL("http://127.0.0.1:47190/app.html"); await sleep(3500); w.focus();
    await ev(`window.__t=n=>{const c={n:"Test feed "+n,u:"http://127.0.0.1:47191/g"+n+"/index.m3u8",g:"x"};return {title:"Team"+n+" at Home"+n,aw:"AW"+n,hm:"HM"+n,tm:["Home"+n,"Away"+n],c,s:"NHL"}};
      window.__add=n=>{const g=__t(n);mvAdd(g,{feeds:[g.c],c:g.c})}; window.__vid=[]; 0`);
    const st=()=>ev(`(()=>{const T=__mv.t;return {n:T.length,loads:__mvLoads,cs:__mv.cs,main:T.indexOf(__mv.a),unmuted:T.filter(t=>!t.v.muted).length,
      au:[...document.querySelectorAll('.mt.au')].length,hide:document.getElementById('mv').classList.contains('hide'),
      tiles:T.map(t=>{const r=t.el.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),vh:t.v.videoHeight,cap:t.hls&&t.hls.autoLevelCapping,lv:t.hls&&t.hls.currentLevel,tf:t.v.style.transform,pl:!t.v.paused&&t.v.readyState>2,z:t.el.style.zIndex}}),
      same:T.every((t,i)=>__vid[i]===t.v&&t.v.parentNode===t.el&&t.el.parentNode===document.getElementById('mv'))}})()`);
    const lay=async(nm,wait)=>{await sleep(wait||700);await shot(nm);return st()};
    if(process.env.MV_P2){for(const n of [0,1,2,3])await ev(`__add(${n})`);await ev(`__mv.sty[4]="grid";mvLayout();mvCapAll();0`);for(let k=0;k<20;k++){await sleep(2000);console.log("P2",k*2,await ev(`JSON.stringify(__mv.t.map(t=>[t.v.videoHeight,t.hls.currentLevel,t.hls.loadLevel,t.hls.autoLevelCapping,Math.round(t.v.buffered.length?t.v.buffered.end(0)-t.v.currentTime:0)]))`))}w.destroy();console.log("done");app.exit(0);return}
    // 1 game
    await ev(`__add(0)`); await sleep(6000); let s=await lay("1-full",100);
    await ev(`__vid=__mv.t.map(t=>t.v);0`);
    log(s.n===1&&s.unmuted===1&&s.au===1&&s.tiles[0].pl,sz+" 1 game plays, one audio tile, outline on it");
    // 2 games: all styles
    await ev(`__add(1)`); await sleep(5000); await ev(`__vid=__mv.t.map(t=>t.v);0`); const L2=s0=>s0; let base=(await st()).loads;
    for(let i=0;i<4;i++){s=await lay("2-"+(await st()).cs,900); log(s.loads===base&&s.same,sz+" 2 games style "+s.cs+" loads="+s.loads+" same video elements="+s.same+" tiles="+JSON.stringify(s.tiles.map(t=>[t.x,t.y,t.w,t.h,t.vh,t.cap])));await ev(`mvAct("lay")`)}
    // 3 games
    await ev(`__add(2)`); await sleep(5000); await ev(`__vid=__mv.t.map(t=>t.v);0`); base=(await st()).loads;
    for(let i=0;i<3;i++){s=await lay("3-"+(await st()).cs,900); log(s.loads===base&&s.same,sz+" 3 games style "+s.cs+" loads="+s.loads+" tiles="+JSON.stringify(s.tiles.map(t=>[t.x,t.y,t.w,t.h,t.vh,t.cap])));await ev(`mvAct("lay")`)}
    await ev(`__mv.sty[3]="main3";mvLayout();0`); await sleep(500);
    // audio switch by D-pad: Right moves focus ring, OK gives audio -> becomes main (CSS only)
    await ev(`mvShow();document.getElementById('mv').focus();0`); await key("Right"); await key("Return"); await sleep(700); s=await st(); await shot("3-audio-dpad");
    log(s.unmuted===1&&s.au===1&&s.main!==0&&s.loads===base&&s.same,sz+" D-pad OK on 2nd tile: main="+s.main+" unmuted="+s.unmuted+" outline="+s.au+" loads="+s.loads);
    const mx=s.tiles[s.main]; log(mx.w>=s.tiles.reduce((m,t)=>Math.max(m,t.w),0)-2,sz+" main tile is the largest");
    await ev(`mvAct("au")`); await sleep(500); s=await st(); log(s.unmuted===1&&s.loads===base,sz+" Audio button cycles, loads="+s.loads);
    // 4 games
    await ev(`__add(3)`); if(process.env.MV_PROBE)for(let k=0;k<8;k++){await sleep(2500);console.log("PROBE",k*2.5,await ev(`JSON.stringify(__mv.t.map(t=>[t.v.videoHeight,t.hls&&t.hls.currentLevel,t.hls&&t.hls.autoLevelCapping,t.hls&&t.hls.loadLevel,t.hls&&t.hls.levels.length,t.hls.maxAutoLevel,t.hls.minAutoLevel,t.hls.nextAutoLevel,t.hls.autoLevelEnabled,t.hls.manualLevel,t.hls.startLevel]))`))} await sleep(6000); await ev(`__vid=__mv.t.map(t=>t.v);0`); base=(await st()).loads;
    for(let i=0;i<3;i++){s=await lay("4-"+(await st()).cs,9000); log(s.loads===base&&s.same,sz+" 4 games style "+s.cs+" loads="+s.loads+" vheights="+JSON.stringify(s.tiles.map(t=>t.vh))+" caps="+JSON.stringify(s.tiles.map(t=>t.cap)));await ev(`mvAct("lay")`)}
    log(s.tiles.every((t,i)=>t.vh<=(i===s.main?540:360)&&t.vh>0),sz+" 4 tiles: no stream above 540p (main) / 360p others: "+JSON.stringify(s.tiles.map(t=>t.vh)));
    {const q0=await ev(`__mv.t.map(t=>{const q=t.v.getVideoPlaybackQuality();return [q.droppedVideoFrames,q.totalVideoFrames]})`);await sleep(20000);const q1=await ev(`__mv.t.map(t=>{const q=t.v.getVideoPlaybackQuality();return [q.droppedVideoFrames,q.totalVideoFrames]})`);
      const d=q1.map((q,i)=>[q[0]-q0[i][0],q[1]-q0[i][1]]);log(d.every(x=>x[1]>300&&x[0]/x[1]<0.02),sz+" 4 tiles 20s dropped/total "+JSON.stringify(d)+" levels "+JSON.stringify(await ev(`__mv.t.map(t=>t.hls.currentLevel+"/"+t.v.videoHeight)`)))}
    // 4 games: grid, then zoom
    await ev(`__mv.sty[4]="grid";mvLayout();0`); await sleep(500);
    await ev(`mvAct("zp");mvAct("zp");mvAct("zp");0`); await sleep(500); s=await st(); await shot("4-zoom-tile");
    log(/scale\(1\.3/.test(s.tiles[s.main].tf)&&s.tiles.filter(t=>t.tf!=="scale(1)").length===1&&s.loads===base,sz+" independent tile zoom: "+JSON.stringify(s.tiles.map(t=>t.tf)));
    await ev(`mvAct("ap");mvAct("ap");0`); await sleep(500); s=await st(); await shot("4-zoom-all"); log(s.loads===base&&s.same,sz+" zoom all: "+JSON.stringify(s.tiles.map(t=>t.tf)));
    await ev(`mvAct("am");mvAct("am");__mv.sty[4]="free";mvLayout();0`); await sleep(500);
    await ev(`mvAct("zp");mvAct("zp");mvAct("zp");mvAct("zp");0`); await sleep(500); s=await st(); await shot("4-free"); log(s.cs==="free"&&s.loads===base&&s.same,sz+" free overlap style: "+JSON.stringify(s.tiles.map(t=>[t.x,t.y,t.w,t.h,t.z])));
    await ev(`mvAct("ap");mvAct("ap");mvAct("ap");0`); await sleep(500); await shot("4-free-zoomall");
    // remove a tile (never reloads the rest) then 3 -> auto style
    await ev(`__mv.f=__mv.t[3];mvAct("rm");0`); await sleep(1200); s=await st(); await shot("3-after-remove"); log(s.n===3&&s.loads===base,sz+" remove tile: n="+s.n+" loads="+s.loads+" (no reload of others)");
    // auto-hide after 3s idle: bar, labels, rings gone; audio outline stays
    await ev(`__mv.sty[3]="main3";mvLayout();mvShow();0`); await sleep(3600); s=await st(); await shot("hidden");
    const ui=await ev(`(()=>{const o=e=>+getComputedStyle(e).opacity;return {bar:o(document.querySelector('#mvb')),lb:o(document.querySelector('.ml')),ring:getComputedStyle(document.querySelector('.mt.fo'),'::before').display,aud:getComputedStyle(document.querySelector('.mt.au'),'::after').borderTopWidth,cur:getComputedStyle(document.getElementById('mv')).cursor}})()`);
    log(await ev(`document.querySelectorAll('.mt.au').length===1&&__mv.t.filter(t=>!t.v.muted).length===1`),sz+" hidden: exactly one white outline tile + one unmuted");
    log(s.hide&&ui.bar===0&&ui.lb===0&&ui.ring==="none"&&ui.aud==="2px"&&ui.cur==="none",sz+" auto-hide after 3s: "+JSON.stringify(ui));
    await key("Down"); await sleep(400); s=await st(); await shot("shown-again"); log(!s.hide,sz+" any key shows the UI again");
    // dropped frames over 5s
    await sleep(5000); const dq=await ev(`__mv.t.map(t=>{const q=t.v.getVideoPlaybackQuality();return [q.droppedVideoFrames,q.totalVideoFrames]})`); log(true,sz+" dropped/total frames per tile "+JSON.stringify(dq)+" pens="+(await ev(`JSON.stringify(__mv.t.map(t=>t.pen))`)));
    log(masters===4,sz+" master playlist requests: "+masters+" (expected 4 = one per game, none for layout/audio/zoom/remove)");
    await ev(`mvClose()`); await sleep(300); log(await ev(`!document.getElementById('mv').classList.contains('on')&&!document.getElementById('pl').classList.contains('on')`),sz+" exit closes");
    // picker / Add game path with mocked live games; D-pad in all 4 directions; keys 1-4; hidden key only wakes UI
    await ev(`window.__g0=games;window.games=()=>({live:[0,1,2,3,4].map(n=>{const g=__t(n%4);g.title="PickG"+n;g.aw="PA"+n;g.hm="PH"+n;g.sc={score:"1-0",over:false};g.st=Date.now()-6e4;g.c.u="http://127.0.0.1:47191/g"+(n%4)+"/index.html".replace("index.html","index.m3u8");return g})});0`);
    await ev(`(()=>{const g=games().live[0];mvAdd(g,{feeds:[g.c],c:g.c});mvPick();0})()`); await sleep(800);
    log(await ev(`!document.getElementById('mvp').hidden&&document.querySelectorAll('#mvp button[data-pg]').length===4`),sz+" picker lists 4 other live games");
    await ev(`document.querySelector('#mvp button[data-pg]').click()`); await sleep(500); await ev(`mvPick();0`); await ev(`document.querySelector('#mvp button[data-pg]').click()`); await sleep(300); await ev(`mvPick();0`); await ev(`document.querySelector('#mvp button[data-pg]').click()`); await sleep(1500);
    s=await st(); log(s.n===4&&s.unmuted===1,sz+" picker added up to 4 tiles n="+s.n); await ev(`mvAct("add")`); log(await ev(`document.getElementById('mvt').textContent`)==="Multiview is full (4 games)",sz+" 5th add refused with toast");
    await ev(`__mv.sty[4]="grid";mvLayout();mvShow();document.getElementById('mv').focus();0`); await sleep(300); await ev(`__vid=__mv.t.map(t=>t.v);0`); const b4=(await st()).loads; let seq=[];
    for(const k of ["Right","Down","Left","Up"]){await key(k);seq.push(await ev(`__mv.t.indexOf(__mv.f)`))}
    const want=phone?"0,1,1,0":"1,3,2,0"; // phone grid = 4 full-width rows, so Right/Left do nothing
    log(seq.join()===want,sz+" D-pad focus path in the grid Right,Down,Left,Up -> "+seq.join()+" (want "+want+")");
    await key("3"); await sleep(500); s=await st(); log(s.main===2&&s.unmuted===1&&s.loads===b4&&s.same,sz+" key 3 gives tile 3 audio, loads unchanged");
    await sleep(3600); await key("Left"); await sleep(300); log(await ev(`!document.getElementById('mv').classList.contains('hide')&&__mv.t.indexOf(__mv.f)===2`),sz+" key while hidden only wakes UI (focus unmoved)");
    await ev(`mvClose();window.games=window.__g0;0`); await sleep(300);
    // per-tile FEED menu, SWAP game (only that tile reloads; slot, zoom, audio kept)
    await ev(`window.__add2=n=>{const g=__t(n),a={n:"Alt feed "+n,u:"http://127.0.0.1:47191/g"+((n+1)%4)+"/index.m3u8",g:"y"};mvAdd(g,{feeds:[g.c,a],c:g.c})};__add2(0);__add2(1);__add2(2);0`); await sleep(6000);
    await ev(`__mv.sty[3]="main3";__mv.f=__mv.t[1];mvAct("zp");mvAct("zp");0`); await sleep(500);
    const rects=`__mv.t.map(t=>{const r=t.el.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join()})`;
    const mark=()=>ev(`window.__p0={h:__mv.t.map(t=>t.hls),loads:__mvLoads,au:__mv.t.map(t=>!t.v.muted),r:${rects},tf:__mv.t.map(t=>t.v.style.transform),v:__mv.t.map(t=>t.v),main:__mv.t.indexOf(__mv.a)};0`);
    const chk=()=>ev(`(()=>{const T=__mv.t,p=window.__p0;return {loads:__mvLoads-p.loads,hc:T.map((t,i)=>t.hls!==p.h[i]),vs:T.every((t,i)=>t.v===p.v[i]&&t.v.parentNode===t.el),au:JSON.stringify(T.map(t=>!t.v.muted))===JSON.stringify(p.au),pos:JSON.stringify(${rects})===JSON.stringify(p.r),tf:JSON.stringify(T.map(t=>t.v.style.transform))===JSON.stringify(p.tf),main:T.indexOf(__mv.a)===p.main,mi:p.main}})()`);
    await mark(); await ev(`mvAct("fd")`); await sleep(300);
    log(await ev(`!$("#mvp").hidden&&document.querySelectorAll("#mvp button[data-fi]").length===2&&document.querySelectorAll("#mvp button")[0].textContent.startsWith("Test feed 1")&&document.querySelectorAll("#mvp button")[0].getAttribute("aria-checked")==="true"&&$("#mvp").contains(document.activeElement)`),sz+" Feed button opens this tile's feed list, current marked, focus inside");
    await key("Down"); await key("Return"); await sleep(4500); let c=await chk();
    log(c.loads===2&&c.hc.join()==="false,true,false"&&c.vs&&c.au&&c.pos&&c.tf&&c.main&&await ev(`__mv.t[1].c.n==="Alt feed 1"&&$("#mvp").hidden`),sz+" feed change reloads only tile 2: "+JSON.stringify(c));
    log(await ev(`__mv.t[1].v.readyState>2&&!__mv.t[1].v.paused`),sz+" tile 2 plays on the new feed");
    await mark(); await ev(`mvAct("fd")`); await sleep(200); await ev(`document.querySelector('.mt').click()`); await sleep(200); c=await chk();
    log(await ev(`$("#mvp").hidden`)&&c.loads===0&&c.au&&c.main,sz+" click outside closes the feed menu (no audio change, no reload)");
    await ev(`mvAct("fd")`); await sleep(200); await ev(`nemBack()`); log(await ev(`$("#mvp").hidden&&mvOn()`),sz+" Back closes the feed menu, stays in multiview");
    await ev(`mvShow();mvAct("fd")`); await sleep(3600); log(await ev(`$("#mvp").hidden&&$("#mv").classList.contains("hide")`),sz+" feed menu hides after 3s idle");
    await ev(`window.__g1=window.games;window.__f1=feedsFor;window.feedsFor=g=>[g.c];window.games=()=>({live:[3,2].map(n=>{const g=__t(n);g.title="Swap"+n;g.aw="SA"+n;g.hm="SH"+n;g.sc={score:"2-1",over:false};g.st=Date.now()-6e4;return g})});mvShow();__mv.f=__mv.t[1];0`);
    await mark(); await ev(`mvAct("sw")`); await sleep(300);
    log(await ev(`!$("#mvp").hidden&&document.querySelectorAll("#mvp button[data-pg]").length===2&&/SWAP/.test($("#mvp h3").textContent)`),sz+" Swap button opens the game picker");
    await ev(`document.querySelector("#mvp button[data-pg]").click()`); await sleep(4500); c=await chk();
    log(c.loads===2&&c.hc.join()==="false,true,false"&&c.vs&&c.au&&c.pos&&c.tf&&c.main&&await ev(`__mv.t.length===3&&__mv.t[1].g.title==="Swap3"&&__mv.t[1].c.u.includes("/g3/")&&__mv.t[1].lb.textContent.includes("SA3")&&__mv.t[1].v.readyState>2`),sz+" swap replaces tile 2's game in place, only it reloads: "+JSON.stringify(c));
    await mark(); await ev(`__mv.f=__mv.a;mvAct("sw")`); await sleep(300); await ev(`document.querySelector("#mvp button[data-pg]").click()`); await sleep(4500); c=await chk();
    log(c.loads===2&&c.hc.filter(Boolean).length===1&&c.hc[c.mi]&&c.vs&&c.au&&c.pos&&c.tf&&c.main&&await ev(`__mv.t.filter(t=>!t.v.muted).length===1&&!__mv.a.v.muted`),sz+" swapping the audio tile keeps audio on that slot: "+JSON.stringify(c));
    await ev(`window.games=window.__g1;window.feedsFor=window.__f1;mvClose();0`); await sleep(300);
    // entry from the single player (Multiview button) and Back handling
    await ev(`(()=>{const g=__t(0);cur={...g,feeds:[g.c],feed:g.c,list:[g.c]};$("#pl").classList.add("on");$("#bmv").hidden=false;$("#bmv").click();0})()`); await sleep(1500);
    log(await ev(`mvOn()&&__mv.t.length===1&&$("#pl").classList.contains("mvh")&&!$("#pl video").src`),sz+" player Multiview button opens multiview with the game");
    await ev(`nemBack()`); log(await ev(`mvOn()&&$("#mv").classList.contains("hide")`),sz+" Back #1 hides the UI");
    await ev(`nemBack()`); await sleep(200); log(await ev(`!mvOn()&&!$("#pl").classList.contains("on")&&__mv.t.length===0`),sz+" Back #2 leaves multiview, all streams stopped");
    log(await ev(`!document.querySelector(".mt")&&!document.querySelector("#mv video")`),sz+" no tiles/videos left in DOM");
    // entry from the single player keeps the exact feed: the playing <video> + hls move into tile 1 (no restart, no new load)
    await ev(`(()=>{const g=__t(0),a={n:"Alt feed 0",u:"http://127.0.0.1:47191/g1/index.m3u8",g:"y"};cur={...g,feeds:[g.c,a],feed:a,list:[g.c,a]};tried=new Set();$("#pl").classList.add("on");$("#bmv").hidden=false;setFeed(a);0})()`); await sleep(6000);
    await ev(`window.__e0={v:$("#v"),h:hls,l:__mvLoads,ct:$("#v").currentTime};0`);
    log(await ev(`!!__e0.h&&__e0.v.readyState>2&&__e0.ct>0`),sz+" single player is playing the 2nd feed before entry");
    await ev(`$("#bmv").click()`); await sleep(4000);
    if(process.env.MV_DEBUG)console.log("ENTRY",await ev(`(()=>{const t=__mv.t[0];return JSON.stringify([mvOn(),__mv.t.length,t.v===__e0.v,t.hls===__e0.h,__mvLoads-__e0.l,t.c.u===cur.feed.u,!t.v.muted,t.v.currentTime>__e0.ct,!t.v.paused,t.v.readyState,t.v.videoHeight,document.querySelectorAll("#v").length,$("#v")!==t.v,t.v.id])})()`));
    log(await ev(`(()=>{const t=__mv.t[0];return mvOn()&&__mv.t.length===1&&t.v===__e0.v&&t.hls===__e0.h&&__mvLoads===__e0.l&&t.c.u===cur.feed.u&&t.c.n==="Alt feed 0"&&!t.v.muted&&__mv.a===t&&t.v.currentTime>__e0.ct&&!t.v.paused&&t.v.readyState>2&&t.v.videoHeight>0&&t.el.contains(t.v)&&document.querySelectorAll("#v").length===1&&$("#v")!==t.v&&!$("#v").getAttribute("src")&&t.v.id===""})()`),sz+" entry hands the running video + hls to tile 1: same feed, no restart, no new load, audio on");
    await ev(`nemBack();nemBack();0`); await sleep(300);
    // ---- Live channels in multiview: menu add, picker (Channels section + search), mix with games, channel Feed menu, swap, handover from the single player ----
    await ev(`(()=>{const n=Date.now(),u=i=>"http://127.0.0.1:47191/g"+i+"/index.m3u8",e=(t)=>[[n-6e5,n+6e5,t+" | d"]];window.__ch0=ch;window.__ep0=EPG;
      ch=[0,1,2,3].map(i=>({n:"Chan"+i,u:u(i),g:"News",id:"c"+i,s:""}));ch.push({n:"Chan0 - feed 2",u:u(1),g:"News",id:"c9",s:""});
      EPG={c0:e("Show Zero"),c1:e("Show Zero"),c2:e("Show Two"),c3:e("Show Three"),c9:e("Other")};__mvBase=__mvLoads;openChMenu(ch[0]);0})()`); await sleep(300);
    log(await ev(`!$("#gpop").hidden&&document.querySelectorAll("#gpop [data-pa]").length===3&&/Show Zero/.test($("#gpop").textContent)&&!!$("#gpop [data-pa=cmv]")`),sz+" channel menu (Menu key / right-click) offers Watch, Multiview +, Favorite");
    await ev(`$("#gpop [data-pa=cmv]").click()`); await sleep(5000);
    log(await ev(`mvOn()&&__mv.t.length===1&&__mv.t[0].g.ch&&__mv.t[0].v.readyState>2&&__mvLoads-__mvBase===2&&/Chan0 - Show Zero/.test(__mv.t[0].lb.textContent)&&$("#gpop").hidden`),sz+" '+ Multiview' on a channel adds it, tile labelled channel + now-playing title");
    log(await ev(`document.querySelectorAll("#mvp button[data-pc]").length===3&&!!$("#mvq")&&/CHANNEL/.test($("#mvp").textContent)&&1`),sz+" picker has a Channels section (feed variants hidden, already-added channel hidden): "+await ev(`[...document.querySelectorAll("#mvp button[data-pc]")].map(x=>x.textContent).join()+"|"+$("#mvp").hidden`));
    await ev(`window.__v0=__mv.t[0].v;document.querySelector("#mvp button[data-pc]").click()`); await sleep(5000);
    log(await ev(`__mv.t.length===2&&__mv.t[1].g.ch&&__mv.t[1].g.c.n==="Chan1"&&__mv.t[0].v===__v0&&__mvLoads-__mvBase===4&&__mv.t[1].v.readyState>2&&__mv.t.filter(t=>!t.v.muted).length===1`),sz+" picked channel becomes tile 2, tile 1 untouched, one audio tile");
    await ev(`mvPick();const q=$("#mvq");q.value="three";q.dispatchEvent(new Event("input",{bubbles:true}));0`); await sleep(200);
    log(await ev(`document.querySelectorAll("#mvpl button[data-pc]").length===1&&/Chan3/.test($("#mvpl").textContent)&&/Show Three/.test($("#mvpl").textContent)&&!$("#mvp").hidden`),sz+" channel search filters by name / now-playing title");
    await ev(`document.querySelector("#mvpl button[data-pc]").click()`); await sleep(300); await ev(`mvAdd(__t(2),{feeds:[__t(2).c],c:__t(2).c});0`); await sleep(5000);
    log(await ev(`__mv.t.length===4&&__mv.t.filter(t=>t.g.ch).length===3&&!!__mv.t[3].g.title&&__mvLoads-__mvBase===8&&__mv.t.every(t=>t.v.readyState>2)`),sz+" channels and a game mix up to 4 tiles, one load each");
    await ev(`mvAdd(chG(ch[2]));0`); await sleep(300);
    log(await ev(`__mv.t.length===4&&/full/.test($("#mvt").textContent)&&__mvLoads-__mvBase===8`),sz+" 5th tile refused");
    await ev(`__vid=__mv.t.map(t=>t.v);window.__h0=__mv.t.map(t=>t.hls);__mv.f=__mv.t[0];mvAct("fd");0`); await sleep(300);
    log(await ev(`document.querySelectorAll("#mvp button[data-fi]").length===3&&/Chan0 - Show Zero/.test($("#mvp h3").textContent)&&[...document.querySelectorAll("#mvp button[data-fi] span")].map(x=>x.textContent).join()==="Chan0,Chan1,Chan0 - feed 2"`),sz+" channel Feed menu lists the channel and alt channels with the same title: "+await ev(`[...document.querySelectorAll("#mvp button[data-fi] span")].map(x=>x.textContent).join()`));
    await ev(`document.querySelectorAll("#mvp button[data-fi]")[2].click()`); await sleep(4500);
    log(await ev(`(()=>{const T=__mv.t;return T[0].c.n==="Chan0 - feed 2"&&T[0].hls!==__h0[0]&&T.slice(1).every((t,i)=>t.hls===__h0[i+1])&&__mvLoads-__mvBase===10&&T[0].v.readyState>2&&T.every((t,i)=>t.v===__vid[i])&&/Chan0 - Show Zero/.test(T[0].lb.textContent)})()`),sz+" channel Feed change reloads only that tile");
    await ev(`__mv.f=__mv.t[1];mvAct("sw");0`); await sleep(300);
    log(await ev(`/SWAP/.test($("#mvp h3").textContent)&&document.querySelectorAll("#mvp button[data-pc]").length===1`),sz+" Swap picker lists channels");
    await ev(`document.querySelector("#mvp button[data-pc]").click()`); await sleep(5000);
    log(await ev(`__mv.t.length===4&&__mv.t[1].g.c.n==="Chan2"&&/Chan2 - Show Two/.test(__mv.t[1].lb.textContent)&&__mv.t[1].v.readyState>2&&__mvLoads-__mvBase===12&&__mv.t.filter(t=>!t.v.muted).length===1`),sz+" swap tile 2 to another channel in place, others untouched");
    await ev(`mvClose();0`); await sleep(300);
    // single player watching a channel -> Multiview button hands the playing video over (no reload), channel tile labelled
    await ev(`(()=>{const c=ch[0];cur={c,tm:[c.n],t:[{}],s:"",feeds:[c],feed:c,list:ch};tried=new Set();$("#pl").classList.add("on");$("#bmv").hidden=false;setFeed(c);0})()`); await sleep(6000);
    await ev(`window.__e1={v:$("#v"),h:hls,l:__mvLoads};0`);
    log(await ev(`!$("#bmv").hidden&&!!__e1.h&&__e1.v.readyState>2`),sz+" single player is playing a channel with the Multiview button shown");
    await ev(`$("#bmv").click()`); await sleep(3000);
    log(await ev(`(()=>{const t=__mv.t[0];return mvOn()&&__mv.t.length===1&&t.g.ch&&t.v===__e1.v&&t.hls===__e1.h&&__mvLoads===__e1.l&&/Chan0 - Show Zero/.test(t.lb.textContent)&&t.feeds.length===3&&!t.v.muted&&t.v.readyState>2})()`),sz+" channel handed over from the single player: same video+hls, no new load, alt feeds available");
    await ev(`nemBack();nemBack();ch=__ch0;EPG=__ep0;0`); await sleep(300);
    w.destroy();
  }
  console.log(fails?"FAILS "+fails:"FAILS 0"); app.exit(fails?1:0);
});
