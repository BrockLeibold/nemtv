# usage: python finalshots.py <webshot out dir> ...  -> shots/round2/<page>_<section>_<WxH>.jpg (viewable JPEGs from the webshot PNGs)
import sys,os,io,glob
from PIL import Image
M={"a_home":"home_main","a_scores":"scores_main","a_schedule":"schedule_main","a_live":"live_main","a_setup":"setup_main","a_guide":"guidetab_main","a_popup":"home_gamepopup","a_player":"player_main","a_playerguide":"player_guidepanel",
 "g_ov":"guide_overview","g_nw":"guide_news","g_ro":"guide_roster","g_tm":"guide_team","g_gm":"guide_games","g_pl":"guide_playerpage","g_picker":"guide_teampicker","g_game":"guide_gamedrawer"}
os.makedirs("shots/round2",exist_ok=True)
for d in sys.argv[1:]:
    for f in glob.glob(os.path.join(d,"*.png")):
        b=os.path.splitext(os.path.basename(f))[0];k,sz=b.rsplit("_",1)
        src=Image.open(f).convert("RGB")
        for m,q in [(640,25),(640,18),(560,18),(520,14),(480,12),(420,10)]:
            im=src.copy();im.thumbnail((m,m));bb=io.BytesIO();im.save(bb,"JPEG",quality=q)
            if bb.tell()<15800:break
        open("shots/round2/%s_%s.jpg"%(M[k],sz),"wb").write(bb.getvalue())
print(len(glob.glob("shots/round2/*.jpg")),"files")
