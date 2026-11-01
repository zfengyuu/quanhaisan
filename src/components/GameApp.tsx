'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  ArrowUpCircle,
  Bell,
  Check,
  CircleHelp,
  Coffee,
  Fish,
  Gift,
  Heart,
  Info,
  LogIn,
  Map,
  PackagePlus,
  Pause,
  Play,
  Sailboat,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
  X
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import HarborStage, { type HarborTarget } from '@/game/HarborStage';
import StoryPanel from '@/components/StoryPanel';
import { currentChapter } from '@/lib/story';
import GameLoading from '@/components/GameLoading';
import { customerChat, getRestaurantWarnings } from '@/lib/customerExperience';
import { playSound, isSoundMuted, toggleSound, isAmbientEnabled, toggleAmbient } from '@/lib/audio';
import { ACTION_PLACEHOLDER } from '@/lib/ui';
import {
  FISH,
  INITIAL_STATE,
  applyLocalAction,
  AREA_COST,
  formatXu,
  parseGameState,
  totalFish,
  UPGRADE_COST,
  type Action,
  type FishId,
  type GameState
} from '@/lib/economy';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase';

type Panel = 'fish' | 'market' | 'sell' | 'upgrade' | 'explore' | 'donate' | 'account' | 'help' | 'story' | 'alerts' | 'pause' | null;
const LOCAL_KEY = 'quanhaisan-demo-v1';
const TUTORIAL_KEY = 'quanhaisan-tutorial-v1';
type TutorialStep = 'intro' | 'fish' | 'market' | 'sell' | 'story' | 'done';

const GUIDE: Record<Exclude<TutorialStep, 'done'>, { title: string; body: string; button: string; panel: Panel }> = {
  intro: { title: '👋 Chào mừng đến Bến Nhỏ!', body: 'Ông ngoại để lại một quán hải sản và chiếc cần câu cũ. Chúng mình cùng học cách gây dựng quán nhé!', button: 'Bắt đầu cuộc phiêu lưu', panel: null },
  fish: { title: '🎣 Bước 1 · Câu con cá đầu tiên', body: 'Mở mục Câu cá, canh thanh chỉ thị vào vùng xanh rồi giật cần thành công.', button: 'Đi câu cá', panel: 'fish' },
  market: { title: '🧺 Bước 2 · Nhập hàng', body: 'Mở chợ hải sản, nhập thử một món bằng xu ảo. Bạn có thể tự câu hoặc nhập từ chợ.', button: 'Đến chợ cá', panel: 'market' },
  sell: { title: '🍽️ Bước 3 · Phục vụ khách', body: 'Khách đang đi vào quán, chọn bàn và gọi món. Bán một con cá trong kho để phục vụ khách.', button: 'Phục vụ khách', panel: 'sell' },
  story: { title: '📖 Bước 4 · Mở nhật ký', body: 'Mỗi chương truyện có mục tiêu riêng. Hoàn thành để khám phá câu chuyện của Bến Nhỏ!', button: 'Đọc Chuyện Bến Nhỏ', panel: 'story' },
};

function Modal({
  title,
  children,
  onClose,
  tag,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  tag?: string;
}) {
  return (
    <div
      className="lopPhu modal-backdrop"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      onTouchEnd={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <section
        className="hop game-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dauHop modal-header">
          <div>
            {tag && <span className="modal-eyebrow">{tag}</span>}
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>
          <button className="nut-dong close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="giay modal-content">{children}</div>
      </section>
    </div>
  );
}

function StockCard({
  id,
  qty,
  onClick,
}: {
  id: FishId;
  qty: number;
  onClick: () => void;
}) {
  const f = FISH.find((f) => f.id === id)!;
  return (
    <button
      className="stock-card"
      onClick={onClick}
      title={`${f.name}: ${qty} con`}
    >
      <span className="stock-count">{qty}</span>
      <img
        className="pixel-item-icon"
        src={`/assets/pixel/seafood/${id}.png`}
        alt=""
      />
      <strong>{f.name}</strong>
    </button>
  );
}

function ShiftSummaryModal({
  earnings,
  served,
  onClose,
}: {
  earnings: number;
  served: number;
  onClose: () => void;
}) {
  const utilityCost = 10;
  const net = Math.max(0, earnings - utilityCost);
  return (
    <div className="lopPhu" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <div className="hop" style={{ maxWidth: 380 }}>
        <div className="dauHop">
          <h3>Tổng Kết Ca Đêm</h3>
          <button className="nut-dong" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div className="giay" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 44, margin: '4px 0' }}>🌙 ⭐</div>
          <div className="o" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>🍽️ Đơn phục vụ:</span>
              <strong>{served} bàn</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>🪙 Tiền khách trả:</span>
              <strong style={{ color: 'var(--g1)' }}>+{earnings} xu</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>⚡ Tiền điện nước tối nay:</span>
              <strong style={{ color: 'var(--r1)' }}>-{utilityCost} xu</strong>
            </div>
            <div style={{ borderTop: '1px dashed var(--c1)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900 }}>
              <span>Tiền lời ca này:</span>
              <span style={{ color: 'var(--w0)' }}>+{net} xu</span>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--w1)', margin: 0 }}>
            Khách chấm <b>5.0 ⭐</b>. Tiếng lành đồn xa khắp Bến Nhỏ!
          </p>
          <button className="nut to xanh" onClick={onClose}>
            🦀 Về sảnh chuẩn bị ca mới
          </button>
        </div>
      </div>
    </div>
  );
}

function DonateContent() {
  const [hasImage, setHasImage] = useState(true);
  const name = process.env.NEXT_PUBLIC_DONATE_NAME;
  return (
    <div className="donate-content">
      <div className="donate-heart">
        <Heart fill="currentColor" size={42} />
      </div>
      <h3>Ủng hộ tác giả</h3>
      <p>
        Nếu bạn yêu thích Bến Nhỏ, có thể quét mã QR dưới đây để mời tác giả một
        ly trà đá hoặc cà phê. Cảm ơn bạn rất nhiều!
      </p>
      <div className="qr-frame">
        {hasImage ? (
          <img
            src="/assets/donate-qr.png"
            alt="Mã QR ủng hộ tác giả"
            onError={() => setHasImage(false)}
          />
        ) : (
          <div className="qr-placeholder">
            <span>☕</span>
            <small>Chưa có ảnh mã QR. Đặt file vào /assets/donate-qr.png</small>
          </div>
        )}
      </div>
      {name && (
        <p className="donate-name">
          Chủ tài khoản: <strong>{name}</strong>
        </p>
      )}
      <small className="notice-line">
        Mọi khoản ủng hộ hoàn toàn tự nguyện và độc lập với game.
      </small>
    </div>
  );
}

function FishingContent({
  working,
  onCatch,
}: {
  working: boolean;
  onCatch: () => Promise<boolean>;
}) {
  const [position, setPosition] = useState(15);
  const [message, setMessage] = useState('Giữ bình tĩnh và canh đúng vạch xanh!');
  const [attempts, setAttempts] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition((p) => {
        const next = p + (Math.random() * 26 - 13);
        return Math.max(5, Math.min(95, next));
      });
    }, 180);
    return () => clearInterval(timer);
  }, []);

  const hook = async () => {
    setAttempts((a) => a + 1);
    const inSweetSpot = position >= 35 && position <= 70;
    if (!inSweetSpot) {
      setMessage('Hụt rồi! Cá đã đớp mồi nhưng tuột mất. Thử lại nào!');
      setWon(false);
      return;
    }
    const success = await onCatch();
    if (success) {
      setWon(true);
      setMessage('Dính cá rồi! Cá đã vào kho hải sản.');
    } else {
      setMessage('Cần nghỉ tay một chút rồi câu tiếp nhé!');
    }
  };

  return (
    <div className="fishing-content">
      <div className="fishing-water">
        <span className="water-wave">〰️ 〰️ 〰️</span>
        <img
          className="fisher-pixel"
          src="/assets/pixel/props/can-cau.png"
          alt="Cần câu"
        />
        <img
          className="floating-fish"
          src="/assets/pixel/seafood/ca-thu.png"
          alt="Cá thu đang bơi"
        />
        <span className="water-wave">〰️ 〰️ 〰️</span>
      </div>
      <div className="catch-meter">
        <div className="catch-good" />
        <div className="catch-marker" style={{ left: `${position}%` }} />
      </div>
      <p className={won ? 'catch-won' : 'catch-message'}>{message}</p>
      <button className="nut to vang" disabled={working} onClick={hook}>
        {working ? 'Đang kéo cá...' : '🎣 Giật cần!'}
      </button>
      <small style={{ display: 'block', marginTop: 10, fontSize: 11, color: 'var(--w2)' }}>
        Thử {attempts} lần · Mỗi lần câu thành công cần nghỉ 3 giây · Cá quý xuất hiện ở vùng biển mới.
      </small>
    </div>
  );
}

function AccountContent({
  user,
  onLogin,
  onLogout,
  working,
}: {
  user: User | null;
  onLogin: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
  working: boolean;
}) {
  const [email, setEmail] = useState('');
  if (!hasSupabaseConfig)
    return (
      <div className="account-content">
        <Info />
        <h3>Đang chơi chế độ demo</h3>
        <p>
          Dữ liệu được lưu trong trình duyệt này. Khi bạn tạo Supabase, điền
          biến môi trường và chạy SQL trong thư mục <code>supabase/migrations</code> để bật đăng nhập/lưu đám mây.
        </p>
      </div>
    );
  if (user)
    return (
      <div className="account-content">
        <UserRound size={38} />
        <h3>Đã đăng nhập</h3>
        <p>{user.email || 'Tài khoản của bạn'}</p>
        <p>Tiền ảo, kho cá và nâng cấp đã được lưu trên Supabase.</p>
        <button
          className="nut to kem"
          disabled={working}
          onClick={onLogout}
        >
          Đăng xuất
        </button>
      </div>
    );
  return (
    <form
      className="account-content"
      onSubmit={(e) => {
        e.preventDefault();
        void onLogin(email);
      }}
    >
      <LogIn size={38} />
      <h3>Lưu tiến trình lên đám mây</h3>
      <p>
        Nhận email có liên kết đăng nhập. Tiến trình cloud khởi đầu riêng, không đồng bộ dữ liệu demo.
      </p>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        required
        autoComplete="email"
        placeholder="ban@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: 10, borderRadius: 8, border: '2px solid var(--w2)', width: '100%' }}
      />
      <button className="nut to vang" disabled={working} style={{ marginTop: 10 }}>
        Gửi liên kết đăng nhập
      </button>
    </form>
  );
}

export default function GameApp() {
  const [game, setGame] = useState<GameState>(structuredClone(INITIAL_STATE));
  const [user, setUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const onAssetsReady = useCallback(() => setAssetsReady(true), []);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [chosen, setChosen] = useState<FishId>('ca-thu');
  const [tutorial, setTutorial] = useState<TutorialStep>('done');
  const [customerCount, setCustomerCount] = useState(0);
  const [unservedDepartures, setUnservedDepartures] = useState(0);
  const [servedSignal, setServedSignal] = useState(0);
  const [soundMuted, setSoundMutedState] = useState(false);
  const [ambientActive, setAmbientActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [chatterIndex, setChatterIndex] = useState(0);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [shiftEarnings, setShiftEarnings] = useState(0);
  const [shiftOrdersServed, setShiftOrdersServed] = useState(0);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setSoundMutedState(isSoundMuted());
    setAmbientActive(isAmbientEnabled());
    const interval = setInterval(() => {
      setChatterIndex((i) => (i + 1) % 5);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = useCallback(() => {
    const active = toggleSound();
    setSoundMutedState(!active);
    if (active) playSound('click');
  }, []);

  const handleToggleAmbient = useCallback(() => {
    const next = toggleAmbient();
    setAmbientActive(next);
    playSound('click');
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      setPanel(next ? 'pause' : null);
      return next;
    });
    playSound('click');
  }, []);

  const handleClosePause = useCallback(() => {
    setIsPaused(false);
    setPanel(null);
    playSound('click');
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setToast(''), 3400);
  }, []);

  const fetchCloud = useCallback(async () => {
    const db = getSupabase();
    if (!db) return;
    const { data, error } = await db.rpc('get_game_state');
    if (error) throw error;
    setGame(parseGameState(data));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) setGame(parseGameState(JSON.parse(saved)));
    } catch {
      /* fresh save */
    }
    setReady(true);
    try {
      if (localStorage.getItem(TUTORIAL_KEY) !== 'done') setTutorial('intro');
    } catch {
      /* blocked storage */
    }
    const db = getSupabase();
    if (db) {
      void db.auth.getUser().then(({ data }) => {
        setUser(data.user);
        if (data.user)
          void fetchCloud().catch((e) => notify(`Supabase: ${e.message}`));
      });
      const { data: subscription } = db.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          setTimeout(() => void fetchCloud().catch((e) => notify(`Supabase: ${e.message}`)), 0);
        } else {
          try {
            const local = localStorage.getItem(LOCAL_KEY);
            setGame(parseGameState(local ? JSON.parse(local) : null));
          } catch {
            setGame(structuredClone(INITIAL_STATE));
          }
        }
      });
      return () => subscription.subscription.unsubscribe();
    }
  }, [fetchCloud, notify]);

  useEffect(() => {
    if (ready && !user) localStorage.setItem(LOCAL_KEY, JSON.stringify(game));
  }, [game, ready, user]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else if (process.env.NODE_ENV !== 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const k of keys) void caches.delete(k);
        });
      }
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => () => clearTimeout(notificationTimer.current), []);

  const transact = useCallback(
    async (action: Action, item?: FishId): Promise<boolean> => {
      if (busy) return false;
      setBusy(true);
      try {
        if (user && getSupabase()) {
          const { data, error } = await getSupabase()!.rpc('game_action', {
            p_action: action,
            p_item: item ?? null,
          });
          if (error) throw error;
          setGame(parseGameState(data));
        } else {
          const next = applyLocalAction(game, action, item);
          setGame(next);
        }
        const messages: Record<Action, string> = {
          fish: '🎣 Cá mới đã vào kho!',
          buy: '📦 Nhập hàng thành công!',
          sell: '🪙 Khách đã mua cá!',
          upgrade: '🏡 Quán đã được nâng cấp!',
          unlock: '🗺️ Mở khóa vùng biển mới!',
        };
        notify(messages[action]);
        playSound(
          action === 'fish'
            ? 'catch'
            : action === 'sell'
              ? 'coin'
              : action === 'upgrade' || action === 'unlock'
                ? 'upgrade'
                : 'click',
        );
        if (action === 'sell') {
          setServedSignal((v) => v + 1);
          setShiftOrdersServed((v) => v + 1);
          const f = FISH.find((f) => f.id === (item || chosen))!;
          setShiftEarnings((v) => v + (f ? f.sell + game.upgrades * 5 : 50));
        }
        setTutorial((step) =>
          action === 'fish' && step === 'fish'
            ? 'market'
            : action === 'buy' && step === 'market'
              ? 'sell'
              : action === 'sell' && step === 'sell'
                ? 'story'
                : step,
        );
        return true;
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Giao dịch chưa thành công');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, game, user, notify, chosen],
  );

  const login = async (email: string) => {
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    notify(
      error
        ? error.message
        : '📩 Đã gửi email đăng nhập. Kiểm tra hộp thư nhé!',
    );
  };

  const logout = async () => {
    setBusy(true);
    await getSupabase()?.auth.signOut();
    setBusy(false);
    setPanel(null);
    notify('Đã đăng xuất!');
  };

  const finishGuide = () => {
    setTutorial('done');
    try {
      localStorage.setItem(TUTORIAL_KEY, 'done');
    } catch {}
  };

  const guideAction = () => {
    if (tutorial === 'done') return;
    if (tutorial === 'intro') {
      setTutorial('fish');
      return;
    }
    if (tutorial === 'story') {
      setPanel('story');
      finishGuide();
      return;
    }
    setPanel(GUIDE[tutorial].panel);
  };

  const handleStartShift = () => {
    setIsShiftActive(true);
    setShiftEarnings(0);
    setShiftOrdersServed(0);
    playSound('click');
    notify('🦀 Quán mở cửa! Khách đang bước vào...');
  };

  const handleCloseShift = () => {
    setIsShiftActive(false);
    setShowShiftSummary(true);
    playSound('coin');
  };

  const openTarget = (t: HarborTarget) => setPanel(t);
  const chosenFish = FISH.find((f) => f.id === chosen)!;
  const restaurantWarnings = getRestaurantWarnings({
    waiting: customerCount,
    stock: totalFish(game),
    leftUnserved: unservedDepartures,
    tables: Math.min(5, 2 + game.upgrades),
  });

  return (
    <main className="site-bg">
      {!assetsReady && <GameLoading onReady={onAssetsReady} />}
      <div className="game-shell">
        {/* Authentic Top HUD matching ocdem.dreek.site */}
        <header className="hud">
          <div
            className="chip chip-gold"
            title="Tiền mặt"
          >
            💼 <b>{formatXu(game.coins)}</b>
          </div>
          <button
            className="chip chip-gem"
            onClick={() => setPanel('donate')}
            title="Đá quý / Nạp ngọc"
          >
            💎 <b>{game.gems} (+)</b>
          </button>
          <div className="chip chip-coin" title="Điểm đánh giá của khách">
            🪙 <b>5.00</b>
          </div>
          <div className="chip chip-shift" title="Ca bán đêm">
            ⏰ <b>{isShiftActive ? '21:18' : `Đêm ${game.upgrades + 1} (+100k)`}</b>
            <span className="thanh">
              <i style={{ width: isShiftActive ? '65%' : '30%' }} />
            </span>
          </div>
          {isShiftActive && (
            <button
              className="chip chip-btn"
              onClick={handleTogglePause}
              title="Tạm dừng ca bán"
            >
              ⏸️
            </button>
          )}
          {restaurantWarnings.length > 0 && (
            <button
              className="chip chip-btn"
              onClick={() => setPanel('alerts')}
              title={`${restaurantWarnings.length} thông báo`}
            >
              ⚠️
            </button>
          )}
          <button
            className="chip chip-btn"
            onClick={() => setPanel('help')}
            title="Cài đặt & Hướng dẫn"
          >
            ⚙️
          </button>
        </header>

        {/* Courtyard World Area */}
        <div className="world-box">
          <HarborStage
            onTarget={openTarget}
            onCustomerCount={setCustomerCount}
            onCustomerExitUnserved={() => setUnservedDepartures((v) => v + 1)}
            servedSignal={servedSignal}
            upgrades={game.upgrades}
            isPaused={isPaused || panel === 'pause'}
            isShiftActive={isShiftActive}
          />

          {/* Mode 1: Pre-shift Center 'MỞ CỬA' Overlay */}
          {!isShiftActive && (
            <>
              <div className="side-floating-left">
                <button
                  className="icon-badge-btn"
                  onClick={() => setPanel('upgrade')}
                  title="Nâng cấp bàn ghế"
                >
                  🪑
                  <span className="badge-count">1</span>
                </button>
                <button
                  className="icon-badge-btn"
                  onClick={() => setPanel('market')}
                  title="Chợ hải sản"
                >
                  🏪
                </button>
              </div>

              <div className="side-floating-actions">
                <button
                  className="pill-action-btn"
                  onClick={() => setPanel('upgrade')}
                >
                  💎 Trang trí
                </button>
                <button
                  className="pill-action-btn"
                  onClick={() => setPanel('help')}
                >
                  ❓ Cẩm nang
                </button>
              </div>

              <div className="moCua">
                <button
                  className="nut to xanh moCuaNut"
                  onClick={handleStartShift}
                >
                  🦀 MỞ CỬA
                </button>
                <div className="phuDeTag">
                  19:00 → 24:00 · một mình bạn chạy
                </div>
              </div>
            </>
          )}

          {/* Mode 2: Shift Active Live Customer Chatter Ticker */}
          {isShiftActive && (
            <div className="guest-chatter-ticker" role="status" aria-live="polite">
              <span style={{ fontSize: 16 }}>💬</span>
              <span className="chatter-quote">
                {customerChat('waiting', chatterIndex)}
              </span>
              {customerCount > 0 && (
                <button
                  className="chatter-order-pill"
                  onClick={() => setPanel('sell')}
                >
                  🍽️ {customerCount} bàn đợi món
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mode 1 vs Mode 2 Bottom Layout */}
        {!isShiftActive ? (
          /* Lobby Dashboard matching screenshot 6 */
          <div className="lobby-dashboard">
            {/* Profile Row (.appHoSo) */}
            <div className="appHoSo" onClick={() => setPanel('account')}>
              <div className="avatar-box">👒</div>
              <div className="user-meta">
                <div className="user-name-line">
                  <span className="user-name">
                    {user?.email ? user.email.split('@')[0] : 'Quán Hải Sản'}
                  </span>
                  <span className="user-link">hồ sơ</span>
                </div>
                <div className="chips-line">
                  <span className="event-badge">🌊 Bến Nhỏ</span>
                  <span className="event-badge">Chương {currentChapter(game)}</span>
                </div>
              </div>
            </div>

            {/* Weather / Harbor Ticker (.dongLoi) */}
            <div className="dongLoi" role="status">
              🌧️ <b>Đài cảng:</b> Bến Nhỏ biển êm, 28°, gió nhẹ. Khách thèm cá nướng, tôm muối ớt, mực hấp!
            </div>

            {/* 3 Advice & Cost Cards (.o) */}
            <div className="lobby-cards-container">
              <div className="o lobby-card">
                <div className="lobby-card-icon">👩‍🍳</div>
                <div className="lobby-card-body">
                  <div className="lobby-card-desc">
                    Khách chấm sao để xếp hạng quán: phục vụ nhanh và đủ món để nhận 5.0 sao. Điểm cao khách sẽ ghé đông hơn.
                  </div>
                </div>
              </div>

              <div className="o lobby-card">
                <div className="lobby-card-icon">💵</div>
                <div className="lobby-card-body">
                  <div className="lobby-card-title">Tiền bến bãi tối nay · 10K</div>
                  <div className="lobby-card-desc">
                    Mặt bằng 0k, điện nước 10k: tổng 10k, trừ lúc đóng ca. Tiền lãi dùng mua thêm bàn ghế và nguyên liệu.
                  </div>
                </div>
              </div>

              <div className="o lobby-card">
                <div className="lobby-card-icon">📖</div>
                <div className="lobby-card-body">
                  <div className="lobby-card-title">Ông ngoại dặn</div>
                  <div className="lobby-card-desc">
                    Bến cảng ghe về sớm, nhớ chuẩn bị sẵn hải sản trong kho. Đừng để bếp trống lúc khách vào đông nhé con!
                  </div>
                </div>
              </div>

              <div className="lobby-footer-note">
                TỐI NAY Bến cảng vào đêm. Chúc quán mua may bán đắt!
              </div>
            </div>

            {/* 12-App Grid (.vienHang) matching screenshot 6 */}
            <nav className="vienHang" aria-label="Ứng dụng quán">
              <button className="app-item-btn" onClick={() => setPanel('market')}>
                <span className="app-item-icon">🧺</span>
                <span className="app-item-label">Nhập hàng</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('fish')}>
                <span className="app-item-icon">🎣</span>
                <span className="app-item-label">Câu cá</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('sell')}>
                <span className="app-item-icon">🍽️</span>
                <span className="app-item-label">Bán cá</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('upgrade')}>
                <span className="app-item-icon">🔨</span>
                <span className="app-item-label">Nâng cấp</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('explore')}>
                <span className="app-item-icon">🗺️</span>
                <span className="app-item-label">Khám phá</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('story')}>
                <span className="app-item-icon">📖</span>
                <span className="app-item-label">Chuyện cũ</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('alerts')}>
                <span className="app-item-icon">📋</span>
                <span className="app-item-label">Việc đêm</span>
              </button>
              <button className="app-item-btn" onClick={() => notify('✨ Điểm danh thành công! Đã nhận quà ngày mới.')}>
                <span className="app-item-icon">📅</span>
                <span className="app-item-label">Điểm danh</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('account')}>
                <span className="app-item-icon">👤</span>
                <span className="app-item-label">Tài khoản</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('donate')}>
                <span className="app-item-icon">💎</span>
                <span className="app-item-label">Nạp ngọc</span>
              </button>
              <button className="app-item-btn" onClick={handleTogglePause}>
                <span className="app-item-icon">⏸️</span>
                <span className="app-item-label">Tạm dừng</span>
              </button>
              <button className="app-item-btn" onClick={() => setPanel('help')}>
                <span className="app-item-icon">⚙️</span>
                <span className="app-item-label">Cài đặt</span>
              </button>
            </nav>
          </div>
        ) : (
          /* Active Shift Bar & Stock Shelf */
          <div className="active-shift-bar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--c4)', fontSize: 13, fontWeight: 800 }}>
              <span>📦 Tủ hải sản sẵn có ({totalFish(game)} con)</span>
              <span style={{ color: 'var(--y2)' }}>Đã phục vụ: {shiftOrdersServed} bàn</span>
            </div>
            <div className="stock-scroll">
              {FISH.map((f) => (
                <StockCard
                  key={f.id}
                  id={f.id}
                  qty={game.inventory[f.id]}
                  onClick={() => {
                    setChosen(f.id);
                    setPanel('sell');
                  }}
                />
              ))}
            </div>
            <div className="active-shift-actions">
              <button
                className="nut to vang"
                onClick={() => setPanel('sell')}
              >
                🍽️ Phục vụ khách
              </button>
              <button
                className="nut to do"
                onClick={handleCloseShift}
              >
                🚪 Đóng cửa / Chốt ca
              </button>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}

        {/* PWA Install Pill */}
        {installPrompt && (
          <button
            className="pill-action-btn"
            style={{ position: 'fixed', top: 52, right: 10, zIndex: 999 }}
            onClick={async () => {
              const e = installPrompt as Event & { prompt?: () => Promise<void> };
              if (e.prompt) await e.prompt();
              setInstallPrompt(null);
            }}
          >
            📲 Cài ứng dụng
          </button>
        )}
      </div>

      {/* Shift Summary Modal */}
      {showShiftSummary && (
        <ShiftSummaryModal
          earnings={shiftEarnings}
          served={shiftOrdersServed}
          onClose={() => setShowShiftSummary(false)}
        />
      )}

      {/* Story Modal */}
      {panel === 'story' && (
        <Modal
          title="Chuyện Bến Nhỏ"
          tag={`CHƯƠNG ${currentChapter(game)} · NHẬT KÝ LÀNG CHÀI`}
          onClose={() => setPanel(null)}
        >
          <StoryPanel game={game} />
        </Modal>
      )}

      {/* Pause Modal */}
      {panel === 'pause' && (
        <Modal
          title="Tạm dừng quán"
          tag="NGHỈ TAY GIỮA CA"
          onClose={handleClosePause}
        >
          <div className="pause-content">
            <div className="pause-intro">
              <p>
                ⏸️ <strong>Quán đang tạm dừng:</strong> khách đứng yên, Mai dừng bưng bê, đồng hồ không chạy.
              </p>
            </div>
            <button className="nut to xanh" onClick={handleClosePause}>
              <Play size={20} fill="currentColor" /> TIẾP TỤC
            </button>
            <div className="pause-stats-card">
              <h4>📋 Tình hình ca bán</h4>
              <div className="pause-stats-grid">
                <div className="pause-stat-item">
                  <small>Bàn phục vụ</small>
                  <strong>{Math.min(5, 2 + game.upgrades)} bàn</strong>
                </div>
                <div className="pause-stat-item">
                  <small>Đang chờ món</small>
                  <strong className={customerCount > 0 ? 'highlight' : ''}>
                    {customerCount} bàn
                  </strong>
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
                <button
                  className={`audio-pill-btn ${!soundMuted ? 'active' : ''}`}
                  onClick={handleToggleSound}
                >
                  {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  <span>{soundMuted ? 'Hiệu ứng: TẮT' : 'Hiệu ứng: BẬT'}</span>
                </button>
                <button
                  className={`audio-pill-btn ${ambientActive ? 'active' : ''}`}
                  onClick={handleToggleAmbient}
                >
                  <span>🌊</span>
                  <span>{ambientActive ? 'Sóng biển: BẬT' : 'Sóng biển: TẮT'}</span>
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className="nut to kem"
                onClick={() => setPanel('story')}
              >
                📖 Nhật ký
              </button>
              <button
                className="nut to kem"
                onClick={() => setPanel('help')}
              >
                ⚙️ Hướng dẫn
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fish Modal */}
      {panel === 'fish' && (
        <Modal
          title="Câu cá ngoài khơi"
          tag={`VÙNG BIỂN ${game.area}`}
          onClose={() => setPanel(null)}
        >
          <FishingContent working={busy} onCatch={() => transact('fish')} />
        </Modal>
      )}

      {/* Market Modal */}
      {panel === 'market' && (
        <Modal
          title="Chợ Hải Sản"
          tag="NHẬP HÀNG BẰNG XU"
          onClose={() => setPanel(null)}
        >
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '0 0 12px' }}>
            Nhập hải sản từ chợ ven biển. Giá nhập cao hơn giá bán để khuyến khích tự câu cá.
          </p>
          <div className="trade-list">
            {FISH.map((f) => (
              <div className="trade-row" key={f.id}>
                <img
                  className="pixel-trade-icon"
                  src={`/assets/pixel/seafood/${f.id}.png`}
                  alt=""
                />
                <div className="trade-name">
                  <strong>{f.name}</strong>
                  <small>
                    {f.rarity} · Kho: {game.inventory[f.id]}
                  </small>
                </div>
                <button
                  className="nut kem"
                  disabled={busy || game.coins < f.buy}
                  onClick={() => void transact('buy', f.id)}
                >
                  Nhập {f.buy} xu
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Sell Modal */}
      {panel === 'sell' && (
        <Modal
          title="Bán hải sản"
          tag="KHÁCH HÀNG ĐANG ĐỢI"
          onClose={() => setPanel(null)}
        >
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '0 0 12px' }}>
            Chọn cá trong kho để bán cho khách. Mỗi lần bán nhận xu và kinh nghiệm.
          </p>
          <div className="selected-fish">
            <img
              className="pixel-item-icon"
              src={`/assets/pixel/seafood/${chosen}.png`}
              alt=""
            />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, color: 'var(--w0)' }}>{chosenFish.name}</strong>
              <small style={{ display: 'block', color: 'var(--w2)', fontSize: 11 }}>
                Giá bán: {chosenFish.sell + game.upgrades * 5} xu
              </small>
            </div>
          </div>
          <div className="trade-list">
            {FISH.map((f) => (
              <div
                className={`trade-row ${chosen === f.id ? 'selected' : ''}`}
                key={f.id}
              >
                <img
                  className="pixel-trade-icon"
                  src={`/assets/pixel/seafood/${f.id}.png`}
                  alt=""
                />
                <div className="trade-name">
                  <strong>{f.name}</strong>
                  <small>Trong kho: {game.inventory[f.id]} con</small>
                </div>
                <button
                  className="nut vang"
                  disabled={busy || !game.inventory[f.id]}
                  onClick={() => {
                    setChosen(f.id);
                    void transact('sell', f.id);
                  }}
                >
                  Bán +{f.sell + game.upgrades * 5} xu
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Upgrade Modal */}
      {panel === 'upgrade' && (
        <Modal
          title="Nâng cấp quán"
          tag="XÂY DỰNG CƠ NGƠI"
          onClose={() => setPanel(null)}
        >
          <div className="feature-card">
            <img
              style={{ width: 96, height: 96, objectFit: 'contain', margin: '0 auto' }}
              src="/assets/pixel/props/tu-hai-san.png"
              alt="Tủ hải sản"
            />
            <h3>Quán cấp {game.upgrades + 1}</h3>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)' }}>
              Mỗi lần nâng cấp mở thêm <b>1 bàn phục vụ</b> ngay trên sân quán (tối đa 5 bàn) và tăng giá bán hải sản thêm 5 xu.
            </p>
            <div style={{ padding: '6px 12px', background: 'var(--c3)', borderRadius: 8, display: 'inline-block', margin: '6px 0', fontSize: 12, fontWeight: 800, color: 'var(--w0)' }}>
              Đang có {Math.min(5, 2 + game.upgrades)} bàn phục vụ · +{game.upgrades * 5} xu / đơn
            </div>
          </div>
          <button
            className="nut to vang"
            disabled={busy || game.coins < UPGRADE_COST(game.upgrades)}
            onClick={() => void transact('upgrade')}
          >
            ⬆️ Nâng cấp · {formatXu(UPGRADE_COST(game.upgrades))} xu
          </button>
        </Modal>
      )}

      {/* Explore Modal */}
      {panel === 'explore' && (
        <Modal
          title="Khám phá đại dương"
          tag="BẢN ĐỒ VÙNG BIỂN"
          onClose={() => setPanel(null)}
        >
          <div className="explore-list">
            {['Vịnh Bình Minh', 'Rạn San Hô', 'Biển Xa'].map((n, i) => (
              <div
                className={`explore-item ${i + 1 <= game.area ? 'unlocked' : ''}`}
                key={n}
              >
                <div style={{ fontSize: 28 }}>{['🏝️', '🪸', '⛵'][i]}</div>
                <div style={{ flex: 1 }}>
                  <strong>{n}</strong>
                  <small style={{ color: 'var(--w2)' }}>
                    {i + 1 <= game.area ? 'Đã mở khóa' : 'Chưa khám phá'}
                  </small>
                </div>
                <span>{i + 1 <= game.area ? '✓' : '🔒'}</span>
              </div>
            ))}
          </div>
          <button
            className="nut to vang"
            disabled={busy || game.area >= 3 || game.coins < AREA_COST(game.area)}
            onClick={() => void transact('unlock')}
          >
            {game.area >= 3
              ? 'Đã khám phá hết'
              : '🗺️ Mở vùng biển mới · ' + formatXu(AREA_COST(game.area)) + ' xu'}
          </button>
        </Modal>
      )}

      {/* Donate Modal */}
      {panel === 'donate' && (
        <Modal
          title="Ủng hộ tác giả"
          tag="CẢM ƠN BẠN 💛"
          onClose={() => setPanel(null)}
        >
          <DonateContent />
        </Modal>
      )}

      {/* Account Modal */}
      {panel === 'account' && (
        <Modal
          title="Tài khoản người chơi"
          tag="LƯU TIẾN TRÌNH"
          onClose={() => setPanel(null)}
        >
          <AccountContent
            user={user}
            onLogin={login}
            onLogout={logout}
            working={busy}
          />
        </Modal>
      )}

      {/* Alerts Modal */}
      {panel === 'alerts' && (
        <Modal
          title="Cảnh báo trong quán"
          tag="THÔNG BÁO TỪ BẾN NHỎ"
          onClose={() => setPanel(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {restaurantWarnings.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 14, color: 'var(--w1)' }}>
                🌿 Quán đang hoạt động ổn định. Chưa có việc gấp cần xử lý!
              </p>
            ) : (
              restaurantWarnings.map((a) => (
                <div
                  key={a.id}
                  className="o"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>
                      {a.level === 'urgent' ? '🔴' : a.level === 'warning' ? '🟠' : '💬'}{' '}
                      {a.title}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--w1)' }}>
                      {a.detail}
                    </p>
                  </div>
                  {a.target ? (
                    <button className="nut kem" onClick={() => setPanel(a.target)}>
                      Xử lý
                    </button>
                  ) : (
                    <button className="nut kem" onClick={() => setUnservedDepartures(0)}>
                      Đã xem
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Help Modal */}
      {panel === 'help' && (
        <Modal title="Hướng dẫn & Cài đặt" onClose={() => setPanel(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="audio-toggle-group">
              <button
                className={`audio-pill-btn ${!soundMuted ? 'active' : ''}`}
                onClick={handleToggleSound}
              >
                {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span>{soundMuted ? 'Âm thanh: TẮT' : 'Âm thanh: BẬT'}</span>
              </button>
              <button
                className={`audio-pill-btn ${ambientActive ? 'active' : ''}`}
                onClick={handleToggleAmbient}
              >
                <span>🌊</span>
                <span>{ambientActive ? 'Sóng biển: BẬT' : 'Sóng biển: TẮT'}</span>
              </button>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '4px 0' }}>
              🎣 <strong>Câu cá:</strong> canh lực, giật cần để nhận cá vào kho.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '4px 0' }}>
              🧺 <strong>Nhập hàng:</strong> dùng xu ảo để mua hải sản từ chợ.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '4px 0' }}>
              🍽️ <strong>Bán cá:</strong> mở cửa phục vụ khách, bán cá để kiếm xu và tăng cấp.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--w1)', margin: '4px 0' }}>
              🏡 <strong>Nâng cấp:</strong> mở rộng quán để tăng doanh thu và thêm bàn ghế.
            </p>
            <button
              className="nut to kem"
              onClick={() => setPanel('account')}
            >
              👤 Tài khoản / Lưu đám mây
            </button>
            <button
              className="nut to kem"
              onClick={() => {
                setPanel(null);
                setTutorial('intro');
                localStorage.removeItem(TUTORIAL_KEY);
              }}
            >
              ✨ Xem lại hướng dẫn đầu game
            </button>
            <p style={{ fontSize: 10, color: 'var(--w3)', textAlign: 'center', margin: '6px 0 0' }}>
              {ACTION_PLACEHOLDER}
            </p>
          </div>
        </Modal>
      )}

      {/* Tutorial Coach */}
      {ready && assetsReady && tutorial !== 'done' && panel === null && (
        <div className="coach-banner" role="region" aria-live="polite">
          <div className="coach-header">
            <strong>{GUIDE[tutorial].title}</strong>
            <span style={{ fontSize: 11, color: '#c4afc9' }}>Hướng dẫn</span>
          </div>
          <p>{GUIDE[tutorial].body}</p>
          <div className="coach-controls">
            <button onClick={guideAction}>{GUIDE[tutorial].button}</button>
            <button className="skip" onClick={finishGuide}>
              Bỏ qua
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
