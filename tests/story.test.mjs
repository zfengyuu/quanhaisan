import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE } from '../src/lib/economy.ts';
import {STORY_CHAPTERS,chapterComplete,currentChapter} from '../src/lib/story.ts';
const state=()=>structuredClone(INITIAL_STATE);
test('a new player begins at chapter 1',()=>assert.equal(currentChapter(state()),1));
test('chapter 2 unlocks only after fishing and selling',()=>{const s=state();s.lifetimeCaught=3;assert.equal(currentChapter(s),1);s.lifetimeSold=2;assert.equal(currentChapter(s),2);});
test('story milestones unlock sequentially',()=>{const s=state();Object.assign(s,{lifetimeCaught:20,lifetimeSold:20,upgrades:2,area:3});assert.equal(currentChapter(s),5);assert.equal(chapterComplete(s,STORY_CHAPTERS[4]),true);});
test('finishing later objectives without early ones never skips chapter',()=>{const s=state();Object.assign(s,{lifetimeCaught:30,upgrades:3,area:3});assert.equal(currentChapter(s),1);});
