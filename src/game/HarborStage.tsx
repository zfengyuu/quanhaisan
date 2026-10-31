'use client';
import {useEffect,useRef} from 'react';
export type HarborTarget='fish'|'market'|'sell'|'upgrade';

type HarborProps={
 onTarget:(target:HarborTarget)=>void;
 onCustomerCount?:(count:number)=>void;
 servedSignal?:number;
 upgrades?:number;
};
/** A layered courtyard: architecture is an image, but tables, guests and FX are real game objects. */
export default function HarborStage({onTarget,onCustomerCount,servedSignal=0,upgrades=0}:HarborProps){
 const holder=useRef<HTMLDivElement>(null),targetRef=useRef(onTarget),countRef=useRef(onCustomerCount);
 const gameRef=useRef<import('phaser').Game|undefined>(undefined),previousServed=useRef(servedSignal);
 useEffect(()=>{targetRef.current=onTarget;countRef.current=onCustomerCount},[onTarget,onCustomerCount]);
 useEffect(()=>{if(servedSignal>previousServed.current)gameRef.current?.events.emit('qhs:serve');previousServed.current=servedSignal},[servedSignal]);
 useEffect(()=>{gameRef.current?.events.emit('qhs:seats',upgrades)},[upgrades]);
 useEffect(()=>{
  let disposed=false;let instance:import('phaser').Game|undefined;
  void import('phaser').then(({default:Phaser})=>{
   if(disposed||!holder.current)return;
   type Guest={sprite:Phaser.GameObjects.Sprite;bubble:Phaser.GameObjects.Text;seat:number;state:'walking'|'waiting'|'leaving';timeout?:Phaser.Time.TimerEvent;idle?:Phaser.Tweens.Tween};
   type Seat={x:number;y:number;table?:Phaser.GameObjects.Image;chairs?:Phaser.GameObjects.Image[];locked?:Phaser.GameObjects.Container};
   const guests=['khach-nam','khach-nu'];
   const named=['ngu-choi','chu-tam','co-sau','dau-bep','phuc-vu'];
   const keys=[...guests,...named];
   const seatSpots:Seat[]=[{x:498,y:825},{x:766,y:825},{x:481,y:985},{x:762,y:985},{x:624,y:911}];
   const initialUpgrades=upgrades;
   class Harbor extends Phaser.Scene{
    private customers:Guest[]=[];
    private numberOfTables=Math.min(seatSpots.length,2+initialUpgrades);
    private onServed=()=>this.serveCustomer();
    private onSeats=(n:number)=>this.setSeatCount(Math.min(seatSpots.length,2+n));
    constructor(){super('HarborCourtyard')}
    preload(){
     this.load.image('courtyard','/assets/harbor-courtyard.webp?v=4');
     for(const id of keys)this.load.spritesheet(id,`/assets/pixel/characters/${id}.png?v=4`,{frameWidth:64,frameHeight:96});
     for(const id of ['ban-go','ghe-go','cay-canh','den-long'])this.load.image(id,`/assets/pixel/props/${id}.png`);
    }
    private report(){countRef.current?.(this.customers.filter(g=>g.state==='waiting').length)}
    private makeTable(i:number){
     const s=seatSpots[i];if(s.table)return;
     s.table=this.add.image(s.x,s.y,'ban-go').setDisplaySize(158,154).setDepth(s.y+3);
     const left=this.add.image(s.x-94,s.y+23,'ghe-go').setDisplaySize(69,79).setDepth(s.y+14);
     const right=this.add.image(s.x+94,s.y+23,'ghe-go').setDisplaySize(69,79).setDepth(s.y+14);
     s.chairs=[left,right];
     const light=this.add.ellipse(s.x,s.y+24,92,16,0x3f241d,.14).setDepth(s.y-35);light.setBlendMode(Phaser.BlendModes.MULTIPLY);
     if(s.locked){s.locked.destroy();s.locked=undefined}
    }
    private setSeatCount(n:number){
     this.numberOfTables=n;
     for(let i=0;i<n;i++)this.makeTable(i);
     for(let i=n;i<seatSpots.length;i++){
      const s=seatSpots[i];if(s.locked)continue;
      const dot=this.add.circle(0,0,31,0x2b1b36,.78).setStrokeStyle(4,0xffd06a);
      const plus=this.add.text(0,0,'+',{fontSize:'37px',fontStyle:'bold',fontFamily:'sans-serif',color:'#ffe6a5'}).setOrigin(.5);
      s.locked=this.add.container(s.x,s.y,[dot,plus]).setDepth(s.y+3).setSize(72,72).setInteractive({useHandCursor:true});
      s.locked.on('pointerdown',()=>targetRef.current('upgrade'));
      this.tweens.add({targets:s.locked,scale:1.08,duration:850,yoyo:true,repeat:-1});
     }
     this.report();
    }
    private removeGuest(g:Guest){
     g.idle?.stop();g.timeout?.remove(false);this.tweens.killTweensOf(g.sprite);
     this.tweens.killTweensOf(g.bubble);g.sprite.destroy();g.bubble.destroy();
     this.customers=this.customers.filter(c=>c!==g);this.report();
    }
    private exit(g:Guest,happy=false){
     if(g.state==='leaving')return;
     g.state='leaving';g.idle?.stop();g.timeout?.remove(false);
     this.tweens.killTweensOf(g.sprite);this.tweens.killTweensOf(g.bubble);
     g.bubble.setText(happy?'♥':'…').setVisible(true);
     g.sprite.play(`${g.sprite.texture.key}-right`,true);
     this.report();
     this.tweens.add({targets:g.sprite,x:960,y:938,duration:2300,ease:'Linear',onUpdate:()=>{
      g.sprite.setDepth(Math.floor(g.sprite.y)+28);
      g.bubble.setPosition(g.sprite.x,g.sprite.y-94);
     },onComplete:()=>this.removeGuest(g)});
    }
    private serveCustomer(){const g=this.customers.find(c=>c.state==='waiting');if(g)this.exit(g,true)}
    private arrive(){
     if(this.customers.length>=Math.min(5,this.numberOfTables+1))return;
     const available=Array.from({length:this.numberOfTables},(_,i)=>i).filter(i=>!this.customers.some(g=>g.seat===i && g.state!=='leaving'));
     if(!available.length)return;
     const seat=Phaser.Utils.Array.GetRandom(available);
     const target=seatSpots[seat];const key=Phaser.Utils.Array.GetRandom(guests);
     const sprite=this.add.sprite(951,957,key,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(957).setInteractive({useHandCursor:true});
     sprite.on('pointerdown',()=>targetRef.current('sell'));
     const bubble=this.add.text(951,840,'',{fontSize:'24px',fontFamily:'sans-serif',color:'#fff8e9',backgroundColor:'#5a304bcc',padding:{x:8,y:4}}).setOrigin(.5).setDepth(1400).setVisible(false);
     const g:Guest={sprite,bubble,state:'walking',seat};this.customers.push(g);
     sprite.play(`${key}-left`,true);
     const mid={x:Math.min(900,target.x+126),y:925};
     const move=(x:number,y:number,time:number,done:()=>void)=>{
      if(!sprite.active)return;
      if(x>sprite.x)sprite.play(`${key}-right`,true);
      else sprite.play(`${key}-left`,true);
      this.tweens.add({targets:sprite,x,y,duration:time,ease:'Linear',onUpdate:()=>{
       sprite.setDepth(Math.floor(sprite.y)+22);bubble.setPosition(sprite.x,sprite.y-98);
      },onComplete:done});
     };
     move(mid.x,mid.y,1200,()=>move(target.x+(seat%2?60:-62),target.y+55,1600,()=>{
      if(!sprite.active)return;
      g.state='waiting';
      sprite.play(`${key}-idle`,true);
      bubble.setPosition(sprite.x,sprite.y-103).setText('🐟').setVisible(true);
      this.report();
      // Gentle breathing / chatting instead of a frozen character.
      g.idle=this.tweens.add({targets:sprite,y:sprite.y-3,duration:1250+Math.random()*550,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      g.timeout=this.time.delayedCall(19500+Math.random()*9000,()=>this.exit(g));
     }));
    }
    private resident(id:string,x:number,y:number,text:string,action:HarborTarget){
     const sp=this.add.sprite(x,y,id,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(y+25).setInteractive({useHandCursor:true});
     const tag=this.add.text(x,y-128,text,{fontSize:'15px',fontFamily:'sans-serif',backgroundColor:'#382642c9',color:'#ffeeb8',padding:{x:6,y:4}}).setOrigin(.5).setDepth(1450);
     sp.on('pointerdown',()=>targetRef.current(action));
     sp.play(`${id}-idle`,true);
     this.tweens.add({targets:sp,y:y-3,duration:1550+Math.random()*700,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
     return {sp,tag};
    }
    create(){
     this.add.image(0,0,'courtyard').setOrigin(0).setDisplaySize(941,1088);
     for(const id of keys){
      this.anims.create({key:`${id}-down`,frames:this.anims.generateFrameNumbers(id,{start:0,end:3}),frameRate:6,repeat:-1});
      this.anims.create({key:`${id}-left`,frames:this.anims.generateFrameNumbers(id,{start:4,end:7}),frameRate:7,repeat:-1});
      this.anims.create({key:`${id}-right`,frames:this.anims.generateFrameNumbers(id,{start:8,end:11}),frameRate:7,repeat:-1});
      this.anims.create({key:`${id}-idle`,frames:[{key:id,frame:0},{key:id,frame:1},{key:id,frame:0},{key:id,frame:3}],frameRate:1.5,repeat:-1});
     }
     // Touchable zones on the architectural artwork, not on baked customers.
     for(const [x,y,w,h,target,label] of ([
      [0,60,318,350,'fish','🎣'],[0,430,285,450,'market','🧺'],[390,425,480,245,'sell','🪙']
     ] as const)){
      this.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true}).on('pointerdown',()=>targetRef.current(target));
      const spot=this.add.circle(x+w-40,y+45,21,0x241536,.84).setStrokeStyle(3,0xffd477).setDepth(1600);
      const icon=this.add.text(x+w-56,y+28,label,{fontSize:'27px'}).setDepth(1601);
      this.tweens.add({targets:[spot,icon],y:'-=5',duration:1300,yoyo:true,repeat:-1});
     }
     this.setSeatCount(this.numberOfTables);
     for(const [x,y,scale] of [[363,745,.68],[908,775,.80],[351,1002,.68],[907,1014,.74]] as const){
      const plant=this.add.image(x,y,'cay-canh').setDisplaySize(120*scale,125*scale).setDepth(y+10);
      this.tweens.add({targets:plant,angle:{from:-1.5,to:1.5},duration:3300+x,yoyo:true,repeat:-1});
     }
     this.resident('ngu-choi',589,1018,'Bạn','sell');
     this.resident('phuc-vu',609,780,'Mai','sell');
     // Chú Tám / Cô Sáu remain on the pier/market side of the scene.
     this.resident('chu-tam',280,404,'Chú Tám','fish');
     this.resident('co-sau',283,694,'Cô Sáu','market');
     // Warm light and sea sparkle make the environment feel alive.
     for(let i=0;i<7;i++){
      const x=Phaser.Math.Between(45,302),y=Phaser.Math.Between(57,392);
      const sparkle=this.add.circle(x,y,Phaser.Math.Between(1,3),0xe8f4f2,.18).setDepth(100);
      this.tweens.add({targets:sparkle,alpha:{from:.1,to:.75},scale:{from:.5,to:1.9},duration:1500+i*320,yoyo:true,repeat:-1});
     }
     this.game.events.on('qhs:serve',this.onServed);
     this.game.events.on('qhs:seats',this.onSeats);
     this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.game.events.off('qhs:serve',this.onServed);this.game.events.off('qhs:seats',this.onSeats);countRef.current?.(0);
     });
     this.time.delayedCall(800,()=>this.arrive());this.time.delayedCall(2600,()=>this.arrive());
     this.time.addEvent({delay:4500,loop:true,callback:()=>this.arrive()});
    }
   }
   instance=new Phaser.Game({type:Phaser.CANVAS,parent:holder.current!,width:941,height:1088,
    backgroundColor:'#185269',pixelArt:true,roundPixels:true,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Harbor,
    render:{antialias:false}});
   gameRef.current=instance;
  }).catch(e=>console.error('Không tải được cảnh Quán Hải Sản:',e));
  return()=>{disposed=true;instance?.destroy(true);gameRef.current=undefined};
 },[]); // intentionally one game instance; gameplay changes delivered via game events
 return <div className="harbor-stage" role="region" aria-label="Sân quán mở rộng với bàn ghế động và khách hàng chuyển động"><div className="harbor-fallback"/><div className="phaser-host" ref={holder}/></div>;
}
