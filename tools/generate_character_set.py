"""Create seven ORIGINAL walkable sprite sheets for Quán Hải Sản.
Only Pillow required. Four rows: down/left/right/up, four 32x48 frames per row.
The character designs follow the approved visual brief, without copying reference-game artwork.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'public/assets/pixel'
out=root/'characters';out.mkdir(parents=True,exist_ok=True)
P={
 'ngu-choi':dict(hair='#392938',skin='#f0b88b',shirt='#f6dfbe',pants='#326992',hat='none',apron='none',other='bag'),
 'chu-tam':dict(hair='#929191',skin='#deb18c',shirt='#417684',pants='#725343',hat='straw',apron='none',other='beard'),
 'co-sau':dict(hair='#3e2b42',skin='#e8ad82',shirt='#a66365',pants='#6f444c',hat='scarf',apron='green',other='basket'),
 'dau-bep':dict(hair='#4c3435',skin='#f0b98f',shirt='#fcf0dc',pants='#44495b',hat='chef',apron='blue',other='none'),
 'phuc-vu':dict(hair='#4e2e35',skin='#f4bd92',shirt='#f9e1c8',pants='#564258',hat='red-bow',apron='red',other='none'),
 'khach-nam':dict(hair='#50362d',skin='#e0b58d',shirt='#3c8e70',pants='#b88d59',hat='glasses',apron='none',other='pack'),
 'khach-nu':dict(hair='#5b3045',skin='#efb69e',shirt='#d67b96',pants='#c46b8c',hat='none',apron='none',other='none'),
}
outline='#312539'
def paint(name,style):
 I=Image.new('RGBA',(128,192));d=ImageDraw.Draw(I)
 def box(x,y,x1,y1,color):d.rectangle((x,y,x1,y1),fill=color)
 for row in range(4):
  for col in range(4):
   x=col*32;y=row*48
   step=[0,2,0,-2][col]
   front=row==0; back=row==3
   # shadow / legs
   d.ellipse((x+8,y+44,x+26,y+47),fill=(38,31,38,62))
   box(x+11,y+32,x+15,y+41+max(step,0),style['pants']);box(x+20,y+32,x+24,y+41+max(-step,0),style['pants'])
   box(x+9,y+40+max(step,0),x+16,y+43+max(step,0),'#533c37')
   box(x+20,y+40+max(-step,0),x+27,y+43+max(-step,0),'#533c37')
   # backbag outline
   if style['other'] in ('bag','pack'):
    bx=x+(24 if row==1 else 4)
    box(bx,y+22,bx+5,y+32,'#926d3e' if style['other']=='bag' else '#8b704a')
   box(x+8,y+22,x+27,y+33,outline);box(x+9,y+23,x+26,y+32,style['shirt'])
   # arms
   box(x+6,y+24+step//2,x+9,y+31+step//2,style['skin'])
   box(x+26,y+24-step//2,x+29,y+31-step//2,style['skin'])
   if style['apron']!='none':
    clr={'red':'#bb4d4d','blue':'#4b658d','green':'#5a8a68'}[style['apron']]
    box(x+13,y+25,x+23,y+35,clr);box(x+17,y+25,x+19,y+32,'#f8e7c8')
   # face/head larger than body
   d.ellipse((x+8,y+8,x+27,y+26),fill=outline)
   d.ellipse((x+9,y+10,x+26,y+26),fill=style['skin'])
   if back:box(x+9,y+10,x+26,y+22,style['hair'])
   else:
    box(x+8,y+8,x+26,y+12,style['hair'])
    box(x+9,y+12,x+11,y+18,style['hair']);box(x+24,y+12,x+27,y+17,style['hair'])
    if front:
     box(x+13,y+18,x+14,y+19,'#292736');box(x+21,y+18,x+22,y+19,'#292736')
     box(x+16,y+23,x+20,y+23,'#aa645d')
    elif row==1:box(x+11,y+19,x+12,y+20,'#292736')
    else:box(x+23,y+19,x+24,y+20,'#292736')
   if style['other']=='beard' and not back:
    box(x+13,y+24,x+22,y+29,'#d9d6c8')
   # headwear
   if style['hat']=='straw':
    box(x+4,y+8,x+30,y+11,'#c38c43');box(x+8,y+2,x+26,y+9,'#e8ba70');box(x+9,y+8,x+26,y+9,'#86663f')
   if style['hat']=='scarf':
    box(x+7,y+6,x+27,y+12,'#8e4b7d');box(x+5,y+10,x+11,y+17,'#a65b8a')
    for a in [11,19,24]:box(x+a,y+8,x+a+1,y+9,'#f0b86f')
   if style['hat']=='chef':
    box(x+7,y+5,x+27,y+12,'#fff9e8');box(x+10,y+1,x+24,y+7,'#eee6df')
   if style['hat']=='red-bow':
    box(x+22,y+6,x+29,y+12,'#c75055');box(x+26,y+7,x+31,y+10,'#f07a62')
   if style['hat']=='glasses':
    box(x+10,y+8,x+16,y+10,'#384c53');box(x+19,y+8,x+26,y+10,'#384c53')
 # crisp multiply x2 to game's Phaser frameWidth 64, frameHeight 96
 I.resize((256,384),Image.Resampling.NEAREST).save(out/(name+'.png'),optimize=True)
 return {'id':name,'file':f'/assets/pixel/characters/{name}.png','frameWidth':64,'frameHeight':96,'directions':['down','left','right','up'],'framesPerDirection':4}
meta=[paint(name,v) for name,v in P.items()]
(root/'character-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Created',len(meta),'character sprite sheets')
