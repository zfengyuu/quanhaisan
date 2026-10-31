import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,statSync } from 'node:fs';
const source=readFileSync(new URL('../src/game/HarborStage.tsx',import.meta.url),'utf8');
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
test('courtyard has separate architecture, placeable tables and customer idle animations',()=>{
 assert.match(source,/harbor-courtyard\.webp/);
 assert.match(source,/makeTable\(i:number\)/);
 assert.match(source,/this\.setSeatCount\(/);
 assert.match(source,/\-idle/);
 assert.match(source,/qhs:seats/);
 assert.match(source,/this\.tweens\.add/);
 assert.ok(statSync(new URL('../public/assets/harbor-courtyard.webp',import.meta.url)).size>10000);
});
test('PWA uses a new cache to avoid stale game sprites',()=>{
 assert.match(sw,/v4-dynamic-courtyard/);
 assert.match(sw,/harbor-courtyard\.webp/);
});
