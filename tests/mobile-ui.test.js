import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../engine.js';
import {craftingHTML} from '../crafting-ui.js';
import {missionBoardHTML} from '../mission-ui.js';
test('mobile crafting separates list and detail while retaining ingredient navigation and immutable state',()=>{const s=freshState(),before=structuredClone(s);const list=craftingHTML(s),detail=craftingHTML(s,{category:'weapon',selected:'gear:w-eco',mobileView:'detail'});assert.match(list,/data-mobile-view="list"/);assert.match(detail,/data-mobile-view="detail"/);assert.match(detail,/data-craft-back/);assert.match(detail,/data-craft-recipe="part:coil"/);assert.match(detail,/P-2 절전 레이저/);assert.deepEqual(s,before);});
test('mission summary keeps objective and rewards outside expandable explanations',()=>{const s=freshState(),html=missionBoardHTML(s,'union'),before=structuredClone(s);const first=html.slice(html.indexOf('<article'),html.indexOf('</article>'));assert.ok(first.indexOf('mission-objective')<first.indexOf('data-mission-fold'));assert.ok(first.indexOf('mission-reward')<first.indexOf('data-mission-fold'));assert.match(first,/설명·수락 조건 펼치기/);assert.match(first,/data-mission-review/);assert.deepEqual(s,before);});
