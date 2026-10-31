'use client';
import { useEffect, useRef } from 'react';
export type HarborTarget = 'fish' | 'market' | 'sell';
/** Animated NPCs are Phaser sprites rendered over the painted harbor backdrop.
 * They are ambient customers. Stock / coin transactions remain server-authoritative. */
export default function HarborStage({onTarget,onCustomerCount,servedSignal=0}:{onTarget:(target:HarborTarget)=>void;onCustomerCount?:(count:number)=>void;servedSignal?:number}) {
  const holder=useRef<HTMLDivElement>(null);
  const callback=useRef(onTarget);
  const customerCallback=useRef(onCustomerCount);
  const gameRef=useRef<import('phaser').Game|undefined>(undefined);
  const initialServed=useRef(servedSignal);
  useEffect(()=>{callback.current=onTarget;customerCallback.current=onCustomerCount},[onTarget,onCustomerCount]);
  useEffect(()=>{
    if(servedSignal>initialServed.current)gameRef.current?.events.emit('qhs:serve');
    initialServed.current=servedSignal;
  },[servedSignal]);
  useEffect(()=>{
    let destroyed=false;
    let game:import('phaser').Game|undefined;
    void import('phaser').then(({default:Phaser})=>{
      if(destroyed||!holder.current)return;
      type Customer={actor:Phaser.GameObjects.Container;bubble:Phaser.GameObjects.Text;state:'walking'|'waiting'|'leaving';timeout?:Phaser.Time.TimerEvent};
      class Harbor extends Phaser.Scene {
        private customers:Customer[]=[];
        private capacity=3;
        private serving=()=>{this.serveWaiting()};
        constructor(){super('Harbor')}
        preload(){this.load.image('map','/assets/harbor-map.webp')}
        private publishCount(){customerCallback.current?.(this.customers.filter(c=>c.state==='waiting').length)}
        private makeTexture(id:number){
          const colors=['#cf525c','#449e9b','#e7a642','#715ba8','#497fbd'];
          const key=`chibi-${id}`;
          if(this.textures.exists(key))return key;
          const g=this.make.graphics({x:0,y:0});
          const fill=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color);g.fillRect(x,y,w,h)};
          // Bold pixel-art silhouette with blocky hair, apron, arms, shoes.
          fill(10,43,7,5,'#43303c');fill(24,43,7,5,'#43303c');
          fill(10,30,21,14,'#39334c');fill(14,33,13,12,'#f0daba');
          fill(7,23,27,13,colors[id%colors.length]);fill(3,24,6,12,'#e8a780');fill(34,24,6,12,'#e8a780');
          fill(7,5,27,21,'#34242b');fill(9,10,23,16,'#f3bb8c');
          fill(7,3,27,10,'#38272b');fill(5,7,7,18,'#38272b');fill(29,7,7,18,'#38272b');
          fill(14,17,3,3,'#322637');fill(25,17,3,3,'#322637');fill(18,23,6,2,'#9e5248');
          fill(6,28,28,3,'#3f3040');g.generateTexture(key,42,51);g.destroy();return key;
        }
        private leave(c:Customer,served=false){
          if(c.state==='leaving')return;
          c.state='leaving';c.timeout?.remove(false);
          c.bubble.setText(served?'💛':'💨').setVisible(true);
          this.publishCount();
          this.tweens.add({targets:c.actor,x:940,y:760,duration:2200,ease:'Sine.easeInOut',onComplete:()=>{c.actor.destroy();this.customers=this.customers.filter(x=>x!==c);this.publishCount()}});
        }
        private serveWaiting(){const c=this.customers.find(c=>c.state==='waiting');if(c)this.leave(c,true)}
        private spawn(){
          if(this.customers.length>=this.capacity)return;
          const index=Phaser.Math.Between(0,4);const texture=this.makeTexture(index);
          const shadow=this.add.ellipse(20,46,27,10,0x2d2024,.35);
          const sprite=this.add.sprite(20,23,texture).setOrigin(.5,.5);
          const bubble=this.add.text(20,-22,'🍽️',{fontSize:'19px',backgroundColor:'#fffaeb',color:'#432e2a',padding:{x:4,y:3}}).setOrigin(.5).setVisible(false);
          const actor=this.add.container(941,760,[shadow,sprite,bubble]).setSize(44,52).setDepth(770);
          actor.setInteractive(new Phaser.Geom.Rectangle(0,-6,44,56),Phaser.Geom.Rectangle.Contains);
          actor.on('pointerdown',()=>callback.current('sell'));
          this.tweens.add({targets:sprite,y:20,duration:160,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          const c:Customer={actor,bubble,state:'walking'};this.customers.push(c);
          const seats=[{x:390,y:816},{x:725,y:816},{x:485,y:981},{x:790,y:1001},{x:600,y:905}];
          const to=Phaser.Utils.Array.GetRandom(seats);
          this.tweens.add({targets:actor,x:to.x,y:to.y,duration:Phaser.Math.Between(2400,4500),ease:'Sine.easeInOut',onUpdate:()=>actor.setDepth(Math.round(actor.y)),onComplete:()=>{
            if(!actor.active)return;
            c.state='waiting';bubble.setVisible(true);this.publishCount();
            c.timeout=this.time.delayedCall(Phaser.Math.Between(14000,23000),()=>this.leave(c));
          }});
        }
        create(){
          this.add.image(0,0,'map').setOrigin(0,0).setDisplaySize(941,1088);
          const hotspots:[number,number,number,number,HarborTarget,string][]=[
            [0,70,345,410,'fish','🎣'],[0,420,315,470,'market','🧺'],[348,440,585,580,'sell','🪙'],
          ];
          for(const [x,y,w,h,target,label] of hotspots){
            const z=this.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true});
            z.on('pointerdown',()=>callback.current(target));
            const dot=this.add.circle(x+w-38,y+42,22,0x281642,.89).setStrokeStyle(3,0xffd36d).setDepth(10000);
            const sym=this.add.text(x+w-53,y+26,label,{fontSize:'29px'}).setDepth(10001);
            this.tweens.add({targets:[dot,sym],y:'-=7',duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          }
          for(let i=0;i<7;i++){
            const bubble=this.add.circle(20+(i*43)%260,155+(i*57)%225,2+i%3,0xbdf7ff,.5);
            this.tweens.add({targets:bubble,y:'-=60',alpha:0,duration:2400+i*300,repeat:-1,delay:i*250});
          }
          this.game.events.on('qhs:serve',this.serving);
          this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.game.events.off('qhs:serve',this.serving);customerCallback.current?.(0)});
          this.time.delayedCall(1200,()=>this.spawn());
          this.time.delayedCall(3300,()=>this.spawn());
          this.time.addEvent({delay:5900,loop:true,callback:()=>this.spawn()});
        }
      }
      game=new Phaser.Game({type:Phaser.AUTO,parent:holder.current!,width:941,height:1088,backgroundColor:'#184a5f',pixelArt:true,roundPixels:true,
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Harbor],render:{antialias:false}});
      gameRef.current=game;
    }).catch(err=>console.error('Cannot start game scene',err));
    return ()=>{destroyed=true;game?.destroy(true);gameRef.current=undefined};
  },[]);
  return <div className="harbor-stage" aria-label="Bến cảng, quán hải sản và khách hàng di chuyển" role="region"><div className="harbor-fallback"/><div className="phaser-host" ref={holder}/></div>;
}
