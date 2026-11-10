import sys,io
from PIL import Image
d=sys.argv[1]; pre=sys.argv[2]; ks=sys.argv[3:]
for k in ks:
    i=Image.open(f"{d}/{pre}_slide{k}.png").convert("RGB")
    for w,q in ((620,24),(560,20),(520,16),(480,12)):
        j=i.resize((w,int(w*i.size[1]/i.size[0]))).quantize(q).convert("RGB"); b=io.BytesIO(); j.save(b,"JPEG",quality=25)
        if len(b.getvalue())<15500: break
    open(f"{d}/v{k}.jpg","wb").write(b.getvalue())
