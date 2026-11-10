// simulates games() day-rollover filter from assets/index.html
const H=3600e3,DUR=3.5*H;
function keep(st,t,endSeen){const sod=new Date(new Date(t).setHours(0,0,0,0)).getTime();const end=endSeen||st+3.5*H;
 if(st>=sod+7*864e5||(st<sod?t>=end+90*60e3:st+DUR<=t&&!endSeen))return false;return true}
const d=(s)=>new Date(s).getTime();
const cases=[
 ["8pm game, ended 11:30pm seen, now 00:30 next day",d("2026-11-09T20:00"),d("2026-11-10T00:30"),d("2026-11-09T23:30"),true],
 ["same, now 01:20 (>90min after end)",d("2026-11-09T19:00"),d("2026-11-10T01:20"),d("2026-11-09T21:40"),false],
 ["10pm game unseen end, now 01:00 (end=1:30)",d("2026-11-09T22:00"),d("2026-11-10T01:00"),0,true],
 ["10pm game unseen end, now 03:10 (>01:30+90)",d("2026-11-09T22:00"),d("2026-11-10T03:10"),0,false],
 ["today 7pm game finished seen, now 23:30 same day",d("2026-11-10T19:00"),d("2026-11-10T23:30"),d("2026-11-10T21:50"),true],
 ["today game >3.5h unseen no score, now 23:30",d("2026-11-10T17:00"),d("2026-11-10T23:30"),0,false],
];
let bad=0;for(const[n,st,t,e,x]of cases){const k=keep(st,t,e);if(k!==x)bad++;console.log((k===x?"ok  ":"FAIL")+" "+n+" -> keep="+k)}
process.exit(bad)
