# usage: python sweep.py steps.json  -> runs electron with the steps, downsizes pngs to shots/sweep_final/*.jpg, prints steps.txt
import subprocess,sys,os,glob,shutil
from PIL import Image
here=os.path.dirname(os.path.abspath(__file__)); d=os.path.join(here,'shots','tmp_sweep'); shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
env=dict(os.environ,NEMTV_STEPS=os.path.abspath(sys.argv[1]),NEMTV_TEST=d,NEMTV_FAST='1')
try: subprocess.run('npx electron .',cwd=here,env=env,shell=True,timeout=900,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
except Exception as e: print('timeout',e)
subprocess.run('taskkill /F /IM electron.exe',shell=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
out=os.path.join(here,'shots','sweep_final'); os.makedirs(out,exist_ok=True)
for f in glob.glob(d+'/*.png'):
    im=Image.open(f).convert('RGB'); im.thumbnail((640,640)); o=os.path.join(out,os.path.basename(f)[:-4]+'.jpg')
    for q in (30,25,20,15,10):
        im.save(o,quality=q)
        if os.path.getsize(o)<15800: break
p=os.path.join(d,'steps.txt'); print(open(p).read() if os.path.exists(p) else 'no steps.txt'); 
e=os.path.join(d,'errors.txt'); print(open(e).read() if os.path.exists(e) else '')
