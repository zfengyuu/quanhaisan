import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root=new URL('../public/assets/pixel/',import.meta.url);
const cast=JSON.parse(readFileSync(new URL('character-manifest.json',root),'utf8'));
const expected=['ngu-choi','chu-tam','co-sau','dau-bep','phuc-vu','khach-nam','khach-nu'];
test('approved 7-character cast has 4 directions and valid 4x4 PNG sprites',()=>{
  assert.deepEqual(cast.map(a=>a.id),expected);
  for(const c of cast){
    assert.equal(c.frameWidth,64);assert.equal(c.frameHeight,96);
    assert.equal(c.framesPerDirection,4);assert.equal(c.directions.length,4);
    const data=readFileSync(new URL(`characters/${c.id}.png`,root));
    assert.equal(data.readUInt32BE(16),256);assert.equal(data.readUInt32BE(20),384);
  }
});
test('concept portraits exist for each main cast member',()=>{
 for(const name of expected.slice(0,6)){
   assert.ok(statSync(new URL(`portraits/${name}.webp`,root)).size>1000);
 }
});
