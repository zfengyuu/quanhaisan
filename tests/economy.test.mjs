import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,applyLocalAction,UPGRADE_COST,AREA_COST,parseGameState} from '../src/lib/economy.ts';
const initial=()=>structuredClone(INITIAL_STATE);
test('fishing adds fish/xp without mutating prior state',()=>{
 const a=initial();const b=applyLocalAction(a,'fish',undefined,10000,0);
 assert.equal(b.inventory['ca-thu'],4);assert.equal(b.xp,15);assert.equal(a.inventory['ca-thu'],3);
});
test('fishing cooldown is enforced',()=>{
 const a=applyLocalAction(initial(),'fish',undefined,10000,0);
 assert.throws(()=>applyLocalAction(a,'fish',undefined,11000,0),/đợi/);
});
test('buy and sell only use virtual coins',()=>{
 const a=applyLocalAction(initial(),'buy','tom');const b=applyLocalAction(a,'sell','tom');
 assert.equal(b.coins,1170);assert.equal(b.inventory.tom,4);
});
test('insufficient coins and stock are rejected',()=>{
 const a={...initial(),coins:0,inventory:{...INITIAL_STATE.inventory,cua:0}};
 assert.throws(()=>applyLocalAction(a,'buy','cua'),/Không đủ/);
 assert.throws(()=>applyLocalAction(a,'sell','cua'),/Kho/);
});
test('upgrade and unlock require coins',()=>{
 const a=applyLocalAction(initial(),'upgrade');assert.equal(a.coins,1200-UPGRADE_COST(0));
 const b=applyLocalAction(a,'unlock');assert.equal(b.coins,a.coins-AREA_COST(1));
});
test('parseGameState tolerates malformed local saves',()=>{
 const s=parseGameState({coins:-5,inventory:{tom:'3',cua:-100}});
 assert.equal(s.coins,1200);assert.equal(s.inventory.tom,3);assert.equal(s.inventory.cua,0);
});
