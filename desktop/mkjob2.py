# usage: python mkjob2.py out sizes kind(app|guide) > job.json ; guide = teams BOS,TOR,SJS x 5 sections; app adds player probes + error capture
import json,sys
sys.argv.append("")
out,sizes,kind=sys.argv[1],sys.argv[2].split(","),sys.argv[3]
exec(open("mkjob.py").read().split("steps=lambda")[0].split("app=[",1)[0].replace("out,sizes,kind=sys.argv[1],sys.argv[2].split(\",\"),sys.argv[3]",""))
ERR="if(!window.__e){window.__e=[];addEventListener('error',e=>__e.push(e.message))}"
PROBE="[...document.querySelectorAll('#ptop button,#pctl button')].map(b=>{const r=b.getBoundingClientRect();return b.id+':'+Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.left)+','+Math.round(r.top)}).join(' ')+' | gone='+['bpp','bmu','bcl'].map(i=>!document.getElementById(i)).join()+' | closeTxt='+/\b(close|pause|mute)\b/i.test(document.getElementById('pl').innerText)+' | errs='+(window.__e||[]).join('~')+' | pbackFocusable='+(document.getElementById('pback').tabIndex>=0)+' | pfsFocusable='+(document.getElementById('pfs').tabIndex>=0)"
app=[("home",ERR+"go('home')",1500),("scores","go('scores')",1500),("schedule","go('schedule')",1500),("live",FAKE+"go('live')",1500),("setup","go('setup');document.getElementById('u').value=''",1200),("guide","go('guide')",6000),
 ("player","closePop&&closePop();"+FAKE+"play({c:ch[0]})",2500)]
steps=[]
if kind=="app":
    for n,pre,w in app: steps.append({"name":"a_"+n,"pre":pre,"wait":w,"frame":False})
    steps[-1]["expr"]=PROBE
    steps.append({"name":"a_playerfocus","pre":"document.getElementById('pback').focus()","wait":600,"frame":False,"expr":"document.activeElement.id"})
    steps.append({"name":"a_playerfs","pre":"document.getElementById('pfs').focus()","wait":600,"frame":False,"expr":"document.activeElement.id+' errs='+(window.__e||[]).join('~')"})
    steps.append({"name":"a_playerguide","pre":"guideSide()","wait":6000})
else:
    for t in ["BOS","TOR","SJS"]:
        for i,s in enumerate(["ov","nw","ro","tm","gm"]):
            steps.append({"name":"g_%s_%s"%(t,s),"pre":("await setTeam('%s');await new Promise(r=>setTimeout(r,1500));"%t if i==0 else "")+"deckGo(%d)"%i,"wait":1500,"frame":False})
sh=[{"url":"/" if kind=="app" else "/guide/index.html","size":s,"mobile":int(s.split("x")[0])<900,"steps":steps} for s in sizes]
print(json.dumps({"out":out,"shots":sh}))
