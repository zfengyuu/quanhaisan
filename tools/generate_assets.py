"""Generate original, deterministic, tile-safe pixel graphics for Quán Hải Sản.
No third-party sprites or reference-game files are used.
Run: python3 tools/generate_assets.py (requires Pillow).
"""
from PIL import Image, ImageDraw
from pathlib import Path
import math, random, json
random.seed(19)
ROOT = Path(__file__).resolve().parent.parent / 'public/assets/pixel'
SEA = ROOT / 'seafood'; CHAR=ROOT/'characters'; PROP=ROOT/'props'; STORY=ROOT/'story'
for folder in (SEA,CHAR,PROP,STORY): folder.mkdir(parents=True,exist_ok=True)
OUTLINE='#372a45'; LIGHT='#fff2d3'; WHITE='#fff9e8'

def im(size):return Image.new('RGBA',size,(0,0,0,0))
def poly(d,pts,fill,outline=OUTLINE,width=2): d.polygon(pts,fill=fill);d.line(pts+[pts[0]],fill=outline,width=width,joint='curve')
def ellipse(d,rect,fill,outline=OUTLINE,width=2):d.ellipse(rect,fill=fill,outline=outline,width=width)
def rect(d,box,fill,outline=None,width=1):d.rectangle(box,fill=fill,outline=outline,width=width)
def save(img,path,scale=3):img.resize((img.width*scale,img.height*scale),Image.Resampling.NEAREST).save(path,optimize=True)

def fish(kind):
    I=im((48,48));d=ImageDraw.Draw(I)
    if kind in ('ca-thu','ca-ngu'):
        big=kind=='ca-ngu';x0,x1=(6,39) if big else (5,40)
        poly(d,[(38,23),(46,15),(46,33)],'#386f9a' if big else '#569fbd')
        poly(d,[(5,22),(15,13),(30,14),(39,23),(30,31),(15,31)],'#6389b5' if big else '#82bbc5')
        poly(d,[(14,15),(23,6),(28,16)],'#4b709d');poly(d,[(20,31),(28,39),(31,30)],'#467ca0')
        poly(d,[(9,24),(22,27),(34,23),(29,30),(15,30)],'#b4d9d6',width=1)
        for x in (14,21,28):d.line([(x,16),(x+2,23)],fill='#e4e9d4',width=1)
        ellipse(d,(9,18,12,21),'#1c293b','#1c293b',1);d.line([(7,25),(11,26)],fill='#ad5963',width=1)
        if big:poly(d,[(19,16),(26,7),(31,17)],'#41649b',width=1)
    elif kind=='tom':
        poly(d,[(8,30),(13,23),(19,17),(27,15),(36,18),(40,23),(34,29),(27,31),(20,30),(16,36),(10,37)],'#f18670')
        for x,y in [(19,22),(25,18),(31,18)]:d.line((x,y,x+2,y+11),fill='#ffd7b2',width=2)
        d.line((35,19,43,11),fill='#d2625b',width=1);d.line((35,19,45,18),fill='#d2625b',width=1)
        for i in range(3):d.line((18+i*6,30,14+i*6,38),fill='#d45c61',width=1)
        ellipse(d,(35,21,37,23),'#291d34','#291d34',1)
    elif kind=='muc':
        poly(d,[(23,6),(13,20),(16,30),(32,30),(35,20)],'#e6b9ce')
        poly(d,[(23,8),(18,20),(20,28),(29,28),(31,20)],'#f6dbdd',width=1)
        for x in (17,21,25,29,33):
            d.line((x,29,x+(x-25)//4,40),fill='#bb7e9f',width=3);d.ellipse((x-2,38,x+2,42),fill='#efcbd8')
        ellipse(d,(19,24,21,26),'#3b3354','#3b3354',1);ellipse(d,(27,24,29,26),'#3b3354','#3b3354',1)
    elif kind=='so':
        for x,y,off in [(5,16,'#d9a57c'),(18,15,'#f0c99c'),(13,22,'#dcb18a')]:
            poly(d,[(x,y+8),(x+9,y-5),(x+21,y+7),(x+17,y+20),(x+3,y+19)],off)
            for j in range(3): d.line((x+10,y-1,x+4+j*5,y+17),fill='#ad7d65',width=1)
    elif kind=='cua':
        poly(d,[(8,25),(17,16),(31,16),(40,25),(35,34),(14,34)],'#d86452')
        poly(d,[(8,22),(3,13),(12,7),(19,15),(15,21)],'#e98057')
        poly(d,[(40,22),(45,13),(36,7),(29,15),(33,21)],'#e98057')
        for y in (28,33): d.line([(8,y),(3,y+5)],fill='#d26755',width=3);d.line([(40,y),(45,y+5)],fill='#d26755',width=3)
        ellipse(d,(19,20,22,23),'#22283b','#22283b',1);ellipse(d,(27,20,30,23),'#22283b','#22283b',1)
        d.arc((14,20,34,32),15,165,fill='#ffe1bd',width=1)
    elif kind=='hau':
        poly(d,[(6,30),(9,17),(20,12),(30,16),(38,26),(35,38),(24,41),(12,39)],'#8e9c96')
        poly(d,[(10,29),(14,19),(22,16),(31,21),(34,29),(30,35),(21,37),(14,34)],'#efdeb0')
        ellipse(d,(16,23,28,31),'#dec3a3',width=1)
        for i in range(3):d.arc((9+i*2,16+i*3,38-i*2,39-i*2),20,135,fill='#9e8f91',width=1)
    return I
fish_ids=['ca-thu','ca-ngu','tom','muc','so','cua','hau']
for f in fish_ids:save(fish(f),SEA/(f+'.png'))

def draw_person(d,ox,oy,variant,direction,step):
    # 32x48 indexed pixel character; 4-frame walk cycle, distinct outfits and headwear
    shirts=['#287b82','#d36f61','#77a05a','#8876c2','#d2a05c','#558fc4']
    hats=['#c99b4c','#c84f64',None,None,'#c79a66',None]
    hair=['#48313d','#342c45','#673f2c','#282e48','#664e37','#292437']
    skin=['#eeb58b','#f4c19a','#d79b6a','#f5c8a4','#e2a781','#f0b28f']
    top=shirts[variant%6];hat=hats[variant%6];hr=hair[variant%6];sk=skin[variant%6]
    x=ox+6;y=oy+4
    # shadow
    d.ellipse((ox+8,oy+42,ox+25,oy+46),fill=(30,23,37,75))
    # legs and walking feet
    t=(step%4-1.5)*1.5
    rect(d,(x+3,oy+33,x+9,oy+42+(2 if step%2 else 0)),'#37445a')
    rect(d,(x+13,oy+33,x+19,oy+42+(2 if step%2==0 else 0)),'#37445a')
    rect(d,(x+2,oy+41,x+10,oy+43),'#42313a')
    rect(d,(x+13,oy+41,x+22,oy+43),'#42313a')
    # arms animate
    off=(1 if step%2 else -1)*2
    rect(d,(x-1,oy+23+off,x+4,oy+31+off),sk)
    rect(d,(x+19,oy+23-off,x+24,oy+31-off),sk)
    rect(d,(x+2,oy+20,x+21,oy+35),OUTLINE)
    rect(d,(x+4,oy+22,x+19,oy+33),top)
    rect(d,(x+10,oy+27,x+15,oy+33),'#f7e1b4' if variant in (0,1,5) else '#c5b3a5')
    # round hair head
    rect(d,(x+1,oy+6,x+23,oy+21),hr)
    rect(d,(x+4,oy+9,x+20,oy+24),sk)
    if direction==0: # front
        rect(d,(x+6,oy+16,x+8,oy+18),'#241f36'); rect(d,(x+16,oy+16,x+18,oy+18),'#241f36')
        d.line((x+10,oy+21,x+14,oy+21),fill='#ae5757',width=1)
    elif direction==3: # back hair
        rect(d,(x+4,oy+9,x+20,oy+23),hr)
    elif direction==1: # left
        rect(d,(x+6,oy+16,x+8,oy+18),'#251d30'); rect(d,(x+4,oy+19,x+8,oy+19),'#ba7c72')
    else:
        rect(d,(x+16,oy+16,x+18,oy+18),'#251d30');rect(d,(x+17,oy+19,x+21,oy+19),'#ba7c72')
    d.line((x+3,oy+9,x+20,oy+9),fill=hr,width=4)
    if hat:
        rect(d,(x,oy+4,x+24,oy+9),hat)
        rect(d,(x+5,oy+1,x+20,oy+7),hat)
        d.line((x+6,oy+8,x+19,oy+8),fill='#fbe2a6',width=1)

def make_person(v):
    I=im((4*32,4*48));d=ImageDraw.Draw(I)
    for row in range(4):
        for col in range(4):draw_person(d,col*32,row*48,v,row,col)
    return I
for k,n in enumerate(['ngu-dan','co-sau','khach-xanh','khach-tim','khach-vang','nhan-vien']):save(make_person(k),CHAR/(n+'.png'),scale=2)

# furniture props / interactive world icons

def make_prop(name):
    I=im((64,64));d=ImageDraw.Draw(I)
    if name in ('ban-go','ghe-go'):
        if name=='ban-go':
            poly(d,[(8,21),(35,8),(58,22),(31,37)],'#ad6844')
            poly(d,[(8,21),(31,37),(31,43),(8,27)],'#754b3b',width=1)
            poly(d,[(31,37),(58,22),(58,29),(31,43)],'#82543f',width=1)
            for x,y in ((11,29),(44,32),(29,39)): rect(d,(x,y,x+4,56),'#6a4439')
            d.line([(18,23),(37,13),(48,22)],fill='#e5ad74',width=2)
        else:
            poly(d,[(18,25),(35,17),(48,25),(31,34)],'#bf8053')
            for x in (18,43):rect(d,(x,32,x+4,50),'#704739')
            rect(d,(13,8,19,31),'#9e6646');rect(d,(13,8,37,13),'#c78b60')
    elif name=='thung-ca':
        poly(d,[(7,20),(27,12),(56,20),(36,29)],'#d9ad71')
        poly(d,[(7,20),(36,29),(36,53),(7,43)],'#9a603e')
        poly(d,[(36,29),(56,20),(56,43),(36,53)],'#b57a4b')
        for y in (31,41):d.line((10,y,34,y+8),fill='#e9b778',width=2)
        poly(d,[(15,21),(24,15),(39,20),(30,27)],'#6db8cb',width=1)
    elif name=='tu-hai-san':
        rect(d,(7,15,58,50),'#425969',outline=OUTLINE,width=3)
        rect(d,(11,19,54,43),'#92d0d3',outline='#f5ede0',width=2)
        for x in (24,39):d.line((x,19,x,44),fill='#4c808b',width=2)
        for x,y in ((12,23),(31,25),(40,33)):
            d.ellipse((x,y,x+13,y+6),fill='#5d9fb6',outline='#396579');d.polygon([(x+12,y+3),(x+17,y-1),(x+17,y+7)],fill='#5d9fb6')
        rect(d,(7,49,58,54),'#c58c5c');rect(d,(12,54,15,60),'#5b4750');rect(d,(50,54,53,60),'#5b4750')
    elif name=='bep':
        poly(d,[(7,25),(29,15),(57,25),(35,36)],'#9ba8ab')
        poly(d,[(7,25),(35,36),(35,52),(7,42)],'#6c707c')
        poly(d,[(35,36),(57,25),(57,42),(35,52)],'#7d8791')
        d.ellipse((20,21,43,34),fill='#252634',outline='#e1c4a1',width=2)
        d.ellipse((24,23,40,31),outline='#384052',width=2)
        rect(d,(17,37,21,41),'#e9a65d')
    elif name=='can-cau':
        d.arc((15,4,56,55),185,302,fill='#ad713e',width=3)
        d.line((18,46,42,8),fill='#9d744e',width=4)
        d.line((42,8,51,26),fill='#d8d5be',width=1)
        d.ellipse((46,25,55,33),fill='#d9e4ee',outline='#566c82')
        d.ellipse((5,39,22,56),fill='#c39b59',outline=OUTLINE,width=2)
        d.ellipse((10,44,17,51),fill='#55425a')
    elif name=='den-long':
        d.line((32,0,32,10),fill='#4f3934',width=3)
        ellipse(d,(18,9,46,43),'#e6a348')
        rect(d,(21,15,43,38),'#f2d274')
        d.line((23,21,41,21),fill='#d66b47',width=2)
        for x in (26,34,41):d.line((x,11,x,42),fill='#c46a41',width=2)
        d.line((32,43,32,55),fill='#c46a41',width=2)
    elif name=='cay-canh':
        poly(d,[(19,37),(45,37),(41,58),(24,58)],'#bc7a54')
        for t in range(9):
            a=t*math.pi*2/9;xx=32+int(17*math.cos(a));yy=29+int(17*math.sin(a))
            poly(d,[(31,41),(xx-3,yy-7),(xx+6,yy)],'#3b955f',width=1)
        rect(d,(29,31,34,44),'#47764f')
    elif name=='thuyen':
        poly(d,[(4,37),(59,31),(51,52),(17,56)],'#a66c44')
        d.line((29,33,29,5),fill='#705039',width=3)
        poly(d,[(29,6),(30,32),(51,30)],'#ffecbb')
        d.line((8,41,52,35),fill='#e3b572',width=2)
    elif name=='ruong':
        rect(d,(9,25,55,51),'#aa744f',outline=OUTLINE,width=3)
        poly(d,[(8,25),(21,13),(47,13),(56,25)],'#d59e65')
        rect(d,(27,26,37,40),'#f5d17c',outline='#835d40',width=2)
        d.line((13,34,51,34),fill='#774b3e',width=2)
    return I
for p in ['ban-go','ghe-go','thung-ca','tu-hai-san','bep','can-cau','den-long','cay-canh','thuyen','ruong']:
    save(make_prop(p),PROP/(p+'.png'),scale=2)

# Storybook scenes: original artwork through pixel geometry, not lifted from reference game.

def story_scene(k):
    I=Image.new('RGBA',(320,176),'#b8d8ca');d=ImageDraw.Draw(I)
    for y in range(0,94):
        c=(int(155+y*.2),int(204+y*.07),int(210-y*.25),255)
        d.line((0,y,319,y),fill=c)
    d.ellipse((235-k*15,19,277-k*15,61),fill='#f9df99')
    poly(d,[(0,93),(28,65),(51,88),(93,51),(126,89),(185,64),(223,91),(268,73),(319,91)],'#668b83',width=1)
    rect(d,(0,95,319,176),'#2f92a2')
    for t in range(20):
        x=(t*61+k*17)%320;y=110+(t*31)%63
        d.line((x,y,x+random.randint(7,20),y),fill='#a4dad2',width=2)
    poly(d,[(0,121),(110,94),(139,100),(64,135)],'#9e7958',width=1)
    for x in (21,72,112):rect(d,(x,113,x+5,157),'#684b43')
    # fishing boat + shop
    poly(d,[(167,107),(273,105),(253,130),(191,130)],'#805843',width=2)
    d.line((225,106,225,64),fill='#5e433f',width=3)
    poly(d,[(225,67),(223,104),(263,104)],'#f7e9c7',width=1)
    poly(d,[(14,89),(48,65),(97,89)],'#9a4e3e')
    rect(d,(17,90,96,115),'#e5b982');rect(d,(50,97,69,114),'#644945')
    if k in (0,2,4):draw_person(d,84,83,0,0,1)
    if k in (1,3):draw_person(d,130,77,1,0,2)
    return I
for k in range(5):save(story_scene(k),STORY/(f'chapter-{k+1}.png'),scale=2)

# individual original pixel story portraits via sheets (first frames)
for name in ['ngu-dan','co-sau']:
    img=Image.open(CHAR/(name+'.png'))
    img.crop((0,0,64,96)).save(STORY/(f'portrait-{name}.png'))

# lightweight catalog
entries={'seafood':[f'assets/pixel/seafood/{f}.png' for f in fish_ids], 'characters':[f'assets/pixel/characters/{f}.png' for f in ['ngu-dan','co-sau','khach-xanh','khach-tim','khach-vang','nhan-vien']], 'props':[f'assets/pixel/props/{f}.png' for f in ['ban-go','ghe-go','thung-ca','tu-hai-san','bep','can-cau','den-long','cay-canh','thuyen','ruong']], 'story':[f'assets/pixel/story/chapter-{i}.png' for i in range(1,6)]}
(ROOT/'catalog.json').write_text(json.dumps(entries,indent=2,ensure_ascii=False))
print('Generated',sum(map(len,entries.values())),'individually usable graphics, plus portraits')
