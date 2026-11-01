import test from 'node:test';
import assert from 'node:assert/strict';
import {customerChat,getRestaurantWarnings} from '../src/lib/customerExperience.ts';

test('customer speech cycles predictably without undefined',()=>{
 assert.match(customerChat('waiting',0),/cá|món|Mùi|gió|thực đơn/i);
 assert.equal(customerChat('waiting',5),customerChat('waiting',0));
 assert.ok(customerChat('served',2).length>0);
});
test('no warnings in a calm, stocked restaurant',()=>{
 assert.deepEqual(getRestaurantWarnings({waiting:0,stock:5,leftUnserved:0,tables:2}),[]);
});
test('real conditions produce specific, actionable alerts',()=>{
 const a=getRestaurantWarnings({waiting:3,stock:0,leftUnserved:1,tables:2});
 assert.deepEqual(a.map(x=>x.id),['departures','orders','inventory','crowded']);
 assert.equal(a[0].level,'urgent');
 assert.equal(a[2].target,'market');
});
test('negative counters are clamped',()=>{
 assert.deepEqual(getRestaurantWarnings({waiting:-4,stock:9,leftUnserved:-2,tables:0}),[]);
});
