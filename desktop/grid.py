# usage: grid.py out.jpg cols tileW files... -> grid jpeg <16KB
import sys,io
from PIL import Image
o,cols,tw=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]);fs=sys.argv[4:]
ims=[Image.open(f).convert("RGB") for f in fs]
for w,q in [(tw,40),(tw,30),(int(tw*.85),25),(int(tw*.7),20),(int(tw*.6),16)]:
    ts=[]
    for im in ims:
        t=im.copy();t.thumbnail((w,10000));ts.append(t)
    th=max(t.height for t in ts);rows=(len(ts)+cols-1)//cols
    S=Image.new("RGB",(cols*(w+4),rows*(th+4)),(255,0,255))
    for i,t in enumerate(ts):S.paste(t,((i%cols)*(w+4),(i//cols)*(th+4)))
    b=io.BytesIO();S.save(b,"JPEG",quality=q)
    if b.tell()<15800:break
open(o,"wb").write(b.getvalue());print(o,b.tell(),S.size)
