import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../engine.js';
import {dockChrome} from '../comms-dock.js';
import {selectChannel} from '../communications.js';
test('collapsed dock exposes recent text and unread count without changing saved conversations',()=>{const s=freshState(),before=structuredClone(s);const html=dockChrome(s);assert.match(html,/aria-expanded="false"/);assert.doesNotMatch(html,/id="dock-conversation"/);assert.match(html,/data-dock-toggle/);assert.deepEqual(s,before);});
test('open dock groups channels, preserves selected destination and escapes messages',()=>{const s=freshState();s.comms.channels[0].messages.push({author:'<script>',content:'<img onerror=x>'});const publicHTML=dockChrome(s,{open:true});assert.match(publicHTML,/공개/);assert.match(publicHTML,/팩션/);assert.match(publicHTML,/개인/);assert.match(publicHTML,/&lt;script&gt;/);assert.ok(!publicHTML.includes('<img onerror'));selectChannel(s,'dm-helios');const before=structuredClone(s),html=dockChrome(s,{open:true,group:'faction'});assert.match(html,/value="dm-helios" selected/);assert.doesNotMatch(html,/value="system"/);assert.deepEqual(s,before);assert.doesNotMatch(dockChrome(s,{open:true,group:'personal'}),/id="dock-channel"/);});
