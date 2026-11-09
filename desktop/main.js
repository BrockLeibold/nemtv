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
    if(process.env.NEMTV_SHOT)w.webContents.once("did-finish-load",async()=>{ // test helper: NEMTV_SHOT=<dir> saves screenshots at a few window sizes
      await new Promise(r=>setTimeout(r,12000));
      for(const [n,W,H] of [["wide",2000,833],["tall",1147,1435],["std",1280,720]]){w.setContentSize(W,H);await new Promise(r=>setTimeout(r,2500));
        fs.writeFileSync(path.join(process.env.NEMTV_SHOT,n+".png"),(await w.webContents.capturePage()).toPNG())}
      app.quit()});
  })});
app.on("window-all-closed",()=>app.quit());
