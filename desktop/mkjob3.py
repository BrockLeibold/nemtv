# usage: python mkjob3.py out sizes > job.json ; guide sections via the app wrapper (real scaling), teams BOS,TOR,SJS x 5 sections
import json,sys
out,sizes=sys.argv[1],sys.argv[2].split(",")
G="const g=document.getElementById('gf').contentWindow;const sl=t=>new Promise(r=>setTimeout(r,t));"
steps=[]
for t in ["BOS","TOR","SJS"]:
    for i,s in enumerate(["ov","nw","ro","tm","gm"]):
        pre=G+("go('guide');await sl(5000);await g.setTeam('%s');await sl(2500);"%t if i==0 else "")+"g.deckGo(%d)"%i
        steps.append({"name":"g_%s_%s"%(t,s),"pre":pre,"wait":1500,"frame":False})
sh=[{"url":"/","size":s,"mobile":int(s.split("x")[0])<900,"steps":steps} for s in sizes]
print(json.dumps({"out":out,"shots":sh}))
