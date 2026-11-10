// Real-size browser test (NO 960x540 zoom like main.js): serves ../web/app (run `node ../web/stage.js` first) and drives a plain window.
// usage: WS_JOB=job.json npx electron webshot.js
// job: {out:"dir", shots:[{url:"/", size:"390x844", mobile:true, steps:[{name, pre, wait, frame:true|false}]}]}
// per step: eval `pre` in the top window, wait, audit page (+guide iframe #gf), save <out>/<name>_<WxH>.png, append audit line to <out>/audit.txt
const {app,BrowserWindow}=require("electron"),http=require("http"),fs=require("fs"),path=require("path");
const A=path.join(__dirname,"..","web","app"),T={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ttf":"font/ttf",".jpg":"image/jpeg",".webp":"image/webp"};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";if(p==="/guide/"||p==="/guide")p="/guide/index.html";
  const f=path.normalize(path.join(A,p));if(!f.startsWith(A)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  let d=fs.readFileSync(f);if(p==="/guide/index.html")d=Buffer.from(d.toString("utf8").replace("</body>",'<link rel=stylesheet href=/_dark.css><script src=/_nav.js></script></body>'));
  const send=()=>{r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)};
  const DL=+process.env.SK_DELAY||0; if(DL&&/\.(json|png|jpg|jpeg|svg|webp)$/.test(p)&&new RegExp(process.env.SK_MATCH||".").test(p))setTimeout(send,DL); else send()}); // SK_DELAY=ms [SK_MATCH=regex]: hold data + images so loading skeletons can be screenshotted
const AUDIT=`(function(w){var d=w.document,out=[],iw=w.innerWidth,ih=w.innerHeight,phone=iw<700||ih<500;
 var de=d.documentElement; if(de.scrollWidth>iw+1)out.push("HSCROLL "+de.scrollWidth+">"+iw);
 var vis=function(e){var r=e.getBoundingClientRect();if(r.width<1||r.height<1)return null;var c=w.getComputedStyle(e);if(c.visibility==="hidden"||c.display==="none"||+c.opacity===0)return null;return r};
 var sel=function(e){return e.tagName.toLowerCase()+(e.id?"#"+e.id:"")+(e.className&&e.className.baseVal===undefined?"."+String(e.className).trim().split(/\\s+/).slice(0,2).join("."):"")};
 var zoomOf=function(e){var z=1;for(var n=e;n&&n.nodeType===1;n=n.parentElement){var s=w.getComputedStyle(n).zoom;if(s&&s!=="1"&&+s>0)z*=+s}return z};
 var all=d.body?d.body.querySelectorAll("*"):[],off=[],small=[],tap=[],clip=[];
 for(var i=0;i<all.length;i++){var e=all[i],r=vis(e);if(!r)continue;
  var hid=false;for(var n=e.parentElement;n&&n!==d.body;n=n.parentElement){var c=w.getComputedStyle(n);if(c.display==="none"||c.visibility==="hidden"){hid=true;break}}if(hid)continue;
  var own=false;for(var k=0;k<e.childNodes.length;k++){var cn=e.childNodes[k];if(cn.nodeType===3&&cn.textContent.trim()){own=true;break}}
  var cs=w.getComputedStyle(e);if(r.left>=iw-1||r.right<=1)continue;
  if(own){var fs=parseFloat(cs.fontSize)*zoomOf(e);if(fs<(phone?11:8.5)-.01)small.push(sel(e)+" "+fs.toFixed(1)+"px")}
  if(r.right>iw+2||r.left<-2){var clipped=false;for(var m=e.parentElement;m&&m!==d.documentElement;m=m.parentElement){var mc=w.getComputedStyle(m);if(/hidden|auto|scroll|clip/.test(mc.overflowX)&&m!==d.body){var mr=m.getBoundingClientRect();if(mr.right<=iw+2&&mr.left>=-2){clipped=true;break}}if(mc.position==="fixed"&&false)break}
   if(!clipped&&cs.position!=="fixed")off.push(sel(e)+" "+Math.round(r.left)+".."+Math.round(r.right))}
  if(/^(BUTTON|A|SELECT|INPUT)$/.test(e.tagName)||e.getAttribute("role")==="button"||e.hasAttribute("data-t")||e.hasAttribute("data-gid")){
    if(phone&&Math.min(r.width,r.height)<(e.tagName==="INPUT"&&e.type==="checkbox"?0:38))tap.push(sel(e)+" "+Math.round(r.width)+"x"+Math.round(r.height))}
  if(own&&cs.overflow!=="visible"&&(e.scrollWidth>e.clientWidth+2)&&cs.textOverflow==="ellipsis")clip.push(sel(e)+" '"+e.textContent.trim().slice(0,16)+"'");
 }
 var u=function(a){var s={};a.forEach(function(x){s[x]=(s[x]||0)+1});var k=Object.keys(s).sort(function(p,q){return s[q]-s[p]});return k.map(function(x){return x+(s[x]>1?' x'+s[x]:'')})};
 if(off.length)out.push("OFFSCREEN("+off.length+") "+u(off).slice(0,6).join("; "));
 if(small.length)out.push("SMALL("+small.length+") "+u(small).slice(0,6).join("; "));
 if(tap.length)out.push("TAP("+tap.length+") "+u(tap).slice(0,6).join("; "));
 if(clip.length)out.push("ELLIPSIS("+clip.length+") "+u(clip).slice(0,3).join("; "));
 return out.join(" | ")||"ok"})`;
const sleep=t=>new Promise(r=>setTimeout(r,t));
process.on("uncaughtException",e=>{fs.writeFileSync(path.join(__dirname,"webshot-err.txt"),String(e&&e.stack||e));app.exit(1)});
process.on("unhandledRejection",e=>{fs.writeFileSync(path.join(__dirname,"webshot-err.txt"),String(e&&e.stack||e));app.exit(1)});
app.on("window-all-closed",()=>{});
app.setPath("userData",path.join(require("os").tmpdir(),"webshot-ud"));
app.whenReady().then(async()=>{
  await new Promise(r=>srv.listen(47188,"127.0.0.1",r));
  const job=JSON.parse(fs.readFileSync(process.env.WS_JOB,"utf8")),out=job.out;fs.mkdirSync(out,{recursive:true});
  for(const s of job.shots){
    const [W,H]=s.size.split("x").map(Number);
    const w=new BrowserWindow({width:W,height:H,useContentSize:true,show:true,frame:false,backgroundColor:"#0F0E11",webPreferences:{contextIsolation:false,webSecurity:false,autoplayPolicy:"no-user-gesture-required",zoomFactor:1}});
    w.setContentSize(W,H);
    const wc=w.webContents;
    if(s.mobile)wc.setUserAgent("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36");
    await w.loadURL("http://127.0.0.1:47188"+(s.url||"/")).catch(e=>fs.appendFileSync(path.join(out,"audit.txt"),"loadURL "+e.message+"\n"));
    const ev=c=>wc.executeJavaScript("(()=>{const f=document.getElementById('a');return (f&&f.contentWindow?f.contentWindow:window).eval("+JSON.stringify(c)+")})()").catch(e=>"ERR "+e.message.slice(0,80));
    await sleep(s.boot||(s.url&&s.url!=="/"?6000:9000));
    for(const st of s.steps){
      if(st.pre)await ev("(async()=>{"+st.pre+"})()");
      await sleep(st.wait||1500);
      const parts=[];parts.push("top:"+await ev(AUDIT+"(window)"));
      if(st.frame!==false){const fr=await ev("(function(){var f=document.getElementById('gf');return f&&f.contentWindow&&f.contentDocument&&!document.getElementById('gp').hidden?1:0})()");
        if(fr===1)parts.push("guide:"+await ev("("+AUDIT+")(document.getElementById('gf').contentWindow)"))}
      const name=st.name+"_"+s.size;
      fs.writeFileSync(path.join(out,name+".png"),(await wc.capturePage()).toPNG());
      fs.appendFileSync(path.join(out,"audit.txt"),name+" :: "+parts.join(" || ")+"\n");
      if(st.expr)fs.appendFileSync(path.join(out,"audit.txt"),"   expr "+await ev("(async()=>String("+st.expr+"))()")+"\n");
    }
    w.destroy();
  }
  app.quit();
});

