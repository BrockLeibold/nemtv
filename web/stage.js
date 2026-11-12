// stages the app into web/app for the Docker build: node web/stage.js  (guide comes straight from guide/, no need for build.sh)
const fs=require("fs"),path=require("path"),R=path.join(__dirname,".."),O=path.join(__dirname,"app");
fs.rmSync(O,{recursive:true,force:true});
fs.cpSync(path.join(R,"assets"),O,{recursive:true,filter:s=>!/config\.example|[\/]assets[\/]guide$|[\/]assets[\/]guide[\/]/.test(s)});
fs.cpSync(path.join(R,"guide"),path.join(O,"guide"),{recursive:true,filter:s=>!/[\\/]guide[\\/]tools([\\/]|$)/.test(s)});
fs.copyFileSync(path.join(R,"assets/gx/dark.css"),path.join(O,"_dark.css")); fs.copyFileSync(path.join(R,"assets/gx/nav.js"),path.join(O,"_nav.js"));
const f=path.join(O,"index.html"); let s=fs.readFileSync(f,"utf8");
const sub=(a,b)=>{if(!s.includes(a))throw new Error("not found: "+a.slice(0,50));s=s.replace(a,()=>b)};
sub('const GURL=window.Android?"https://guide.nemtv.local/index.html":"guide/index.html";','const GURL="guide/index.html";'); // guide is served at /guide/ here
// Canada Stremio is the main feed: for a game with a Stremio listing, don't start a playlist feed first; the Canadian addon feed leads (setFeed on svFeeds). No Stremio result = falls back to feeds[0].
sub('if(feeds[0])setFeed(fmPick(g,feeds)); else msgP("Finding feeds...","full");','if(feeds[0]&&!g.sid)setFeed(fmPick(g,feeds)); else msgP("Finding feeds...","full");');
fs.writeFileSync(path.join(O,"app.html"),s); fs.rmSync(f);
// index.html = wrapper: wide TV windows run the 960x540 design in an iframe scaled to fit (like Electron's zoom factor: media queries + innerWidth inside see the TV size); phone/tablet/small windows run it 1:1
fs.writeFileSync(f,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEMTV</title>
<link rel="icon" href="nemtv-logo.png"><style>html,body{margin:0;height:100%;overflow:hidden;background:#0b0a0d}iframe{position:fixed;left:0;top:0;border:0;transform-origin:0 0;background:#0b0a0d}</style></head><body>
<iframe id="a" src="app.html" allow="fullscreen; autoplay" allowfullscreen></iframe>
<script>(function(){var f=document.getElementById("a"),M="(max-width:900px),(max-height:520px),(min-width:701px) and (max-aspect-ratio:3/2)";
function fit(){var w=innerWidth,h=innerHeight,z=1;if(w>1100&&!matchMedia(M).matches)z=Math.max(1,Math.min(w/960,h/540)*.5); // desktop UI at half size (Brock 2026-11-11)
f.style.width=w/z+"px";f.style.height=h/z+"px";f.style.transform=z===1?"none":"scale("+z+")"}
addEventListener("resize",fit);fit();f.addEventListener("load",function(){try{f.contentWindow.focus()}catch(e){}});
document.addEventListener("keydown",function(){try{f.contentWindow.focus()}catch(e){}})})()</script></body></html>`);
console.log("staged web/app", fs.existsSync(path.join(O,"stremio.json"))?"(stremio.json included)":"(NO stremio.json: addon feature off)");
