# usage: python tojpg.py <srcdir> <dstdir> [glob]  -> viewable JPEG copies (<16KB each: 640px max, q25, shrinks until it fits)
import sys,glob,os,io
from PIL import Image
s,d=sys.argv[1],sys.argv[2];g=sys.argv[3] if len(sys.argv)>3 else "*.png"
os.makedirs(d,exist_ok=True)
for f in glob.glob(os.path.join(s,g)):
    src=Image.open(f).convert("RGB");n=os.path.splitext(os.path.basename(f))[0]+".jpg"
    for m,q in [(640,25),(640,18),(560,18),(520,14),(480,12),(420,10)]:
        im=src.copy();im.thumbnail((m,m));b=io.BytesIO();im.save(b,"JPEG",quality=q)
        if b.tell()<15800:break
    open(os.path.join(d,n),"wb").write(b.getvalue());print(n,b.tell())
