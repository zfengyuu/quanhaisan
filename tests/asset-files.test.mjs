import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root=join(process.cwd(),'public');
const catalog=JSON.parse(readFileSync(join(root,'assets/pixel/catalog.json'),'utf8'));
test('asset catalog references real nonempty sprite files',()=>{
 const images=Object.values(catalog).flat(); assert.equal(images.length,28);
 for(const asset of images){assert.ok(statSync(join(root,asset)).size>100,asset)}
});
test('all characters are uniform 4x4 sprite sheets with 64x96 frame cells',()=>{
 const chars=catalog.characters;
 for(const f of chars){const png=readFileSync(join(root,f));assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),384)}
});
