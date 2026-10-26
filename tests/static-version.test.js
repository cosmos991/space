import test from 'node:test';
import assert from 'node:assert/strict';
import {versionImports,versionEntry} from '../scripts/static-version.js';
test('deployment versions every transitive relative module without modifying endpoints or prompts',()=>{
 const src="import {x} from './image-assets.js'; export {y} from './crew.js'; import './style-helper.js'; const lazy=import('../ui.js'); const api='/api/images'; const prompt='1adult';";
 const out=versionImports(src,'release2');
 for(const path of ['./image-assets.js','./crew.js','./style-helper.js','../ui.js'])assert.ok(out.includes(path+'?v=release2'));
 assert.ok(out.includes("'/api/images'"));assert.ok(out.includes("'1adult'"));assert.ok(!out.includes('?v=release2?v='));
 assert.notEqual(versionImports(src,'release1'),out);
 const html=versionEntry('<script src="/app.js"></script><link href="/style.css"><img src="/assets/nomad.jpg">','release2');
 assert.ok(html.includes('/app.js?v=release2'));assert.ok(html.includes('/style.css?v=release2'));assert.ok(html.includes('"/assets/nomad.jpg"'));
});
