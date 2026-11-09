// copies the TV app into desktop/app (run after `bash build.sh` so assets/guide exists)
const fs=require("fs"),path=require("path"),R=path.join(__dirname,".."),O=path.join(__dirname,"app");
fs.rmSync(O,{recursive:true,force:true}); fs.cpSync(path.join(R,"assets"),O,{recursive:true,filter:s=>!/config\.example/.test(s)});
fs.copyFileSync(path.join(R,"assets/gx/dark.css"),path.join(O,"_dark.css")); fs.copyFileSync(path.join(R,"assets/gx/nav.js"),path.join(O,"_nav.js"));
const f=path.join(O,"index.html"); let s=fs.readFileSync(f,"utf8"); const a='const GURL=window.Android?"https://guide.nemtv.local/index.html":"guide/index.html";';
if(!s.includes(a))throw new Error("GURL line not found"); fs.writeFileSync(f,s.replace(a,'const GURL="guide/index.html";'));
console.log("staged");
