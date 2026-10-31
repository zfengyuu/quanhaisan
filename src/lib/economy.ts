export type FishId = 'ca-thu' | 'ca-ngu' | 'tom' | 'muc' | 'so' | 'cua' | 'hau';
export type Action = 'fish' | 'buy' | 'sell' | 'upgrade' | 'unlock';
export type GameState = {
  coins: number;
  gems: number;
  level: number;
  xp: number;
  upgrades: number;
  area: number;
  inventory: Record<FishId, number>;
  lastFishAt: number;
  lifetimeCaught: number;
  lifetimeSold: number;
};
export type FishDef = { id: FishId; name: string; icon: string; buy: number; sell: number; rarity: string; color: string };
export const FISH: FishDef[] = [
  {id:'ca-thu',name:'Cá thu',icon:'🐟',buy:95,sell:60,rarity:'Phổ biến',color:'#70b9d5'},
  {id:'ca-ngu',name:'Cá ngừ',icon:'🐠',buy:145,sell:90,rarity:'Hiếm',color:'#608ccd'},
  {id:'tom',name:'Tôm',icon:'🦐',buy:80,sell:50,rarity:'Phổ biến',color:'#fb9882'},
  {id:'muc',name:'Mực',icon:'🦑',buy:125,sell:80,rarity:'Hiếm',color:'#e7b9d6'},
  {id:'so',name:'Sò',icon:'🐚',buy:55,sell:35,rarity:'Phổ biến',color:'#e3c7a8'},
  {id:'cua',name:'Cua',icon:'🦀',buy:175,sell:110,rarity:'Quý hiếm',color:'#ef8666'},
  {id:'hau',name:'Hàu',icon:'🦪',buy:110,sell:70,rarity:'Hiếm',color:'#a6a9b4'},
];
export const INITIAL_STATE: GameState = {
  coins: 1200,gems: 22,level: 1,xp: 0,upgrades: 0,area: 1,
  inventory: {'ca-thu':3,'ca-ngu':1,tom:4,muc:1,so:6,cua:0,hau:2},
  lastFishAt:0,lifetimeCaught:0,lifetimeSold:0,
};
export const UPGRADE_COST = (count:number) => 300 + count * 250;
export const AREA_COST = (area:number) => 800 * area;
export const formatXu = (n:number) => new Intl.NumberFormat('vi-VN').format(n);
export const totalFish = (s:GameState) => FISH.reduce((n,f)=>n+(s.inventory[f.id]||0),0);
export const levelForXp = (xp:number) => Math.floor(xp/100)+1;
export function applyLocalAction(old:GameState, action:Action, item?:FishId, now=Date.now(), roll=Math.random()): GameState {
  const s:GameState = {...old,inventory:{...old.inventory}};
  const f = FISH.find(f=>f.id===item);
  switch(action) {
    case 'fish': {
      if(now-s.lastFishAt < 3000) throw new Error('Cá chưa cắn câu, đợi 3 giây nhé!');
      const pool:FishId[] = s.area===1 ? ['ca-thu','ca-thu','tom','so','ca-ngu'] : ['ca-thu','tom','so','ca-ngu','muc','cua','hau'];
      const caught=pool[Math.min(pool.length-1,Math.floor(roll*pool.length))];
      s.inventory[caught] += 1;
      s.lastFishAt=now;s.lifetimeCaught+=1;s.xp+=15;
      break;
    }
    case 'buy': {
      if(!f) throw new Error('Mặt hàng không hợp lệ.');
      if(s.coins<f.buy) throw new Error('Không đủ xu nhập hàng!');
      s.coins-=f.buy;s.inventory[f.id]+=1;break;
    }
    case 'sell': {
      if(!f) throw new Error('Mặt hàng không hợp lệ.');
      if(s.inventory[f.id]<1) throw new Error('Kho đã hết loại hải sản này!');
      s.inventory[f.id]-=1;s.coins+=f.sell+(s.upgrades*5);s.xp+=10;s.lifetimeSold+=1;break;
    }
    case 'upgrade': {
      const cost=UPGRADE_COST(s.upgrades);
      if(s.coins<cost) throw new Error('Chưa đủ xu để nâng cấp!');
      s.coins-=cost;s.upgrades+=1;s.xp+=30;break;
    }
    case 'unlock': {
      if(s.area>=3) throw new Error('Bạn đã mở hết vùng biển trong MVP.');
      const cost=AREA_COST(s.area);
      if(s.coins<cost) throw new Error('Chưa đủ xu để mở vùng biển!');
      s.coins-=cost;s.area+=1;s.xp+=50;break;
    }
    default: throw new Error('Hành động không hợp lệ.');
  }
  s.level=levelForXp(s.xp);return s;
}
export function parseGameState(value:unknown):GameState {
  if(!value || typeof value !== 'object')return structuredClone(INITIAL_STATE);
  const v = value as Partial<GameState>;
  return {
    ...INITIAL_STATE,
    ...Object.fromEntries(['coins','gems','level','xp','upgrades','area','lastFishAt','lifetimeCaught','lifetimeSold'].map(k => {
      const n=Number((v as unknown as Record<string,unknown>)[k]);
      return [k, Number.isFinite(n) && n>=0 ? n : (INITIAL_STATE as unknown as Record<string,number>)[k]];
    })),
    inventory: Object.fromEntries(FISH.map(f=>[f.id, Math.max(0,Math.floor(Number(v.inventory?.[f.id])||0))])) as GameState['inventory'],
  };
}
