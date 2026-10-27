import test from 'node:test';
import assert from 'node:assert/strict';
import {MENU_GROUPS,menuHTML,groupFor,groupNavigationHTML} from '../navigation-ui.js';
import {DATA_APPS,dataPanelHTML} from '../data-ui.js';
import {freshState} from '../engine.js';
test('all existing data apps have a route in the new navigation and menus do not mutate saves',()=>{const ids=Object.values(MENU_GROUPS).flatMap(g=>g.items.map(x=>x[0]));for(const a of DATA_APPS)assert.ok(ids.includes(a.id),a.id);const s=freshState(),before=structuredClone(s);for(const k of Object.keys(MENU_GROUPS))assert.ok(menuHTML(k));dataPanelHTML(s);assert.deepEqual(s,before);});
test('shop and owned equipment are distinct entry points and utilities are separated',()=>{assert.equal(groupFor('equipment-shop'),'industry');assert.equal(groupFor('equipment'),'fleet');assert.equal(groupFor('contacts'),'people');assert.equal(groupFor('cloud'),'settings');assert.match(menuHTML('industry'),/data-menu-gear="shop"/);assert.match(menuHTML('fleet'),/data-menu-gear="owned"/);assert.doesNotMatch(menuHTML('records'),/data-tab="combat"/);assert.match(menuHTML('records',true),/data-tab="combat"/);assert.match(groupNavigationHTML('industry','equipment-shop'),/aria-current="page"/);});
