'use client';
import {useEffect,useRef} from 'react';
import {playCustomerBell,playServeSound} from '@/lib/audio';

export type HarborTarget='fish'|'market'|'sell'|'upgrade';

type HarborProps={
 onTarget:(target:HarborTarget)=>void;
 onCustomerCount?:(count:number)=>void;
 servedSignal?:number;
 upgrades?:number;
 isPaused?:boolean;
};

/** A layered courtyard: architecture is an image, but tables, guests and FX are real game objects. */
export default function HarborStage({onTarget,onCustomerCount,servedSignal=0,upgrades=0,isPaused=false}:HarborProps){
 const holder=useRef<HTMLDivElement>(null),targetRef=useRef(onTarget),countRef=useRef(onCustomerCount);
 const gameRef=useRef<import('phaser').Game|undefined>(undefined),previousServed=useRef(servedSignal);
 useEffect(()=>{targetRef.current=onTarget;countRef.current=onCustomerCount},[onTarget,onCustomerCount]);
 useEffect(()=>{
  if(servedSignal>previousServed.current){
   gameRef.current?.events.emit('qhs:serve');
  }
  previousServed.current=servedSignal;
 },[servedSignal]);
 useEffect(()=>{gameRef.current?.events.emit('qhs:seats',upgrades)},[upgrades]);
 useEffect(()=>{
  if(isPaused)gameRef.current?.events.emit('qhs:pause');
  else gameRef.current?.events.emit('qhs:resume');
 },[isPaused]);

 useEffect(()=>{
  let disposed=false;let instance:import('phaser').Game|undefined;
  void import('phaser').then(({default:Phaser})=>{
   if(disposed||!holder.current)return;
   type Guest={
    sprite:Phaser.GameObjects.Sprite;
    bubble:Phaser.GameObjects.Text;
    seat:number;
    side:'left'|'right';
    state:'walking'|'waiting'|'eating'|'leaving';
    dishSprite?:Phaser.GameObjects.Image;
    timeout?:Phaser.Time.TimerEvent;
    idle?:Phaser.Tweens.Tween;
    foodEmoji:string;
   };
   type Seat={x:number;y:number;table?:Phaser.GameObjects.Image;chairs?:Phaser.GameObjects.Image[];locked?:Phaser.GameObjects.Container};
   const guests=['khach-nam','khach-nu','khach-vang','khach-tim','khach-xanh'];
   const named=['ngu-choi','chu-tam','co-sau','dau-bep','phuc-vu'];
   const keys=[...guests,...named];
   const dishKeys=['dish-ca-thu','dish-tom','dish-muc','dish-cua','dish-so','dish-ca-ngu'];
   const seatSpots:Seat[]=[{x:498,y:825},{x:766,y:825},{x:481,y:985},{x:762,y:985},{x:624,y:911}];
   const initialUpgrades=upgrades;

   class Harbor extends Phaser.Scene{
    private customers:Guest[]=[];
    private numberOfTables=Math.min(seatSpots.length,2+initialUpgrades);
    private isScenePaused=false;
    private serveQueue:Guest[]=[];
    private mai!:Phaser.GameObjects.Sprite;
    private maiTag!:Phaser.GameObjects.Text;
    private maiTray!:Phaser.GameObjects.Container;
    private maiTrayDish!:Phaser.GameObjects.Image;
    private maiIdle?:Phaser.Tweens.Tween;
    private maiBusy=false;
    private maiHome={x:635,y:745};

    private onServed=()=>this.serveCustomer();
    private onSeats=(n:number)=>this.setSeatCount(Math.min(seatSpots.length,2+n));
    private onPause=()=>this.pauseGame();
    private onResume=()=>this.resumeGame();

    constructor(){super('HarborCourtyard')}

    preload(){
     this.load.image('courtyard','/assets/harbor-courtyard.webp?v=5');
     for(const id of keys)this.load.spritesheet(id,`/assets/pixel/characters/${id}.png?v=5`,{frameWidth:64,frameHeight:96});
     for(const id of ['ban-go','ghe-go','cay-canh','den-long'])this.load.image(id,`/assets/pixel/props/${id}.png`);
     for(const d of ['ca-thu','tom','muc','cua','so','ca-ngu'])this.load.image(`dish-${d}`,`/assets/pixel/seafood/${d}.png`);
    }

    private report(){
     countRef.current?.(this.customers.filter(g=>g.state==='waiting').length);
    }

    private pauseGame(){
     this.isScenePaused=true;
     this.tweens.pauseAll();
     this.time.paused=true;
    }

    private resumeGame(){
     this.isScenePaused=false;
     this.tweens.resumeAll();
     this.time.paused=false;
    }

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
     this.tweens.killTweensOf(g.bubble);
     if(g.dishSprite){g.dishSprite.destroy();g.dishSprite=undefined;}
     g.sprite.destroy();g.bubble.destroy();
     this.customers=this.customers.filter(c=>c!==g);
     this.report();
    }

    private exit(g:Guest,happy=false){
     if(g.state==='leaving')return;
     g.state='leaving';g.idle?.stop();g.timeout?.remove(false);
     this.tweens.killTweensOf(g.sprite);this.tweens.killTweensOf(g.bubble);
     g.bubble.setText(happy?'♥':'…').setVisible(true);
     if(g.dishSprite){
      this.tweens.add({targets:g.dishSprite,alpha:0,duration:500,onComplete:()=>g.dishSprite?.destroy()});
     }
     this.report();

     const exitX=960,exitY=938;
     const dur=1800+Math.random()*400;
     const key=g.sprite.texture.key;
     g.sprite.play(`${key}-right`,true);

     this.tweens.add({
      targets:g.sprite,x:exitX,y:exitY,duration:dur,ease:'Linear',
      onUpdate:()=>{
       g.sprite.setDepth(Math.floor(g.sprite.y)+28);
       g.bubble.setPosition(g.sprite.x,g.sprite.y-94);
      },
      onComplete:()=>this.removeGuest(g)
     });
    }

    private serveCustomer(){
     const g=this.customers.find(c=>c.state==='waiting');
     if(!g)return;
     g.state='eating'; // mark reserved so another serve event won't double target
     g.timeout?.remove(false);
     this.serveQueue.push(g);
     this.processServeQueue();
    }

    private processServeQueue(){
     if(this.maiBusy||this.serveQueue.length===0)return;
     const guest=this.serveQueue.shift()!;
     if(!guest.sprite.active||guest.state==='leaving'){
      this.processServeQueue();
      return;
     }

     this.maiBusy=true;
     this.maiIdle?.stop();
     const s=seatSpots[guest.seat];
     const kitchenX=680,kitchenY=705;

     // Step 1: Mai walks to kitchen counter to fetch food
     this.walkEntity(this.mai,this.maiTag,'phuc-vu',kitchenX,kitchenY,650,()=>{
      // Pick up steaming dish
      const chosenDish=Phaser.Utils.Array.GetRandom(dishKeys);
      this.maiTrayDish.setTexture(chosenDish);
      this.maiTray.setVisible(true);

      // Brief 250ms plating pause
      this.time.delayedCall(250,()=>{
       // Step 2: Mai walks from kitchen counter to customer's table
       const serveStandX=guest.side==='left'?s.x-10:s.x+10;
       const serveStandY=s.y-35;

       this.walkEntity(this.mai,this.maiTag,'phuc-vu',serveStandX,serveStandY,1200,()=>{
        // Step 3: Set dish on table with chime and fx
        this.maiTray.setVisible(false);
        const dish=this.add.image(s.x,s.y-10,chosenDish).setDisplaySize(44,44).setDepth(s.y+16);
        guest.dishSprite=dish;

        // Steam rising fx
        const steam=this.add.text(s.x,s.y-25,'♨️',{fontSize:'18px'}).setOrigin(.5).setDepth(s.y+20);
        this.tweens.add({targets:steam,y:steam.y-26,alpha:0,duration:1100,onComplete:()=>steam.destroy()});

        // Floating reward coins
        const coinFly=this.add.text(s.x,s.y-48,'+50🪙',{fontSize:'18px',fontStyle:'bold',color:'#ffe168',stroke:'#321908',strokeThickness:3}).setOrigin(.5).setDepth(1550);
        this.tweens.add({targets:coinFly,y:coinFly.y-32,alpha:0,duration:1300,ease:'Cubic.easeOut',onComplete:()=>coinFly.destroy()});

        playServeSound();

        // Mai cheerful bow
        this.mai.play('phuc-vu-idle',true);
        this.tweens.add({targets:this.mai,y:this.mai.y-4,duration:180,yoyo:true,repeat:1});

        // Customer eating state with happy bubble
        guest.bubble.setText('😋').setVisible(true);
        guest.idle?.stop();
        guest.idle=this.tweens.add({targets:guest.sprite,y:guest.sprite.y-3,duration:350,yoyo:true,repeat:5});

        // Step 4: Mai walks back to service post
        this.time.delayedCall(500,()=>{
         this.walkEntity(this.mai,this.maiTag,'phuc-vu',this.maiHome.x,this.maiHome.y,950,()=>{
          this.mai.play('phuc-vu-idle',true);
          this.maiBusy=false;
          this.maiIdle=this.tweens.add({targets:this.mai,y:this.maiHome.y-3,duration:1500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          // Check if more orders queued
          this.processServeQueue();
         });
        });

        // Step 5: Customer finishes eating, shows love and exits
        this.time.delayedCall(2500,()=>{
         if(guest.sprite.active){
          this.exit(guest,true);
         }
        });
       },()=>{
        // Tray position tracker while walking
        this.maiTray.setPosition(this.mai.x+(this.mai.anims.currentAnim?.key.includes('right')?18:-18),this.mai.y-48).setDepth(this.mai.depth+1);
       });
      });
     });
    }

    private walkEntity(
     sp:Phaser.GameObjects.Sprite,
     tag:Phaser.GameObjects.Text|undefined,
     key:string,
     toX:number,
     toY:number,
     time:number,
     done:()=>void,
     onTick?:()=>void
    ){
     const dx=toX-sp.x,dy=toY-sp.y;
     if(Math.abs(dx)>=Math.abs(dy)){
      if(dx>0)sp.play(`${key}-right`,true);
      else sp.play(`${key}-left`,true);
     }else{
      if(dy>0)sp.play(`${key}-down`,true);
      else sp.play(`${key}-up`,true);
     }
     this.tweens.add({
      targets:sp,x:toX,y:toY,duration:time,ease:'Linear',
      onUpdate:()=>{
       sp.setDepth(Math.floor(sp.y)+25);
       if(tag)tag.setPosition(sp.x,sp.y-128);
       onTick?.();
      },
      onComplete:done
     });
    }

    private arrive(){
     if(this.isScenePaused)return;
     if(this.customers.length>=Math.min(5,this.numberOfTables+1))return;
     const available=Array.from({length:this.numberOfTables},(_,i)=>i).filter(i=>!this.customers.some(g=>g.seat===i&&g.state!=='leaving'));
     if(!available.length)return;

     const seat=Phaser.Utils.Array.GetRandom(available);
     const target=seatSpots[seat];
     const key=Phaser.Utils.Array.GetRandom(guests);
     const side:Guest['side']=seat%2===0?'left':'right';
     const chairX=side==='left'?target.x-74:target.x+74;
     const chairY=target.y+18;

     const sprite=this.add.sprite(951,957,key,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(957).setInteractive({useHandCursor:true});
     sprite.on('pointerdown',()=>targetRef.current('sell'));

     const bubble=this.add.text(951,840,'',{
      fontSize:'24px',fontFamily:'sans-serif',color:'#fff8e9',backgroundColor:'#5a304bcc',
      padding:{x:8,y:4}
     }).setOrigin(.5).setDepth(1400).setVisible(false);

     const foods=['🐟','🦐','🦀','🍜','🦪'];
     const foodEmoji=Phaser.Utils.Array.GetRandom(foods);

     const g:Guest={sprite,bubble,state:'walking',seat,side,foodEmoji};
     this.customers.push(g);

     // Waypoint 1: enter along corridor
     const aisleX=Math.min(880,chairX+(chairX>600?40:110));
     const aisleY=938;

     this.walkEntity(sprite,undefined,key,aisleX,aisleY,1200,()=>{
      // Waypoint 2: walk towards chair
      this.walkEntity(sprite,undefined,key,chairX,chairY,1400,()=>{
       if(!sprite.active)return;
       g.state='waiting';
       // Sit down facing table: left chair faces right, right chair faces left
       if(side==='left')sprite.setFrame(8);
       else sprite.setFrame(4);

       bubble.setPosition(sprite.x,sprite.y-104).setText(foodEmoji).setVisible(true);
       playCustomerBell();
       this.report();

       // Idle customer breathing
       g.idle=this.tweens.add({targets:sprite,y:sprite.y-2.5,duration:1300+Math.random()*450,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
       g.timeout=this.time.delayedCall(36000+Math.random()*9000,()=>this.exit(g));
      });
     },()=>{
      bubble.setPosition(sprite.x,sprite.y-98);
     });
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
      this.anims.create({key:`${id}-up`,frames:this.anims.generateFrameNumbers(id,{start:12,end:15}),frameRate:6,repeat:-1});
      this.anims.create({key:`${id}-idle`,frames:[{key:id,frame:0}],frameRate:1,repeat:-1});
     }

     // Touchable zones on the architectural artwork
     for(const [x,y,w,h,target,label] of ([
      [0,60,318,350,'fish','🎣'],[0,430,285,450,'market','🧺'],[390,425,480,245,'sell','🪙']
     ] as const)){
      this.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true}).on('pointerdown',()=>targetRef.current(target));
      const spot=this.add.circle(x+w-40,y+45,21,0x241536,.84).setStrokeStyle(3,0xffd477).setDepth(1600);
      const icon=this.add.text(x+w-56,y+28,label,{fontSize:'27px'}).setDepth(1601);
      this.tweens.add({targets:[spot,icon],y:'-=5',duration:1300,yoyo:true,repeat:-1});
     }

     this.setSeatCount(this.numberOfTables);

     // Decor plants with gentle sea breeze swaying
     for(const [x,y,scale] of [[363,745,.68],[908,775,.80],[351,1002,.68],[907,1014,.74]] as const){
      const plant=this.add.image(x,y,'cay-canh').setDisplaySize(120*scale,125*scale).setDepth(y+10);
      this.tweens.add({targets:plant,angle:{from:-1.5,to:1.5},duration:3300+x,yoyo:true,repeat:-1});
     }

     // Permanent villagers
     this.resident('ngu-choi',589,1018,'Bạn','sell');
     this.resident('chu-tam',280,404,'Chú Tám','fish');
     this.resident('co-sau',283,694,'Cô Sáu','market');

     // Dedicated Waitress Mai (dynamic server)
     this.mai=this.add.sprite(this.maiHome.x,this.maiHome.y,'phuc-vu',0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(this.maiHome.y+25).setInteractive({useHandCursor:true});
     this.maiTag=this.add.text(this.maiHome.x,this.maiHome.y-128,'Mai · Phục vụ',{fontSize:'14px',fontFamily:'sans-serif',backgroundColor:'#382642c9',color:'#ffeeb8',padding:{x:6,y:4}}).setOrigin(.5).setDepth(1450);
     this.mai.on('pointerdown',()=>targetRef.current('sell'));
     this.mai.play('phuc-vu-idle',true);
     this.maiIdle=this.tweens.add({targets:this.mai,y:this.maiHome.y-3,duration:1550,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});

     // Mai's tray container holding food
     const trayBase=this.add.ellipse(0,0,46,18,0x54331d,0.95).setStrokeStyle(2,0xd4a558);
     this.maiTrayDish=this.add.image(0,-10,'dish-ca-thu').setDisplaySize(36,36);
     this.maiTray=this.add.container(this.maiHome.x,this.maiHome.y-48,[trayBase,this.maiTrayDish]).setDepth(1480).setVisible(false);

     // Water sparkles
     for(let i=0;i<7;i++){
      const x=Phaser.Math.Between(45,302),y=Phaser.Math.Between(57,392);
      const sparkle=this.add.circle(x,y,Phaser.Math.Between(1,3),0xe8f4f2,.18).setDepth(100);
      this.tweens.add({targets:sparkle,alpha:{from:.1,to:.75},scale:{from:.5,to:1.9},duration:1500+i*320,yoyo:true,repeat:-1});
     }

     this.game.events.on('qhs:serve',this.onServed);
     this.game.events.on('qhs:seats',this.onSeats);
     this.game.events.on('qhs:pause',this.onPause);
     this.game.events.on('qhs:resume',this.onResume);

     this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.game.events.off('qhs:serve',this.onServed);
      this.game.events.off('qhs:seats',this.onSeats);
      this.game.events.off('qhs:pause',this.onPause);
      this.game.events.off('qhs:resume',this.onResume);
      countRef.current?.(0);
     });

     this.time.delayedCall(800,()=>this.arrive());
     this.time.delayedCall(2600,()=>this.arrive());
     this.time.addEvent({delay:5200,loop:true,callback:()=>this.arrive()});
    }
   }

   instance=new Phaser.Game({
    type:Phaser.CANVAS,parent:holder.current!,width:941,height:1088,
    backgroundColor:'#185269',pixelArt:true,roundPixels:true,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Harbor,
    render:{antialias:false}
   });
   gameRef.current=instance;
  }).catch(e=>console.error('Không tải được cảnh Quán Hải Sản:',e));

  return()=>{disposed=true;instance?.destroy(true);gameRef.current=undefined};
 },[]);

 return <div className="harbor-stage" role="region" aria-label="Sân quán mở rộng với bàn ghế động và khách hàng chuyển động"><div className="harbor-fallback"/><div className="phaser-host" ref={holder}/></div>;
}
