'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Anchor, ArrowLeft, ArrowUpCircle, Bell, Check, CircleHelp, Coffee, Fish, Gift, Heart, Info, LogIn, Map, PackagePlus, Pause, Play, Sailboat, Settings, ShoppingBasket, ShoppingCart, Sparkles, Store, Trophy, UserRound, Volume2, VolumeX, Wallet, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import HarborStage, {type HarborTarget} from '@/game/HarborStage';
import StoryPanel from '@/components/StoryPanel';
import { currentChapter } from '@/lib/story';
import { BookOpen } from 'lucide-react';
import GameLoading from '@/components/GameLoading';
import { customerChat, getRestaurantWarnings } from '@/lib/customerExperience';
import { playSound, isSoundMuted, toggleSound, isAmbientEnabled, toggleAmbient } from '@/lib/audio';
import { ACTION_PLACEHOLDER } from '@/lib/ui';
import { FISH, INITIAL_STATE, applyLocalAction, AREA_COST, formatXu, parseGameState, totalFish, UPGRADE_COST, type Action, type FishId, type GameState } from '@/lib/economy';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase';

type Panel = 'fish'|'market'|'sell'|'upgrade'|'explore'|'donate'|'account'|'help'|'story'|'alerts'|'pause'|null;
const LOCAL_KEY = 'quanhaisan-demo-v1';
const TUTORIAL_KEY='quanhaisan-tutorial-v1';
type TutorialStep = 'intro'|'fish'|'market'|'sell'|'story'|'done';
const GUIDE:Record<Exclude<TutorialStep,'done'>,{title:string;body:string;button:string;panel:Panel}>={
  intro:{title:'👋 Chào mừng đến Bến Nhỏ!',body:'Ông ngoại để lại một quán hải sản và chiếc cần câu cũ. Chúng mình cùng học cách gây dựng quán nhé!',button:'Bắt đầu cuộc phiêu lưu',panel:null},
  fish:{title:'🎣 Bước 1 · Câu con cá đầu tiên',body:'Mở mục Câu cá, canh thanh chỉ thị vào vùng xanh rồi giật cần thành công.',button:'Đi câu cá',panel:'fish'},
  market:{title:'🧺 Bước 2 · Nhập hàng',body:'Mở chợ hải sản, nhập thử một món bằng xu ảo. Bạn có thể tự câu hoặc nhập từ chợ.',button:'Đến chợ cá',panel:'market'},
  sell:{title:'🍽️ Bước 3 · Phục vụ khách',body:'Khách đang đi vào quán, chọn bàn và gọi món. Bán một con cá trong kho để phục vụ khách.',button:'Phục vụ khách',panel:'sell'},
  story:{title:'📖 Bước 4 · Mở nhật ký',body:'Mỗi chương truyện có mục tiêu riêng. Hoàn thành để khám phá câu chuyện của Bến Nhỏ!',button:'Đọc Chuyện Bến Nhỏ',panel:'story'},
};
const tabs: {id:Exclude<Panel,null>;icon:typeof Fish;label:string;sub:string}[] = [
  {id:'fish',icon:Fish,label:'Câu cá',sub:'Ra khơi bắt cá'},
  {id:'market',icon:ShoppingBasket,label:'Nhập hàng',sub:'Chợ ven biển'},
  {id:'sell',icon:Store,label:'Bán cá',sub:'Phục vụ khách'},
  {id:'upgrade',icon:ArrowUpCircle,label:'Nâng cấp',sub:'Mở rộng quán'},
  {id:'explore',icon:Map,label:'Khám phá',sub:'Vùng biển mới'},
];
const menu=[{name:'Cá thu nướng',price:45,emoji:'🐟'},{name:'Cá ngừ áp chảo',price:55,emoji:'🐠'},{name:'Tôm muối ớt',price:60,emoji:'🦐'},{name:'Mực hấp gừng',price:50,emoji:'🦑'}];
function Modal({title,children,onClose,tag}:{title:string;children:React.ReactNode;onClose:()=>void;tag?:string}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
    <section className="game-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-header"><div><span className="modal-eyebrow">{tag||'QUÁN HẢI SẢN'}</span><h2>{title}</h2></div><button className="close-btn" onClick={onClose} aria-label="Đóng"><X size={22}/></button></div>
      <div className="modal-content">{children}</div>
    </section>
  </div>;
}
function StockCard({id,qty,onClick}:{id:FishId;qty:number;onClick:()=>void}){
  const f=FISH.find(f=>f.id===id)!;
  return <button className="stock-card" onClick={onClick} title={`${f.name}: ${qty} con`}>
    <span className="stock-count">{qty}</span><img className="pixel-item-icon" src={`/assets/pixel/seafood/${id}.png`} alt=""/><strong>{f.name}</strong>
  </button>;
}
function DonateContent(){
  const [hasImage,setHasImage]=useState(true);
  const name=process.env.NEXT_PUBLIC_DONATE_NAME;
  return <div className="donate-content">
    <div className="donate-heart"><Heart fill="currentColor" size={28}/></div>
    <h3>Mời tác giả một ly cà phê ☕</h3>
    <p>Ủng hộ hoàn toàn tự nguyện để quán hải sản có thêm bản đồ, loài cá và những sự kiện mới!</p>
    <div className="qr-frame">
      {hasImage ? <img src="/donate-qr.png" alt="Mã QR chuyển khoản ngân hàng của tác giả" onError={()=>setHasImage(false)}/> :
        <div className="qr-placeholder"><Heart size={40}/><strong>Chưa thêm QR</strong><small>Đặt ảnh ngân hàng của bạn vào<br/><code>public/donate-qr.png</code></small></div>}
    </div>
    {name&&<strong className="donate-name">{name}</strong>}
    <p className="notice-line">Không liên kết với xu, kim cương hay phần thưởng trong game. Game không thu thập thông tin chuyển khoản.</p>
  </div>;
}
function FishingContent({onCatch,working}:{onCatch:()=>Promise<boolean>;working:boolean}){
  const [position,setPosition]=useState(0);
  const [message,setMessage]=useState('Canh cá vào vùng xanh rồi nhấn “Giật cần”!');
  const [attempts,setAttempts]=useState(0);
  const [won,setWon]=useState(false);
  const ref=useRef(0);
  useEffect(()=>{
    let frame=0;let raf=0;
    const animate=()=>{frame++;const n=50+48*Math.sin(frame/18);ref.current=n;setPosition(n);raf=requestAnimationFrame(animate)};
    raf=requestAnimationFrame(animate);return()=>cancelAnimationFrame(raf);
  },[]);
  const hook=async()=>{
    if(working)return;
    setAttempts(v=>v+1);
    if(ref.current<38||ref.current>70){setMessage('💦 Cá vụt mất! Canh vùng xanh rồi thử lại.');setWon(false);return;}
    const success=await onCatch();
    setWon(success);setMessage(success?'🎉 Bắt được cá! Cá đã vào kho hải sản.':'Chưa thể câu, kiểm tra thông báo phía trên.');
  };
  return <div className="fishing-content">
    <div className="fishing-water"><span className="water-wave">〰️ 〰️ 〰️</span><img className="fisher-pixel" src="/assets/pixel/props/can-cau.png" alt="Cần câu"/><img className="floating-fish" src="/assets/pixel/seafood/ca-thu.png" alt="Cá thu đang bơi"/><span className="water-wave">〰️ 〰️ 〰️</span></div>
    <div className="catch-meter"><div className="catch-good"/><div className="catch-marker" style={{left:`${position}%`}}/></div>
    <p className={won?'catch-won':'catch-message'}>{message}</p>
    <button className="gold-button full" disabled={working} onClick={hook}>{working?'Đang kéo cá...':'🎣 Giật cần!'}</button>
    <small>Thử {attempts} lần · Mỗi lần câu thành công cần nghỉ 3 giây · Cá quý xuất hiện ở vùng biển mới.</small>
  </div>;
}
function AccountContent({user,onLogin,onLogout,working}:{user:User|null;onLogin:(email:string)=>Promise<void>;onLogout:()=>Promise<void>;working:boolean}){
  const [email,setEmail]=useState('');
  if(!hasSupabaseConfig) return <div className="account-content"><Info/><h3>Đang chơi chế độ demo</h3><p>Dữ liệu được lưu trong trình duyệt này. Khi bạn tạo Supabase, điền biến môi trường và chạy SQL trong thư mục <code>supabase/migrations</code> để bật đăng nhập/lưu đám mây.</p></div>;
  if(user)return <div className="account-content"><UserRound size={38}/><h3>Đã đăng nhập</h3><p>{user.email||'Tài khoản của bạn'}</p><p>Tiền ảo, kho cá và nâng cấp đã được lưu trên Supabase.</p><button className="secondary-button full" disabled={working} onClick={onLogout}>Đăng xuất</button></div>;
  return <form className="account-content" onSubmit={e=>{e.preventDefault();void onLogin(email)}}><LogIn size={38}/><h3>Lưu tiến trình lên đám mây</h3><p>Nhận email có liên kết đăng nhập. Tiến trình cloud khởi đầu riêng, không đồng bộ dữ liệu demo.</p><label htmlFor="login-email">Email</label><input id="login-email" type="email" required autoComplete="email" placeholder="ban@example.com" value={email} onChange={e=>setEmail(e.target.value)}/><button className="gold-button full" disabled={working}>Gửi liên kết đăng nhập</button></form>;
}
export default function GameApp(){
  const [game,setGame]=useState<GameState>(structuredClone(INITIAL_STATE));
  const [user,setUser]=useState<User|null>(null);
  const [panel,setPanel]=useState<Panel>(null);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');
  const [ready,setReady]=useState(false);
  const [assetsReady,setAssetsReady]=useState(false);
  const onAssetsReady=useCallback(()=>setAssetsReady(true),[]);
  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
  const [chosen,setChosen]=useState<FishId>('ca-thu');
  const [tutorial,setTutorial]=useState<TutorialStep>('done');
  const [customerCount,setCustomerCount]=useState(0);
  const [unservedDepartures,setUnservedDepartures]=useState(0);
  const [servedSignal,setServedSignal]=useState(0);
  const [soundMuted,setSoundMutedState]=useState(false);
  const [ambientActive,setAmbientActive]=useState(true);
  const [isPaused,setIsPaused]=useState(false);
  const [chatterIndex,setChatterIndex]=useState(0);
  const notificationTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);

  useEffect(()=>{
    setSoundMutedState(isSoundMuted());
    setAmbientActive(isAmbientEnabled());
    const interval=setInterval(()=>{
      setChatterIndex(i=>(i+1)%5);
    },7000);
    return()=>clearInterval(interval);
  },[]);

  const handleToggleSound=useCallback(()=>{
    const active=toggleSound();
    setSoundMutedState(!active);
    if(active)playSound('click');
  },[]);

  const handleToggleAmbient=useCallback(()=>{
    const next=toggleAmbient();
    setAmbientActive(next);
    playSound('click');
  },[]);

  const handleTogglePause=useCallback(()=>{
    setIsPaused(prev=>{
      const next=!prev;
      setPanel(next?'pause':null);
      return next;
    });
    playSound('click');
  },[]);

  const handleClosePause=useCallback(()=>{
    setIsPaused(false);
    setPanel(null);
    playSound('click');
  },[]);
  const notify=useCallback((msg:string)=>{setToast(msg);clearTimeout(notificationTimer.current);notificationTimer.current=setTimeout(()=>setToast(''),3400)},[]);
  const fetchCloud=useCallback(async()=>{
    const db=getSupabase();if(!db)return;
    const {data,error}=await db.rpc('get_game_state');
    if(error)throw error;
    setGame(parseGameState(data));
  },[]);
  useEffect(()=>{
    try{const saved=localStorage.getItem(LOCAL_KEY);if(saved)setGame(parseGameState(JSON.parse(saved)))}catch{ /* corrupt save - start fresh */ }
    setReady(true);
    try{if(localStorage.getItem(TUTORIAL_KEY)!=='done')setTutorial('intro')}catch{ /* blocked storage */ }
    const db=getSupabase();
    if(db){
      void db.auth.getUser().then(({data})=>{setUser(data.user);if(data.user)void fetchCloud().catch(e=>notify(`Supabase: ${e.message}`))});
      const {data:subscription}=db.auth.onAuthStateChange((_event,session)=>{
        setUser(session?.user||null);
        if(session?.user){setTimeout(()=>void fetchCloud().catch(e=>notify(`Supabase: ${e.message}`)),0)}
        else{try{const local=localStorage.getItem(LOCAL_KEY);setGame(parseGameState(local?JSON.parse(local):null))}catch{setGame(structuredClone(INITIAL_STATE))}}
      });
      return()=>subscription.subscription.unsubscribe();
    }
  },[fetchCloud,notify]);
  useEffect(()=>{if(ready&&!user)localStorage.setItem(LOCAL_KEY,JSON.stringify(game))},[game,ready,user]);
  useEffect(()=>{
    if(process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator){
      void navigator.serviceWorker.register('/sw.js').catch(()=>{});
    } else if(process.env.NODE_ENV !== 'production' && 'serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(regs=>{
        for(const reg of regs) void reg.unregister();
      });
      if('caches' in window){
        caches.keys().then(keys=>{
          for(const k of keys) void caches.delete(k);
        });
      }
    }
    const handler=(e:Event)=>{e.preventDefault();setInstallPrompt(e)};
    window.addEventListener('beforeinstallprompt',handler);
    return()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);
  useEffect(()=>()=>clearTimeout(notificationTimer.current),[]);
  const transact=useCallback(async(action:Action,item?:FishId):Promise<boolean>=>{
    if(busy)return false;
    setBusy(true);
    try{
      if(user&&getSupabase()){
        const {data,error}=await getSupabase()!.rpc('game_action',{p_action:action,p_item:item??null});
        if(error)throw error;
        setGame(parseGameState(data));
      }else{
        const next=applyLocalAction(game,action,item);
        setGame(next);
      }
      const messages:Record<Action,string>={fish:'🎣 Cá mới đã vào kho!',buy:'📦 Nhập hàng thành công!',sell:'🪙 Khách đã mua cá!',upgrade:'🏡 Quán đã được nâng cấp!',unlock:'🗺️ Mở khóa vùng biển mới!'};
      notify(messages[action]);
      playSound(action==='fish'?'catch':action==='sell'?'coin':action==='upgrade'||action==='unlock'?'upgrade':'click');
      if(action==='sell')setServedSignal(v=>v+1);
      setTutorial(step=>action==='fish'&&step==='fish'?'market':action==='buy'&&step==='market'?'sell':action==='sell'&&step==='sell'?'story':step);
      return true;
    }catch(e){notify(e instanceof Error?e.message:'Giao dịch chưa thành công');return false}
    finally{setBusy(false)}
  },[busy,game,user,notify]);
  const login=async(email:string)=>{
    const db=getSupabase();if(!db)return;
    setBusy(true);const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setBusy(false);
    notify(error?error.message:'📩 Đã gửi email đăng nhập. Kiểm tra hộp thư nhé!');
  };
  const logout=async()=>{setBusy(true);await getSupabase()?.auth.signOut();setBusy(false);setPanel(null);notify('Đã đăng xuất!')};
  const install=async()=>{
    const e=installPrompt as (Event & {prompt:()=>Promise<void>})|null;
    if(e){await e.prompt();setInstallPrompt(null)}
    else notify('Trên điện thoại: chọn “Thêm vào màn hình chính” trong menu trình duyệt.');
  };
  const finishGuide=()=>{setTutorial('done');try{localStorage.setItem(TUTORIAL_KEY,'done')}catch{}};
  const guideAction=()=>{if(tutorial==='done')return;if(tutorial==='intro'){setTutorial('fish');return;}if(tutorial==='story'){setPanel('story');finishGuide();return;}setPanel(GUIDE[tutorial].panel)};
  const openTarget=(t:HarborTarget)=>setPanel(t);
  const chosenFish=FISH.find(f=>f.id===chosen)!;
  const restaurantWarnings=getRestaurantWarnings({waiting:customerCount,stock:totalFish(game),leftUnserved:unservedDepartures,tables:Math.min(5,2+game.upgrades)});
  return <main className="site-bg">
  {!assetsReady&&<GameLoading onReady={onAssetsReady}/>}
  <div className="game-shell">
    <header className="game-topbar">
      <button className="profile" onClick={()=>setPanel('account')} aria-label="Tài khoản"><span className="avatar"><img src="/assets/pixel/portraits/ngu-choi.webp" alt="Nhân vật chính" className="avatar-pixel"/></span><span><strong>Quán Hải Sản</strong><small>Lv. {game.level} <i className="xp-progress"><i style={{width:`${game.xp%100}%`}}/></i></small></span></button>
      <div className="currency"><span>🪙</span><b>{formatXu(game.coins)}</b></div>
      <div className="currency gems"><span>💎</span><b>{game.gems}</b></div>
      {restaurantWarnings.length>0&&(
        <button className="top-icon alert-icon" onClick={()=>setPanel('alerts')} aria-label={`${restaurantWarnings.length} cảnh báo`}>
          <Bell size={18}/>
          <span className="alert-badge">{restaurantWarnings.length}</span>
        </button>
      )}
      <button className="top-icon sound-icon" onClick={handleToggleSound} aria-label={soundMuted ? "Bật âm thanh" : "Tắt âm thanh"}>{soundMuted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button>
      <button className="top-icon pause-icon" onClick={handleTogglePause} aria-label={isPaused ? "Bán tiếp" : "Tạm dừng"}><Pause size={19}/></button>
      <button className="top-icon" onClick={()=>setPanel('help')} aria-label="Cài đặt và hướng dẫn"><Settings size={20}/></button>
    </header>
    <div className="world-box">
      <HarborStage onTarget={openTarget} onCustomerCount={setCustomerCount} onCustomerExitUnserved={()=>setUnservedDepartures(v=>v+1)} servedSignal={servedSignal} upgrades={game.upgrades} isPaused={isPaused || panel === 'pause'}/>
      <div className="guest-chatter-ticker" role="status" aria-live="polite">
        <span className="chatter-emoji">💬</span>
        <span className="chatter-quote">{customerChat('waiting', chatterIndex)}</span>
        {customerCount>0&&(
          <button className="chatter-order-pill" onClick={()=>setPanel('sell')}>
            🍽️ {customerCount} bàn đợi món
          </button>
        )}
      </div>
    </div>
    <section className="stock-section">
      <div className="stock-header"><div><ShoppingCart size={19}/><strong>Kho Hải Sản</strong><span>({totalFish(game)})</span></div><span className="small-level">🏡 Quán cấp {game.upgrades+1}</span></div>
      <div className="stock-scroll">{FISH.map(f=><StockCard key={f.id} id={f.id} qty={game.inventory[f.id]} onClick={()=>{setChosen(f.id);setPanel('sell')}}/>)}</div>
    </section>
    <nav className="bottom-menu" aria-label="Tính năng game">
      {tabs.map(t=>{const I=t.icon;return <button key={t.id} className={`menu-button ${t.id==='fish'?'featured':''}`} onClick={()=>setPanel(t.id)}><I size={23} strokeWidth={2.5}/><strong>{t.label}</strong><small>{t.sub}</small></button>})}
    </nav>
    <footer className="game-footer"><span>{user?'☁️ Đã lưu Supabase':'💾 Demo · tự lưu trên máy'}</span><button onClick={()=>setPanel('donate')}><Heart size={14}/> Ủng hộ tác giả</button></footer>
    {installPrompt&&<button className="install-pill" onClick={()=>void install()}>📲 Cài ứng dụng</button>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>
  {panel==='story'&&<Modal title="Chuyện Bến Nhỏ" tag={`CHƯƠNG ${currentChapter(game)} · NHẬT KÝ LÀNG CHÀI`} onClose={()=>setPanel(null)}><StoryPanel game={game}/></Modal>}
  {panel==='pause'&&<Modal title="Tạm dừng quán" tag="NGHỈ TAY GIỮA CA" onClose={handleClosePause}>
    <div className="pause-content">
      <div className="pause-intro">
        <p>⏸️ <strong>Quán đang dừng:</strong> khách đứng yên, Mai dừng bưng bê, đồng hồ không chạy.</p>
      </div>
      <button className="green-button full resume-btn" onClick={handleClosePause}>
        <Play size={20} fill="currentColor"/> BÁN TIẾP
      </button>
      <div className="pause-stats-card">
        <h4>📋 Tình hình ca bán</h4>
        <div className="pause-stats-grid">
          <div className="pause-stat-item">
            <small>Bàn phục vụ</small>
            <strong>{Math.min(5,2+game.upgrades)} bàn</strong>
          </div>
          <div className="pause-stat-item">
            <small>Đang chờ món</small>
            <strong className={customerCount>0?'highlight':''}>{customerCount} bàn</strong>
          </div>
          <div className="pause-stat-item">
            <small>Kho hải sản</small>
            <strong>{totalFish(game)} con</strong>
          </div>
        </div>
      </div>
      <div className="pause-audio-section">
        <h4>🔊 Cài đặt âm thanh</h4>
        <div className="audio-toggle-group">
          <button className={`audio-pill-btn ${!soundMuted?'active':''}`} onClick={handleToggleSound}>
            {soundMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            <span>{soundMuted ? 'Hiệu ứng: TẮT' : 'Hiệu ứng: BẬT'}</span>
          </button>
          <button className={`audio-pill-btn ${ambientActive?'active':''}`} onClick={handleToggleAmbient}>
            <span>🌊</span>
            <span>{ambientActive ? 'Sóng biển: BẬT' : 'Sóng biển: TẮT'}</span>
          </button>
        </div>
      </div>
      <div className="pause-nav-actions">
        <button className="secondary-button full" onClick={()=>{setPanel('story')}}>📖 Đọc Chuyện Bến Nhỏ</button>
        <button className="secondary-button full" onClick={()=>{setPanel('help')}}>⚙️ Hướng dẫn & Lưu game</button>
      </div>
    </div>
  </Modal>}
  {panel==='fish'&&<Modal title="Câu cá ngoài khơi" tag={`VÙNG BIỂN ${game.area}`} onClose={()=>setPanel(null)}><FishingContent working={busy} onCatch={()=>transact('fish')}/></Modal>}
  {panel==='market'&&<Modal title="Chợ Hải Sản" tag="NHẬP HÀNG BẰNG XU" onClose={()=>setPanel(null)}><p className="modal-intro">Nhập hải sản từ chợ ven biển. Giá nhập cao hơn giá bán để khuyến khích tự câu cá.</p><div className="trade-list">{FISH.map(f=><div className="trade-row" key={f.id}><img className="pixel-trade-icon" src={`/assets/pixel/seafood/${f.id}.png`} alt=""/><div className="trade-name"><strong>{f.name}</strong><small>{f.rarity} · Kho: {game.inventory[f.id]}</small></div><button disabled={busy||game.coins<f.buy} onClick={()=>void transact('buy',f.id)}>Nhập {f.buy} xu</button></div>)}</div></Modal>}
  {panel==='sell'&&<Modal title="Bán hải sản" tag="KHÁCH HÀNG ĐANG ĐỢI" onClose={()=>setPanel(null)}><p className="modal-intro">Chọn cá trong kho để bán cho khách. Mỗi lần bán nhận xu và kinh nghiệm.</p><div className="selected-fish"><img className="pixel-item-icon" src={`/assets/pixel/seafood/${chosen}.png`} alt=""/><strong>{chosenFish.name}</strong><small>Giá bán: {chosenFish.sell+game.upgrades*5} xu</small></div><div className="trade-list">{FISH.map(f=><div className={`trade-row ${chosen===f.id?'selected':''}`} key={f.id}><img className="pixel-trade-icon" src={`/assets/pixel/seafood/${f.id}.png`} alt=""/><div className="trade-name"><strong>{f.name}</strong><small>Trong kho: {game.inventory[f.id]}</small></div><button disabled={busy||!game.inventory[f.id]} onClick={()=>{setChosen(f.id);void transact('sell',f.id)}}>Bán +{f.sell+game.upgrades*5}</button></div>)}</div></Modal>}
  {panel==='upgrade'&&<Modal title="Nâng cấp quán" tag="XÂY DỰNG CƠ NGƠI" onClose={()=>setPanel(null)}><div className="feature-card"><img className="feature-pixel" src="/assets/pixel/props/tu-hai-san.png" alt="Tủ hải sản"/><h3>Quán cấp {game.upgrades+1}</h3><p>Mỗi lần nâng cấp mở thêm <b>1 bàn phục vụ</b> ngay trên bản đồ (tối đa 5 bàn) và tăng giá bán thêm 5 xu.</p><strong>Đang có {Math.min(5,2+game.upgrades)} bàn phục vụ · +{game.upgrades*5} xu / đơn</strong></div><button className="gold-button full" disabled={busy||game.coins<UPGRADE_COST(game.upgrades)} onClick={()=>void transact('upgrade')}>⬆️ Nâng cấp · {formatXu(UPGRADE_COST(game.upgrades))} xu</button></Modal>}
  {panel==='explore'&&<Modal title="Khám phá đại dương" tag="BẢN ĐỒ VÙNG BIỂN" onClose={()=>setPanel(null)}><div className="explore-list">{['Vịnh Bình Minh','Rạn San Hô','Biển Xa'].map((n,i)=><div className={`explore-item ${i+1<=game.area?'unlocked':''}`} key={n}><div className="island-icon">{['🏝️','🪸','⛵'][i]}</div><div><strong>{n}</strong><small>{i+1<=game.area?'Đã mở khóa':'Chưa khám phá'}</small></div><span>{i+1<=game.area?'✓':'🔒'}</span></div>)}</div><button className="gold-button full" disabled={busy||game.area>=3||game.coins<AREA_COST(game.area)} onClick={()=>void transact('unlock')}>{game.area>=3?'Đã khám phá hết':'🗺️ Mở vùng biển mới · '+formatXu(AREA_COST(game.area))+' xu'}</button></Modal>}
  {panel==='donate'&&<Modal title="Ủng hộ tác giả" tag="CẢMƠN BẠN 💛" onClose={()=>setPanel(null)}><DonateContent/></Modal>}
  {panel==='account'&&<Modal title="Tài khoản người chơi" tag="LƯU TIẾN TRÌNH" onClose={()=>setPanel(null)}><AccountContent user={user} onLogin={login} onLogout={logout} working={busy}/></Modal>}
  {panel==='alerts'&&<Modal title="Cảnh báo trong quán" tag="THÔNG BÁO TỪ BẾN NHỎ" onClose={()=>setPanel(null)}><div className="restaurant-alerts">{restaurantWarnings.length===0?<p className="modal-intro">🌿 Quán đang hoạt động ổn. Chưa có việc gấp cần xử lý.</p>:restaurantWarnings.map(a=><div className={`restaurant-alert restaurant-alert-${a.level}`} key={a.id}><div><strong>{a.level==='urgent'?'🔴':a.level==='warning'?'🟠':'💬'} {a.title}</strong><p>{a.detail}</p></div>{a.target?<button onClick={()=>setPanel(a.target)}>Xử lý</button>:<button onClick={()=>setUnservedDepartures(0)}>Đã xem</button>}</div>)}</div></Modal>}
  {panel==='help'&&<Modal title="Hướng dẫn & Cài đặt" onClose={()=>setPanel(null)}><div className="help-content">
    <div className="audio-toggle-group">
      <button className={`audio-pill-btn ${!soundMuted?'active':''}`} onClick={handleToggleSound}>
        {soundMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
        <span>{soundMuted ? 'Âm thanh: TẮT' : 'Âm thanh: BẬT'}</span>
      </button>
      <button className={`audio-pill-btn ${ambientActive?'active':''}`} onClick={handleToggleAmbient}>
        <span>🌊</span>
        <span>{ambientActive ? 'Sóng biển: BẬT' : 'Sóng biển: TẮT'}</span>
      </button>
    </div>
    <CircleHelp size={32}/>
    <p>🎣 <strong>Câu cá:</strong> canh lực, giật cần để nhận cá vào kho.</p>
    <p>🧺 <strong>Nhập hàng:</strong> dùng xu ảo để mua hải sản.</p>
    <p>🪙 <strong>Bán cá:</strong> bán cá trong kho để kiếm xu và XP.</p>
    <p>🏡 <strong>Nâng cấp:</strong> mở rộng quán để tăng doanh thu và thêm bàn.</p>
    <p>❤️ <strong>Donate:</strong> mã QR ngân hàng riêng của tác giả, độc lập với game.</p>
    <button className="secondary-button full" onClick={()=>void install()}>📲 Cài đặt game PWA</button>
    <button className="secondary-button full" onClick={()=>setPanel('account')}>👤 Tài khoản / lưu cloud</button>
    <button className="secondary-button full" onClick={()=>{setPanel(null);setTutorial('intro');localStorage.removeItem(TUTORIAL_KEY)}}>✨ Xem lại hướng dẫn đầu game</button>
    <button className="secondary-button full" onClick={()=>setPanel('story')}>📖 Chuyện Bến Nhỏ</button>
    <p className="notice-line">{ACTION_PLACEHOLDER}</p>
  </div></Modal>}
  {ready&&assetsReady&&tutorial!=='done'&&panel===null&&<div className="coach-banner" role="region" aria-live="polite"><div className="coach-header"><strong>{GUIDE[tutorial].title}</strong><span style={{fontSize:11,color:'#c4afc9'}}>Hướng dẫn</span></div><p>{GUIDE[tutorial].body}</p><div className="coach-controls"><button onClick={guideAction}>{GUIDE[tutorial].button}</button><button className="skip" onClick={finishGuide}>Bỏ qua</button></div></div>}
  </main>;
}
