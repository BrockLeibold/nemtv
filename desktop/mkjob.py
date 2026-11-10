# usage: python mkjob.py out sizes(comma) kind(app|guide) > job.json ; app = top tabs + popup + player + player side guide; guide = 5 sections + player page + picker + game drawer
import json,sys
out,sizes,kind=sys.argv[1],sys.argv[2].split(","),sys.argv[3]
FAKE="if(!window.__fk){window.__fk=1;ch.length=0;for(let i=0;i<8;i++)ch.push({n:'Sportsnet '+i,g:'Hockey',s:'NHL',u:'http://127.0.0.1:1/'+i+'.m3u8',id:'sn'+i,logo:''});}"
SCF="const mk=(id,st,a,h,as,hs)=>({id,gameState:st,startTimeUTC:new Date().toISOString(),awayTeam:{abbrev:a,score:as,sog:21},homeTeam:{abbrev:h,score:hs,sog:18},period:2,periodDescriptor:{number:2,periodType:'REG'},clock:{timeRemaining:'05:12'},goals:[{teamAbbrev:h,name:{default:'M. Matthews'},period:2,periodDescriptor:{number:2,periodType:'REG'},timeInPeriod:'03:12',awayScore:as,homeScore:hs,strength:'ev'}]});SC.length=0;SC.push(mk(1001,'LIVE','BOS','TOR',2,3),mk(1002,'FINAL','NYR','MTL',4,1),mk(1003,'FUT','VAN','EDM',0,0));"
app=[("home","go('home')",1500),("scores",SCF+"go('scores')",1500),("schedule","go('schedule')",1500),("live",FAKE+"go('live')",1500),("setup","go('setup');document.getElementById('u').value=''",1200),
 ("guide","go('guide')",6000),
 ("popup","go('home');await new Promise(r=>setTimeout(r,800));document.querySelector('.pill').click()",1200),
 ("player","closePop();"+FAKE+"play({c:ch[0]})",2500),
 ("playerguide","guideSide()",6000)]
gd=[("ov","deckGo(0)",1500),("nw","deckGo(1)",1500),("ro","deckGo(2)",1500),("tm","deckGo(3)",1500),("gm","deckGo(4)",1500),
 ("pl","deckGo(2);openPlayer(PL().filter(p=>p.group=='F')[0].id)",1500),
 ("picker","closePlayer();document.getElementById('switchBtn').click()",1500),
 ("game","document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(r=>setTimeout(r,300));deckGo(4);await new Promise(r=>setTimeout(r,600));(document.querySelector('.cr.done')||document.querySelector('.cd.done')).click()",2500)]
steps=lambda L,p:[{"name":p+n,"pre":pre,"wait":w,"frame":kind=="app"} for n,pre,w in L]
sh=[]
for s in sizes:
    w=int(s.split("x")[0])
    if kind=="app": sh.append({"url":"/","size":s,"mobile":w<900,"steps":steps(app,"a_")})
    else: sh.append({"url":"/guide/index.html","size":s,"mobile":w<900,"steps":steps(gd,"g_")})
print(json.dumps({"out":out,"shots":sh}))
