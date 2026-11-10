// NEMTV for Windows: serves the app from a tiny local server (same as testserver.py) and shows it in a window scaled from the 960x540 TV layout
const {app,BrowserWindow}=require("electron"),http=require("http"),fs=require("fs"),path=require("path");
const A=path.join(__dirname,"app"),T={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ttf":"font/ttf"};
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split("?")[0]); if(p==="/"||p==="")p="/index.html"; if(p==="/guide/"||p==="/guide")p="/guide/index.html";
  const f=path.normalize(path.join(A,p)); if(!f.startsWith(A)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  let d=fs.readFileSync(f); if(p==="/guide/index.html")d=Buffer.from(d.toString("utf8").replace("</body>",'<link rel=stylesheet href=/_dark.css><script src=/_nav.js></script></body>'));
  r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"}); r.end(d)});
function start(){srv.once("error",e=>{if(e.code==="EADDRINUSE")srv.listen(0,"127.0.0.1")}); srv.listen(47099,"127.0.0.1")}
app.whenReady().then(()=>{
  start(); srv.on("listening",()=>{
    const w=new BrowserWindow({width:1280,height:720,backgroundColor:"#0F0E11",autoHideMenuBar:true,title:"NEMTV",icon:path.join(__dirname,"icon.png"),
      webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:false,webSecurity:false,autoplayPolicy:"no-user-gesture-required"}});
    const fit=()=>{const [cw,ch]=w.getContentSize(); w.webContents.setZoomFactor(Math.max(.3,Math.min(cw/960,ch/540)))}; // fit both ways: wide = more room sideways, tall = more room down
    w.on("resize",fit); w.webContents.on("did-finish-load",fit);
    w.webContents.on("before-input-event",(e,i)=>{if(i.type!=="keyDown")return;
      if(i.key==="F11"){w.setFullScreen(!w.isFullScreen());e.preventDefault()}
      else if(i.key==="Escape"){e.preventDefault();w.webContents.executeJavaScript("typeof nemBack==='function'&&nemBack()")}});
    w.on("app-command",(e,c)=>{if(c==="browser-backward")w.webContents.executeJavaScript("nemBack()")});
    w.loadURL("http://127.0.0.1:"+srv.address().port+"/");
    if(process.env.NEMTV_TEST)w.webContents.once("did-finish-load",async()=>{ // NEMTV_TEST=<dir> NEMTV_PAGES=home,guide: runs overlap.js on each page at many window shapes -> report.txt (+pngs)
      const chk=fs.readFileSync(path.join(__dirname,"overlap.js"),"utf8").replace(/^\s*\/\/.*$/mg,""),out=[],NL=String.fromCharCode(10),pages=(process.env.NEMTV_PAGES||"home").split(","),Q=JSON.stringify,sleep=t=>new Promise(r=>setTimeout(r,t)),ev=c=>w.webContents.executeJavaScript(c).catch(e=>{fs.appendFileSync(path.join(process.env.NEMTV_TEST,"errors.txt"),e.message+" :: "+c.slice(0,200)+String.fromCharCode(10));return ["FAIL eval-error "+e.message.slice(0,60)]});
      const SIZES=[[960,540],[1280,720],[1920,1080],[2000,833],[2560,1080],[3440,1440],[1147,1435],[800,1280],[600,900],[1024,600],[800,500],[640,360],[1366,768],[1100,1100],[480,960]];
      let fails=0,warns=0; await sleep(12000);
      await ev("window.__chk="+chk.trim().replace(/;$/,""));
      const run=async(label,doc,scope,kind,png)=>{let bad=await ev("(function(){try{return window.__chk("+doc+","+Q(scope)+","+Q(kind)+")}catch(e){return ['FAIL js-error '+e.message]}})()");const f=bad.filter(x=>/^FAIL/.test(x)),wn=bad.filter(x=>/^WARN/.test(x));
        out.push((f.length?"FAIL ":wn.length?"warn ":"ok   ")+label+" "+bad.join(" | "));if(f.length)fails++;warns+=wn.length;
        if(f.length||png)fs.writeFileSync(path.join(process.env.NEMTV_TEST,label.replace(/[^\w]+/g,"_")+".png"),(await w.webContents.capturePage()).toPNG())};
      if(process.env.NEMTV_STEPS){const st=JSON.parse(fs.readFileSync(process.env.NEMTV_STEPS,"utf8"));await ev("go('guide')");await sleep(9000);let cs="";for(const x of st){if(x.size!==cs){cs=x.size;const [sw,sh]=cs.split("x").map(Number);w.setContentSize(sw,sh);await sleep(2500)}if(x.pre)await ev(x.pre);await sleep(x.wait||1800);let r="";if(x.expr)r=await ev("(async()=>{try{return String("+x.expr+")}catch(e){return 'ERR '+e.message}})()");fs.writeFileSync(path.join(process.env.NEMTV_TEST,x.name+"_"+x.size+".png"),(await w.webContents.capturePage()).toPNG());if(x.expr)fs.appendFileSync(path.join(process.env.NEMTV_TEST,"steps.txt"),x.name+" "+x.size+": "+r+NL)}app.quit();return}
      if(process.env.NEMTV_DEBUG){await ev("go('guide')");await sleep(9000);if(process.env.NEMTV_SIZE){const [sw,sh]=process.env.NEMTV_SIZE.split("x").map(Number);w.setContentSize(sw,sh);await sleep(2500)}if(process.env.NEMTV_PRE)await ev(process.env.NEMTV_PRE);for(const k of (process.env.NEMTV_KEYS||"").split(",").filter(Boolean)){for(const t of ["keyDown","keyUp"])w.webContents.sendInputEvent({type:t,keyCode:k});await sleep(200)}const r=await w.webContents.executeJavaScript("(async()=>{try{return String("+process.env.NEMTV_DEBUG+")}catch(e){return 'ERR '+e.message}})()");fs.writeFileSync(path.join(process.env.NEMTV_TEST,"debug.txt"),String(r));fs.writeFileSync(path.join(process.env.NEMTV_TEST,"debug.png"),(await w.webContents.capturePage()).toPNG());app.quit();return}
      if(process.env.NEMTV_NAV){w.setContentSize(960,540);await sleep(1500);const nav=require("./navtest.js");for(const pg of pages){await ev("go('"+pg+"')");await sleep(pg==="guide"?9000:2000);await nav(w,ev,sleep,pg,out)}
        fs.writeFileSync(path.join(process.env.NEMTV_TEST,"nav.txt"),out.join(NL)+NL);app.quit();return}
      for(const pg of pages){await ev("go('"+pg+"')");await sleep(pg==="guide"?9000:1500);
        for(const [W,H] of (process.env.NEMTV_FAST?SIZES.filter((x,i)=>[0,3,6,7].includes(i)):SIZES)){w.setContentSize(W,H);await sleep(pg==="guide"?2500:1200);const vp=await ev("innerWidth+'x'+innerHeight"),tag=pg+" "+W+"x"+H+" (css "+vp+")",png=[960,2560,1147].includes(W);
          if(pg==="guide"){const D="document.getElementById('gf').contentDocument";
            await run(tag+" bars",D,".wrap>.top","guide",false);
            for(let k=0;k<5;k++){await ev("document.getElementById('gf').contentWindow.deckGo("+k+")");await sleep(1500);await run(tag+" slide"+(k+1),D,".slide:nth-child("+(k+1)+")","guide",png)}}
          else await run(tag,"document","main",pg==="home"?"home":"page",png)}}
      fs.writeFileSync(path.join(process.env.NEMTV_TEST,"report.txt"),out.join(NL)+NL+"FAILS "+fails+" WARNS "+warns+NL);app.quit()});
    if(process.env.NEMTV_SHOT)w.webContents.once("did-finish-load",async()=>{ // test helper: NEMTV_SHOT=<dir> saves screenshots at a few window sizes
      await new Promise(r=>setTimeout(r,12000));
      for(const [n,W,H] of [["wide",2000,833],["tall",1147,1435],["std",1280,720]]){w.setContentSize(W,H);await new Promise(r=>setTimeout(r,2500));
        fs.writeFileSync(path.join(process.env.NEMTV_SHOT,n+".png"),(await w.webContents.capturePage()).toPNG())}
      app.quit()});
  })});
app.on("window-all-closed",()=>app.quit());
