// stands in for the Android bridge: native fetches the TV app does through Main.java
const t=(u)=>fetch(u).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.text()});
const ymd=s=>{const m=/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(?:\s*([+-]\d{4}))?/.exec(s||"");if(!m)return 0;const z=m[7]||"+0000",o=(z[0]==="-"?-1:1)*(+z.slice(1,3)*60+ +z.slice(3,5));return Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6])-o*60000};
window.NEMDESK=true;
window.Android={
  load(u){t(u).then(x=>window.gotList(x,"")).catch(e=>window.gotList("",String(e.message||e)))},
  guideSync(){},
  epg(u){t(u).then(x=>{const d=new DOMParser().parseFromString(x,"text/xml"),all={},now=Date.now();
    d.querySelectorAll("programme").forEach(p=>{const s=ymd(p.getAttribute("start")),e=ymd(p.getAttribute("stop")),ti=(p.querySelector("title")||{}).textContent||"",
      tx=[...p.querySelectorAll("title,sub-title,desc")].map(n=>n.textContent).join(" | "),hk=/nhl|hockey/i.test(tx);
      if(hk||(e>now-4*36e5&&s<now+36e5*36)){const c=p.getAttribute("channel");(all[c]=all[c]||[]).push([s,e,(hk?tx:ti).slice(0,300),hk?1:0])}});
    window.gotEpg(all,"")}).catch(e=>window.gotEpg(null,String(e.message||e)))}
};
