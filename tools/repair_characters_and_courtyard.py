"""Produce independent, transparent 4x4 walk sprites from original approved cast
and an empty courtyard where furniture is placed at runtime.
This transforms user-approved project artwork, not assets from other games.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import cv2
import numpy as np
import random

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'tools/reference/approved-character-sheet.webp'
if not ART.exists():
    raise SystemExit('Original approved character contact sheet missing. Use the repo sprite assets as fallback.')
src=Image.open(ART).convert('RGB')
cols={
    'ngu-choi':[125,174,223,273], 'chu-tam':[345,392,440,489],
    'co-sau':[557,605,653,701], 'dau-bep':[769,817,865,913],
    'phuc-vu':[977,1025,1073,1121], 'khach-nam':[1178,1227,1274,1322],
    'khach-nu':[1376,1424,1472,1519],
}
# Source is rows down / left / right / up, four successive walking frames each
rows=[(193,264),(262,330),(330,399),(398,473)]
folder=ROOT/'public/assets/pixel/characters';folder.mkdir(parents=True,exist_ok=True)
for name, xs in cols.items():
    sheet=Image.new('RGBA',(256,384),(0,0,0,0))
    for direction,(y0,y1) in enumerate(rows):
        for frame,x in enumerate(xs):
            rgb=np.array(src.crop((x-23,y0,x+23,y1))).astype(np.int16)
            r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
            # The backdrop is a fairly uniform plum color; only discard these pixels.
            delta=np.maximum.reduce([abs(r-72),abs(g-45),abs(b-86)])
            mask=(b>r+6)&(b>g+18)&(r>=48)&(r<137)&(g>=30)&(g<105)
            # Keep nonpurple connected subject parts larger than tiny isolated dots.
            alpha=np.where(mask,0,255).astype('uint8')
            n,labels,stats,_=cv2.connectedComponentsWithStats((alpha>0).astype('uint8'),8)
            good=np.zeros_like(alpha)
            for j in range(1,n):
                if stats[j,cv2.CC_STAT_AREA]>=6:good[labels==j]=255
            rgba=np.concatenate([rgb.clip(0,255).astype('uint8'),good[:,:,None]],axis=2)
            pic=Image.fromarray(rgba,'RGBA')
            bbox=pic.getbbox()
            if not bbox:continue
            pic=pic.crop(bbox)
            pic.thumbnail((56,80),Image.Resampling.LANCZOS)
            # Correct: EVERY frame is at its own x/y atlas position.
            px=frame*64+(64-pic.width)//2
            py=direction*96+96-pic.height-4
            sheet.paste(pic,(px,py))
    sheet.save(folder/f'{name}.png',optimize=True)

# Save a cutout/playable courtyard map; original high-detail building remains.
map_path=ROOT/'public/assets/harbor-map.webp'
base=Image.open(map_path).convert('RGB')
W,H=base.size
assert (W,H)==(941,1088), (W,H)
draw=ImageDraw.Draw(base)
rng=random.Random(41)
# Walkable patio begins below the fish counters. The dock on the left is preserved.
left,top=335,719
# Matching warm terra-cotta tile floor; individual furniture/actors will be Phaser objects.
draw.rectangle((left,top,W,H),fill=(177,132,88))
cellw,cellh=77,76
for row,y in enumerate(range(top-40,H+cellh,cellh)):
    for col,x in enumerate(range(left-40,W+cellw,cellw)):
        shade=rng.randrange(-9,10)
        colr=(min(255,190+shade),min(255,147+shade),min(255,99+shade))
        draw.rectangle((x+2,y+2,x+cellw-2,y+cellh-2),fill=colr)
        draw.line((x+2,y+2,x+cellw-2,y+2),fill=(218,173,119),width=2)
        draw.line((x+2,y+2,x+2,y+cellh-2),fill=(219,174,121),width=2)
        draw.line((x+cellw-2,y+3,x+cellw-2,y+cellh-2),fill=(124,88,64),width=3)
        draw.line((x+2,y+cellh-2,x+cellw-2,y+cellh-2),fill=(126,87,61),width=3)
        for j in range(17):
            px=rng.randrange(max(x+6,left),min(x+cellw-5,W)) if min(x+cellw-5,W)>max(x+6,left) else x+7
            py=rng.randrange(max(y+6,top),min(y+cellh-5,H)) if min(y+cellh-5,H)>max(y+6,top) else y+7
            draw.rectangle((px,py,px+rng.choice([1,2,3]),py+1),fill=rng.choice([(165,112,73),(208,160,108),(219,173,123)]))
        if row%2==0 and col%2==0:
            cx=x+cellw//2;cy=y+cellh//2
            draw.rectangle((cx-3,cy-11,cx+3,cy+11),fill=(157,106,77))
            draw.rectangle((cx-11,cy-3,cx+11,cy+3),fill=(157,106,77))
            draw.rectangle((cx-3,cy-3,cx+3,cy+3),fill=(185,133,92))
# The seam is masked by a thin wood trim, as if the tiled patio is a separate terrace.
draw.rectangle((left,top-6,W-1,top+1),fill=(91,62,45))
draw.line((left,top-5,W,top-5),fill=(203,149,92),width=2)
base.save(ROOT/'public/assets/harbor-courtyard.webp',format='WEBP',quality=93,method=6)
print('Wrote 7 sheets and courtyard background')
