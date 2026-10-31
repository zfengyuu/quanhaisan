'use client';
import { useEffect, useRef } from 'react';
export type HarborTarget = 'fish' | 'market' | 'sell';
export default function HarborStage({onTarget}:{onTarget:(target:HarborTarget)=>void}) {
  const holder=useRef<HTMLDivElement>(null);
  const callback=useRef(onTarget);
  useEffect(()=>{callback.current=onTarget},[onTarget]);
  useEffect(()=>{
    let destroyed=false;
    let game:import('phaser').Game|undefined;
    void import('phaser').then(({default:Phaser})=>{
      if(destroyed || !holder.current)return;
      class Harbor extends Phaser.Scene {
        constructor(){super('Harbor')}
        preload(){this.load.image('map','/assets/harbor-map.webp')}
        create(){
          this.add.image(0,0,'map').setOrigin(0,0).setDisplaySize(941,1088);
          const hotspots:[number,number,number,number,HarborTarget,string][] = [
            [0,70,345,410,'fish','🎣'],[0,420,315,470,'market','🧺'],[348,440,585,580,'sell','🪙'],
          ];
          for(const [x,y,w,h,target,label] of hotspots){
            const z=this.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true});
            z.on('pointerdown',()=>callback.current(target));
            const dot=this.add.circle(x+w-38,y+42,22,0x281642,.89).setStrokeStyle(3,0xffd36d);
            const sym=this.add.text(x+w-53,y+26,label,{fontSize:'29px'});
            this.tweens.add({targets:[dot,sym],y:'-=7',duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          }
          for(let i=0;i<7;i++){
            const bubble=this.add.circle(20+(i*43)%260,155+(i*57)%225,2+i%3,0xbdf7ff,.5);
            this.tweens.add({targets:bubble,y:'-=60',alpha:0,duration:2400+i*300,repeat:-1,delay:i*250});
          }
        }
      }
      game=new Phaser.Game({type:Phaser.AUTO,parent:holder.current!,width:941,height:1088,backgroundColor:'#184a5f',pixelArt:true,roundPixels:true,
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Harbor],render:{antialias:false}});
    }).catch(err=>console.error('Cannot start game scene',err));
    return ()=>{destroyed=true;game?.destroy(true)};
  },[]);
  return <div className="harbor-stage" aria-label="Bến cảng và quán hải sản tương tác" role="region"><div className="harbor-fallback"/><div className="phaser-host" ref={holder}/></div>;
}
