'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Anchor, ArrowLeft, ArrowUpCircle, Check, CircleHelp, Coffee, Fish, Gift, Heart, Info, LogIn, Map, PackagePlus, Sailboat, Settings, ShoppingBasket, ShoppingCart, Sparkles, Store, Trophy, UserRound, Wallet, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import HarborStage, {type HarborTarget} from '@/game/HarborStage';
import GameLoading from '@/components/GameLoading';
import { ACTION_PLACEHOLDER } from '@/lib/ui';
import { FISH, INITIAL_STATE, applyLocalAction, AREA_COST, formatXu, parseGameState, totalFish, UPGRADE_COST, type Action, type FishId, type GameState } from '@/lib/economy';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase';

type Panel = 'fish'|'market'|'sell'|'upgrade'|'explore'|'donate'|'account'|'help'|null;
const LOCAL_KEY = 'quanhaisan-demo-v1';
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
    <span className="stock-count">{qty}</span><span className="stock-emoji">{f.icon}</span><strong>{f.name}</strong>
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
    <div className="fishing-water"><span className="water-wave">〰️ 〰️ 〰️</span><span className="fisher">🎣</span><span className="floating-fish">🐟</span><span className="water-wave">〰️ 〰️ 〰️</span></div>
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
  const notificationTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
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
    if('serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{});
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
      notify(messages[action]);return true;
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
  const openTarget=(t:HarborTarget)=>setPanel(t);
  const chosenFish=FISH.find(f=>f.id===chosen)!;
  return <main className="site-bg">
  {!assetsReady&&<GameLoading onReady={onAssetsReady}/>}
  <div className="game-shell">
    <header className="game-topbar">
      <button className="profile" onClick={()=>setPanel('account')} aria-label="Tài khoản"><span className="avatar">👒</span><span><strong>Quán Hải Sản</strong><small>Lv. {game.level} <i className="xp-progress"><i style={{width:`${game.xp%100}%`}}/></i></small></span></button>
      <div className="currency"><span>🪙</span><b>{formatXu(game.coins)}</b></div>
      <div className="currency gems"><span>💎</span><b>{game.gems}</b></div>
      <button className="top-icon" onClick={()=>setPanel('help')} aria-label="Cài đặt và hướng dẫn"><Settings size={22}/></button>
    </header>
    <div className="world-box">
      <HarborStage onTarget={openTarget}/>
      <div className="scene-tip"><Anchor size={14}/> Chạm vào 🎣, 🧺, 🪙 để chơi</div>
      <div className="world-heading"><span className="tiny-tag">BẾN CẢNG BÌNH MINH</span><h1>Quán Hải Sản</h1><p>🐟 Tươi ngon từ biển cả</p></div>
      <div className="menu-board"><strong>📜 THỰC ĐƠN</strong>{menu.map(m=><div key={m.name}><span>{m.emoji} {m.name}</span><b>{m.price}k</b></div>)}</div>
      <button className="donate-float" onClick={()=>setPanel('donate')}><Heart size={17} fill="currentColor"/> Donate</button>
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
  {panel==='fish'&&<Modal title="Câu cá ngoài khơi" tag={`VÙNG BIỂN ${game.area}`} onClose={()=>setPanel(null)}><FishingContent working={busy} onCatch={()=>transact('fish')}/></Modal>}
  {panel==='market'&&<Modal title="Chợ Hải Sản" tag="NHẬP HÀNG BẰNG XU" onClose={()=>setPanel(null)}><p className="modal-intro">Nhập hải sản từ chợ ven biển. Giá nhập cao hơn giá bán để khuyến khích tự câu cá.</p><div className="trade-list">{FISH.map(f=><div className="trade-row" key={f.id}><span className="trade-emoji">{f.icon}</span><div className="trade-name"><strong>{f.name}</strong><small>{f.rarity} · Kho: {game.inventory[f.id]}</small></div><button disabled={busy||game.coins<f.buy} onClick={()=>void transact('buy',f.id)}>Nhập {f.buy} xu</button></div>)}</div></Modal>}
  {panel==='sell'&&<Modal title="Bán hải sản" tag="KHÁCH HÀNG ĐANG ĐỢI" onClose={()=>setPanel(null)}><p className="modal-intro">Chọn cá trong kho để bán cho khách. Mỗi lần bán nhận xu và kinh nghiệm.</p><div className="selected-fish"><span>{chosenFish.icon}</span><strong>{chosenFish.name}</strong><small>Giá bán: {chosenFish.sell+game.upgrades*5} xu</small></div><div className="trade-list">{FISH.map(f=><div className={`trade-row ${chosen===f.id?'selected':''}`} key={f.id}><span className="trade-emoji">{f.icon}</span><div className="trade-name"><strong>{f.name}</strong><small>Trong kho: {game.inventory[f.id]}</small></div><button disabled={busy||!game.inventory[f.id]} onClick={()=>{setChosen(f.id);void transact('sell',f.id)}}>Bán +{f.sell+game.upgrades*5}</button></div>)}</div></Modal>}
  {panel==='upgrade'&&<Modal title="Nâng cấp quán" tag="XÂY DỰNG CƠ NGƠI" onClose={()=>setPanel(null)}><div className="feature-card"><span>🏡</span><h3>Quán cấp {game.upgrades+1}</h3><p>Mỗi lần nâng cấp giúp mỗi đơn hàng bán được thêm 5 xu.</p><strong>Tăng doanh thu: +{game.upgrades*5} xu / đơn</strong></div><button className="gold-button full" disabled={busy||game.coins<UPGRADE_COST(game.upgrades)} onClick={()=>void transact('upgrade')}>⬆️ Nâng cấp · {formatXu(UPGRADE_COST(game.upgrades))} xu</button></Modal>}
  {panel==='explore'&&<Modal title="Khám phá đại dương" tag="BẢN ĐỒ VÙNG BIỂN" onClose={()=>setPanel(null)}><div className="explore-list">{['Vịnh Bình Minh','Rạn San Hô','Biển Xa'].map((n,i)=><div className={`explore-item ${i+1<=game.area?'unlocked':''}`} key={n}><div className="island-icon">{['🏝️','🪸','⛵'][i]}</div><div><strong>{n}</strong><small>{i+1<=game.area?'Đã mở khóa':'Chưa khám phá'}</small></div><span>{i+1<=game.area?'✓':'🔒'}</span></div>)}</div><button className="gold-button full" disabled={busy||game.area>=3||game.coins<AREA_COST(game.area)} onClick={()=>void transact('unlock')}>{game.area>=3?'Đã khám phá hết':'🗺️ Mở vùng biển mới · '+formatXu(AREA_COST(game.area))+' xu'}</button></Modal>}
  {panel==='donate'&&<Modal title="Ủng hộ tác giả" tag="CẢM ƠN BẠN 💛" onClose={()=>setPanel(null)}><DonateContent/></Modal>}
  {panel==='account'&&<Modal title="Tài khoản người chơi" tag="LƯU TIẾN TRÌNH" onClose={()=>setPanel(null)}><AccountContent user={user} onLogin={login} onLogout={logout} working={busy}/></Modal>}
  {panel==='help'&&<Modal title="Hướng dẫn & Cài đặt" onClose={()=>setPanel(null)}><div className="help-content"><CircleHelp size={32}/><p>🎣 <strong>Câu cá:</strong> canh lực, giật cần để nhận cá vào kho.</p><p>🧺 <strong>Nhập hàng:</strong> dùng xu ảo để mua hải sản.</p><p>🪙 <strong>Bán cá:</strong> bán cá trong kho để kiếm xu và XP.</p><p>🏡 <strong>Nâng cấp:</strong> mở rộng quán để tăng doanh thu.</p><p>❤️ <strong>Donate:</strong> mã QR ngân hàng riêng của tác giả, độc lập với game.</p><button className="secondary-button full" onClick={()=>void install()}>📲 Cài đặt game PWA</button><button className="secondary-button full" onClick={()=>setPanel('account')}>👤 Tài khoản / lưu game</button><p className="notice-line">{ACTION_PLACEHOLDER}</p></div></Modal>}
  </main>;
}
