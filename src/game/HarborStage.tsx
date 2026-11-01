'use client';
import {useEffect,useRef} from 'react';
import {playCustomerBell,playServeSound} from '@/lib/audio';

export type HarborTarget='fish'|'market'|'sell'|'upgrade';

type HarborProps={
 onTarget:(target:HarborTarget)=>void;
 onCustomerCount?:(count:number)=>void;
 onCustomerExitUnserved?:()=>void;
 servedSignal?:number;
 upgrades?:number;
 isPaused?:boolean;
 isShiftActive?:boolean;
};

/** A layered courtyard inspired by Vietnamese street food eateries: vibrant tables, 4 stools, dynamic waitstaff and guests. */
export default function HarborStage({
 onTarget,
 onCustomerCount,
 onCustomerExitUnserved,
 servedSignal=0,
 upgrades=0,
 isPaused=false,
 isShiftActive=true
}:HarborProps){
 const holder=useRef<HTMLDivElement>(null);
 const targetRef=useRef(onTarget);
 const countRef=useRef(onCustomerCount);
 const exitRef=useRef(onCustomerExitUnserved);
 const gameRef=useRef<import('phaser').Game|undefined>(undefined);
 const previousServed=useRef(servedSignal);

 useEffect(()=>{
  targetRef.current=onTarget;
  countRef.current=onCustomerCount;
  exitRef.current=onCustomerExitUnserved;
 },[onTarget,onCustomerCount,onCustomerExitUnserved]);

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
  if(isShiftActive)gameRef.current?.events.emit('qhs:start-shift');
  else gameRef.current?.events.emit('qhs:end-shift');
 },[isShiftActive]);

 useEffect(()=>{
  let disposed=false;let instance:import('phaser').Game|undefined;
  void import('phaser').then(({default:Phaser})=>{
   if(disposed||!holder.current)return;

   type Guest={
    sprite:Phaser.GameObjects.Sprite;
    orderBadge?:Phaser.GameObjects.Container;
    seat:number;
    side:'left'|'right';
    state:'walking'|'waiting'|'eating'|'leaving';
    dishSprite?:Phaser.GameObjects.Image;
    timeout?:Phaser.Time.TimerEvent;
    idle?:Phaser.Tweens.Tween;
    dishId:string;
    companion?:Guest;
   };

   type Seat={
    x:number;
    y:number;
    table?:Phaser.GameObjects.Image;
    chairs?:Phaser.GameObjects.Image[];
    locked?:Phaser.GameObjects.Container;
    shadow?:Phaser.GameObjects.Ellipse;
   };

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
    private isShiftRunning=isShiftActive??true;
    private onPause=()=>this.pauseGame();
    private onResume=()=>this.resumeGame();
    private onStartShift=()=>{
     this.isShiftRunning=true;
     this.arrive();
     this.time.delayedCall(1200,()=>this.arrive());
    };
    private onEndShift=()=>{
     this.isShiftRunning=false;
     for(const g of [...this.customers]){
      if(g.state==='waiting')this.exit(g,false);
     }
    };

    constructor(){super('HarborCourtyard')}

    preload(){
     this.load.image('courtyard','/assets/harbor-courtyard.webp?v=6');
     for(const id of keys)this.load.spritesheet(id,`/assets/pixel/characters/${id}.png?v=6`,{frameWidth:64,frameHeight:96});
     for(const id of ['ban-do','ghe-do','ban-go','ghe-go','cay-canh','den-long'])this.load.image(id,`/assets/pixel/props/${id}.png`);
     for(const d of ['ca-thu','tom','muc','cua','so','ca-ngu'])this.load.image(`dish-${d}`,`/assets/pixel/seafood/${d}.png`);
    }

    private report(){
     const waitingTables=new Set(this.customers.filter(g=>g.state==='waiting').map(g=>g.seat)).size;
     countRef.current?.(waitingTables);
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

    /** Creates a high-contrast Vietnamese street food table with 4 stools, matching ocdem.dreek.site */
    private makeTable(i:number){
     const s=seatSpots[i];if(s.table)return;

     const isWood=i>=2;
     const tableKey=isWood?'ban-go':'ban-do';
     const stoolKey=isWood?'ghe-go':'ghe-do';

     // 1. Soft grounded floor shadow underneath table & stools
     s.shadow=this.add.ellipse(s.x,s.y+24,172,56,0x120807,.35).setDepth(s.y-25);

     // 2. High-contrast table (red street plastic for table 1-2, warm teak for table 3-5)
     s.table=this.add.image(s.x,s.y,tableKey).setDisplaySize(146,142).setDepth(s.y+6).setInteractive({useHandCursor:true});
     s.table.on('pointerdown',()=>targetRef.current('sell'));

     // 3. 4 Stools around table: top, bottom, left, right (matching ocdem.dreek.site!)
     const topStool=this.add.image(s.x,s.y-46,stoolKey).setDisplaySize(52,52).setDepth(s.y-4);
     const bottomStool=this.add.image(s.x,s.y+42,stoolKey).setDisplaySize(58,58).setDepth(s.y+24);
     const leftStool=this.add.image(s.x-72,s.y+8,stoolKey).setDisplaySize(56,56).setDepth(s.y+12);
     const rightStool=this.add.image(s.x+72,s.y+8,stoolKey).setDisplaySize(56,56).setDepth(s.y+12);

     s.chairs=[topStool,bottomStool,leftStool,rightStool];

     if(s.locked){s.locked.destroy();s.locked=undefined;}
    }

    private setSeatCount(n:number){
     this.numberOfTables=n;
     for(let i=0;i<n;i++)this.makeTable(i);
     for(let i=n;i<seatSpots.length;i++){
      const s=seatSpots[i];if(s.locked)continue;
      // Clean, elegant table reservation placard instead of messy circular overlays
      const shadow=this.add.ellipse(0,18,124,38,0x1a0d24,.35);
      const signBg=this.add.rectangle(0,0,114,40,0x2c1938,.90).setStrokeStyle(2,0xf4c264);
      const icon=this.add.text(-38,-1,'🪑',{fontSize:'18px'}).setOrigin(.5);
      const label=this.add.text(8,-2,`Mở bàn ${i+1}`,{fontSize:'12px',fontStyle:'bold',fontFamily:'sans-serif',color:'#ffdf99'}).setOrigin(.5);
      const hint=this.add.text(8,9,'Chạm để mở',{fontSize:'8px',fontFamily:'sans-serif',color:'#d2b1d8'}).setOrigin(.5);

      s.locked=this.add.container(s.x,s.y,[shadow,signBg,icon,label,hint]).setDepth(s.y+4).setSize(114,40).setInteractive({useHandCursor:true});
      s.locked.on('pointerdown',()=>targetRef.current('upgrade'));
      this.tweens.add({targets:s.locked,scale:1.05,duration:950,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
     }
     this.report();
    }

    private removeGuest(g:Guest){
     g.idle?.stop();
     g.timeout?.remove(false);
     this.tweens.killTweensOf(g.sprite);
     if(g.orderBadge){this.tweens.killTweensOf(g.orderBadge);g.orderBadge.destroy();}
     if(g.dishSprite){g.dishSprite.destroy();g.dishSprite=undefined;}
     g.sprite.destroy();
     this.customers=this.customers.filter(c=>c!==g);
     this.report();
    }

    private exit(g:Guest,happy=false){
     if(g.state==='leaving')return;
     if(!happy&&g.state==='waiting')exitRef.current?.();
     g.state='leaving';
     g.idle?.stop();
     g.timeout?.remove(false);
     this.tweens.killTweensOf(g.sprite);

     // Hide order badge with smooth fade
     if(g.orderBadge){
      this.tweens.add({targets:g.orderBadge,alpha:0,scale:0.7,duration:350,onComplete:()=>g.orderBadge?.destroy()});
     }
     if(g.dishSprite){
      this.tweens.add({targets:g.dishSprite,alpha:0,duration:500,onComplete:()=>g.dishSprite?.destroy()});
     }
     this.report();

     const exitX=960,exitY=938;
     const dur=1800+Math.random()*400;
     const key=g.sprite.texture.key;
     g.sprite.play(`${key}-right`,true);

     // Cheerful heart emote when departing happy
     if(happy){
      const heart=this.add.text(g.sprite.x,g.sprite.y-100,'❤️',{fontSize:'20px'}).setOrigin(.5).setDepth(1600);
      this.tweens.add({targets:heart,y:heart.y-28,alpha:0,duration:1200,onComplete:()=>heart.destroy()});
     }

     this.tweens.add({
      targets:g.sprite,x:exitX,y:exitY,duration:dur,ease:'Linear',
      onUpdate:()=>{g.sprite.setDepth(Math.floor(g.sprite.y)+26);},
      onComplete:()=>this.removeGuest(g)
     });
    }

    private serveCustomer(){
     const g=this.customers.find(c=>c.state==='waiting');
     if(!g)return;
     g.state='eating';
     g.timeout?.remove(false);
     if(g.companion){
      g.companion.state='eating';
      g.companion.timeout?.remove(false);
     }
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
      this.maiTrayDish.setTexture(guest.dishId);
      this.maiTray.setVisible(true);

      // Brief pause plating food
      this.time.delayedCall(220,()=>{
       // Step 2: Mai walks from kitchen counter to customer's table
       const serveStandX=guest.side==='left'?s.x-12:s.x+12;
       const serveStandY=s.y-35;

       this.walkEntity(this.mai,this.maiTag,'phuc-vu',serveStandX,serveStandY,1150,()=>{
        // Step 3: Deliver dish onto table
        this.maiTray.setVisible(false);
        if(guest.orderBadge){
         this.tweens.add({targets:guest.orderBadge,scale:0,alpha:0,duration:250,onComplete:()=>guest.orderBadge?.destroy()});
        }

        const dish=this.add.image(s.x,s.y-10,guest.dishId).setDisplaySize(44,44).setDepth(s.y+16);
        guest.dishSprite=dish;

        // Steaming hot food fx
        const steam=this.add.text(s.x,s.y-25,'♨️',{fontSize:'18px'}).setOrigin(.5).setDepth(s.y+20);
        this.tweens.add({targets:steam,y:steam.y-26,alpha:0,duration:1000,onComplete:()=>steam.destroy()});

        // Floating coins tip
        const coinFly=this.add.text(s.x,s.y-48,'+50🪙',{fontSize:'18px',fontStyle:'bold',color:'#ffe168',stroke:'#321908',strokeThickness:3}).setOrigin(.5).setDepth(1550);
        this.tweens.add({targets:coinFly,y:coinFly.y-32,alpha:0,duration:1300,ease:'Cubic.easeOut',onComplete:()=>coinFly.destroy()});

        playServeSound();

        // Cheerful nod from Mai
        this.mai.play('phuc-vu-idle',true);
        this.tweens.add({targets:this.mai,y:this.mai.y-4,duration:180,yoyo:true,repeat:1});

        // Customer eating animation (both guests if duo)
        guest.idle?.stop();
        guest.idle=this.tweens.add({targets:guest.sprite,y:guest.sprite.y-3,duration:350,yoyo:true,repeat:5});
        if(guest.companion&&guest.companion.sprite.active){
         guest.companion.idle?.stop();
         guest.companion.idle=this.tweens.add({targets:guest.companion.sprite,y:guest.companion.sprite.y-3,duration:350,yoyo:true,repeat:5});
        }

        // Step 4: Mai walks back to counter
        this.time.delayedCall(450,()=>{
         this.walkEntity(this.mai,this.maiTag,'phuc-vu',this.maiHome.x,this.maiHome.y,950,()=>{
          this.mai.play('phuc-vu-idle',true);
          this.maiBusy=false;
          this.maiIdle=this.tweens.add({targets:this.mai,y:this.maiHome.y-3,duration:1500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
          this.processServeQueue();
         });
        });

        // Step 5: Customers finish eating and depart happy
        this.time.delayedCall(2400,()=>{
         if(guest.sprite.active)this.exit(guest,true);
         if(guest.companion&&guest.companion.sprite.active)this.exit(guest.companion,true);
        });
       },()=>{
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
     if(!this.isShiftRunning||this.isScenePaused)return;
     if(this.customers.length>=Math.min(8,this.numberOfTables*2))return;
     const available=Array.from({length:this.numberOfTables},(_,i)=>i).filter(i=>!this.customers.some(g=>g.seat===i&&g.state!=='leaving'));
     if(!available.length)return;

     const seat=Phaser.Utils.Array.GetRandom(available);
     const target=seatSpots[seat];
     const chosenDish=Phaser.Utils.Array.GetRandom(dishKeys);
     const isDuo=Math.random()<0.65;

     const keyA=Phaser.Utils.Array.GetRandom(guests);
     const keyB=Phaser.Utils.Array.GetRandom(guests);

     // Guest A sits on left stool facing right
     const chairAX=target.x-72;
     const chairAY=target.y+8;
     const spriteA=this.add.sprite(951,957,keyA,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(957).setInteractive({useHandCursor:true});
     spriteA.on('pointerdown',()=>targetRef.current('sell'));
     const guestA:Guest={sprite:spriteA,state:'walking',seat,side:'left',dishId:chosenDish};
     this.customers.push(guestA);

     const aisleAX=Math.min(880,chairAX+60);
     const aisleAY=938;

     let guestB:Guest|undefined;
     if(isDuo){
      // Guest B sits on right stool facing left (matching user screenshot with 2 guests sitting across table)
      const chairBX=target.x+72;
      const chairBY=target.y+8;
      const spriteB=this.add.sprite(965,960,keyB,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(956).setInteractive({useHandCursor:true});
      spriteB.on('pointerdown',()=>targetRef.current('sell'));
      guestB={sprite:spriteB,state:'walking',seat,side:'right',dishId:chosenDish,companion:guestA};
      guestA.companion=guestB;
      this.customers.push(guestB);

      this.time.delayedCall(220,()=>{
       if(!spriteB.active)return;
       const aisleBX=Math.min(880,chairBX+40);
       this.walkEntity(spriteB,undefined,keyB,aisleBX,aisleAY,1200,()=>{
        this.walkEntity(spriteB,undefined,keyB,chairBX,chairBY,1400,()=>{
         if(!spriteB.active)return;
         guestB!.state='waiting';
         spriteB.setFrame(4); // Faces left towards table
         guestB!.idle=this.tweens.add({targets:spriteB,y:spriteB.y-2.5,duration:1300+Math.random()*450,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        });
       });
      });
     }

     this.walkEntity(spriteA,undefined,keyA,aisleAX,aisleAY,1200,()=>{
      this.walkEntity(spriteA,undefined,keyA,chairAX,chairAY,1400,()=>{
       if(!spriteA.active)return;
       guestA.state='waiting';
       spriteA.setFrame(8); // Faces right towards table

       // Compact order badge directly above table center (like ocdem.dreek.site!)
       const bubbleBg=this.add.ellipse(0,0,44,44,0xfffef7,0.95).setStrokeStyle(2,0x542d18);
       const bubbleShadow=this.add.ellipse(0,4,40,36,0x100508,0.25).setDepth(-1);
       const dishIcon=this.add.image(0,-1,chosenDish).setDisplaySize(32,32);
       const timerRing=this.add.circle(0,0,20).setStrokeStyle(2,0x4eb25a,0.85);

       const orderBadge=this.add.container(target.x,target.y-58,[bubbleShadow,bubbleBg,timerRing,dishIcon])
        .setDepth(1500)
        .setSize(44,44)
        .setInteractive({useHandCursor:true});
       orderBadge.on('pointerdown',()=>targetRef.current('sell'));

       this.tweens.add({targets:orderBadge,y:target.y-63,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
       guestA.orderBadge=orderBadge;

       playCustomerBell();
       this.report();

       guestA.idle=this.tweens.add({targets:spriteA,y:spriteA.y-2.5,duration:1300+Math.random()*450,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
       guestA.timeout=this.time.delayedCall(36000+Math.random()*9000,()=>{
        this.exit(guestA);
        if(guestB)this.exit(guestB);
       });
      });
     });
    }

    private resident(id:string,x:number,y:number,text:string,action:HarborTarget){
     const sp=this.add.sprite(x,y,id,0).setOrigin(.5,1).setDisplaySize(82,123).setDepth(y+25).setInteractive({useHandCursor:true});
     const tag=this.add.text(x,y-128,text,{fontSize:'14px',fontFamily:'sans-serif',backgroundColor:'#382642c9',color:'#ffeeb8',padding:{x:6,y:4}}).setOrigin(.5).setDepth(1450);
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

     // Permanent villagers on the pier/market side
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
     this.game.events.on('qhs:start-shift',this.onStartShift);
     this.game.events.on('qhs:end-shift',this.onEndShift);

     this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.game.events.off('qhs:serve',this.onServed);
      this.game.events.off('qhs:seats',this.onSeats);
      this.game.events.off('qhs:pause',this.onPause);
      this.game.events.off('qhs:resume',this.onResume);
      this.game.events.off('qhs:start-shift',this.onStartShift);
      this.game.events.off('qhs:end-shift',this.onEndShift);
      countRef.current?.(0);
     });

     if(this.isShiftRunning){
      this.time.delayedCall(800,()=>this.arrive());
      this.time.delayedCall(2600,()=>this.arrive());
     }
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
