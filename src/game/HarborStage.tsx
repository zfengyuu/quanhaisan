'use client';
import {useEffect,useRef} from 'react';
export type HarborTarget='fish'|'market'|'sell';
/** Separate, original 4-direction sprite sheets over the concept background. */
export default function HarborStage({onTarget,onCustomerCount,servedSignal=0}:{onTarget:(target:HarborTarget)=>void;onCustomerCount?:(count:number)=>void;servedSignal?:number}){
 const holder=useRef<HTMLDivElement>(null), targetRef=useRef(onTarget), countRef=useRef(onCustomerCount),
 gameRef=useRef<import('phaser').Game|undefined>(undefined),prev=useRef(servedSignal);
 useEffect(()=>{targetRef.current=onTarget;countRef.current=onCustomerCount},[onTarget,onCustomerCount]);
 useEffect(()=>{if(servedSignal>prev.current)gameRef.current?.events.emit('qhs:serve');prev.current=servedSignal},[servedSignal]);
 useEffect(()=>{
  let disposed=false;let instance:import('phaser').Game|undefined;
  void import('phaser').then(({default:Phaser})=>{
   if(disposed||!holder.current)return;
   type Guest={sprite:Phaser.GameObjects.Sprite; bubble:Phaser.GameObjects.Text;state:'entering'|'waiting'|'leaving'; timeout?:Phaser.Time.TimerEvent};
   const variants=['khach-nam','khach-nu','khach-xanh','khach-tim','khach-vang'];
   const namedCharacters=['ngu-choi','chu-tam','co-sau','dau-bep','phuc-vu'];
   class Harbor extends Phaser.Scene{
    private guests:Guest[]=[];private served=()=>this.serveWaiting();
    constructor(){super('Harbor')}
    preload(){
     this.load.image('map','/assets/harbor-map.webp');
     for(const v of [...variants,...namedCharacters])this.load.spritesheet(v,`/assets/pixel/characters/${v}.png`,{frameWidth:64,frameHeight:96});
     this.load.image('plant','/assets/pixel/props/cay-canh.png');
    }
    private publish(){countRef.current?.(this.guests.filter(c=>c.state==='waiting').length)}
    private leave(g:Guest,happy=false){
     if(g.state==='leaving')return;
     g.state='leaving';g.timeout?.remove(false);g.bubble.setText(happy?'♥':'…').setVisible(true);this.publish();
     const v=g.sprite.texture.key;g.sprite.play(`${v}-right`,true);
     this.tweens.add({targets:[g.sprite,g.bubble],x:973,duration:2400,ease:'Linear',onUpdate:()=>g.sprite.setDepth(Math.round(g.sprite.y)),onComplete:()=>{g.sprite.destroy();g.bubble.destroy();this.guests=this.guests.filter(c=>c!==g);this.publish()}});
    }
    private serveWaiting(){const g=this.guests.find(c=>c.state==='waiting');if(g)this.leave(g,true)}
    private spawn(){
     if(this.guests.length>=4)return;
     const v=Phaser.Utils.Array.GetRandom(variants);
     const sprite=this.add.sprite(969,850,v,4).setOrigin(.5,1).setDisplaySize(68,102).setDepth(850).setInteractive({useHandCursor:true});
     const bubble=this.add.text(969,748,'',{fontSize:'24px',backgroundColor:'#fffae7',color:'#4a3043',padding:{x:5,y:3}}).setOrigin(.5).setDepth(950).setVisible(false);
     sprite.on('pointerdown',()=>targetRef.current('sell'));
     const g:Guest={sprite,bubble,state:'entering'};this.guests.push(g);
     const spots=[{x:381,y:819},{x:693,y:822},{x:475,y:974},{x:779,y:996},{x:611,y:907}];
     const seat=Phaser.Utils.Array.GetRandom(spots);
     sprite.play(`${v}-left`,true);
     // Two legs of a route. Put customers in the courtyard, away from the seafood counter.
     const mid={x:Math.max(540,seat.x+115),y:seat.y-70};
     this.tweens.add({targets:sprite,x:mid.x,y:mid.y,duration:1600,ease:'Linear',onUpdate:()=>{sprite.setDepth(Math.round(sprite.y));bubble.setPosition(sprite.x,sprite.y-108)},onComplete:()=>{
      if(!sprite.active)return;
      this.tweens.add({targets:sprite,x:seat.x,y:seat.y,duration:1700,ease:'Linear',onUpdate:()=>{sprite.setDepth(Math.round(sprite.y));bubble.setPosition(sprite.x,sprite.y-108)},onComplete:()=>{
       if(!sprite.active)return;g.state='waiting';sprite.stop();sprite.setFrame(0);bubble.setPosition(sprite.x,sprite.y-108).setText('🐟').setVisible(true);this.publish();
       g.timeout=this.time.delayedCall(19000,()=>this.leave(g));
      }});
     }});
    }
    create(){
     this.add.image(0,0,'map').setOrigin(0).setDisplaySize(941,1088);
     for(const v of [...variants,...namedCharacters]){
      this.anims.create({key:`${v}-left`,frames:this.anims.generateFrameNumbers(v,{start:4,end:7}),frameRate:7,repeat:-1});
      this.anims.create({key:`${v}-right`,frames:this.anims.generateFrameNumbers(v,{start:8,end:11}),frameRate:7,repeat:-1});
     }
     const spots:[number,number,number,number,HarborTarget,string][]=[
      [0,60,318,375,'fish','🎣'],[0,438,312,485,'market','🧺'],[350,440,550,585,'sell','🪙']
     ];
     for(const [x,y,w,h,target,label] of spots){
      this.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true}).on('pointerdown',()=>targetRef.current(target));
      const dot=this.add.circle(x+w-35,y+40,23,0x241536,.9).setStrokeStyle(3,0xffd477).setDepth(10000);
      const icon=this.add.text(x+w-50,y+26,label,{fontSize:'29px'}).setDepth(10001);
      this.tweens.add({targets:[dot,icon],y:'-=6',duration:1150,yoyo:true,repeat:-1});
     }
     // Characters from the approved cast: fixed named residents and service staff.
     for(const [id,x,y,label] of ([['ngu-choi',390,765,'Bạn'],['chu-tam',90,525,'Chú Tám'],['co-sau',165,915,'Cô Sáu'],['dau-bep',458,1050,'Bếp Lành'],['phuc-vu',765,620,'Mai']] as const)){
      const person=this.add.sprite(x,y,id,0).setOrigin(.5,1).setDisplaySize(64,96).setDepth(y);
      person.setInteractive({useHandCursor:true});
      const tag=this.add.text(x,y-103,label,{fontSize:'15px',fontFamily:'sans-serif',backgroundColor:'#321e3ed9',padding:{x:7,y:3},color:'#ffebae'}).setOrigin(.5).setDepth(1400);
      person.on('pointerdown',()=>targetRef.current(id==='chu-tam'?'fish':id==='co-sau'?'market':'sell'));
     }
     this.game.events.on('qhs:serve',this.served);
     this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.game.events.off('qhs:serve',this.served);countRef.current?.(0)});
     this.time.delayedCall(1250,()=>this.spawn());this.time.delayedCall(3700,()=>this.spawn());
     this.time.addEvent({delay:6400,loop:true,callback:()=>this.spawn()});
    }
   }
   instance=new Phaser.Game({type:Phaser.AUTO,parent:holder.current!,width:941,height:1088,backgroundColor:'#185269',pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Harbor,render:{antialias:false}});
   gameRef.current=instance;
  }).catch(e=>console.error('Không tải được cảnh game:',e));
  return()=>{disposed=true;instance?.destroy(true);gameRef.current=undefined};
 },[]);
 return <div className="harbor-stage" role="region" aria-label="Quán hải sản có khách hàng tự di chuyển"><div className="harbor-fallback"/><div className="phaser-host" ref={holder}/></div>;
}
