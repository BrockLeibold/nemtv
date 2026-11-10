import sys,io,glob,os
from PIL import Image
# usage: sheet.py outdir pattern... (png files) -> one jpeg <16KB
out=sys.argv[1];fs=sys.argv[2:]
ims=[Image.open(f).convert("RGB") for f in fs]
n=len(ims);H=int(sys.argv[0] and 340)
for H,q in [(340,30),(300,25),(260,20),(230,16),(200,14),(180,12)]:
    tiles=[]
    for im in ims:
        t=im.copy();t.thumbnail((10000,H));tiles.append(t)
    W=sum(t.width for t in tiles)+4*(n-1);S=Image.new("RGB",(W,H),(255,0,255));x=0
    for t in tiles:S.paste(t,(x,0));x+=t.width+4
    b=io.BytesIO();S.save(b,"JPEG",quality=q)
    if b.tell()<15800:break
open(out,"wb").write(b.getvalue());print(out,b.tell(),S.size)
