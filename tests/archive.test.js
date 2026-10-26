import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import handler from '../api/archive.js';
import {validArchive} from '../archive-schema.js';
import {freshState} from '../engine.js';
import {saveArchive,readArchive,cloudHTML} from '../archive-client.js';
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]),image='data:image/png;base64,'+png.toString('base64'),object=createHash('sha256').update(png).digest('hex')+'.png';
const fixture=()=>({version:1,state:freshState(99),images:[{key:'99:person:harin',active:id,versions:[{id,prompt:'portrait',model:'novelai/nai-diffusion-4-5-full',time:12,provider:'novelai',seed:0,negativePrompt:'text',object}]}],settings:{drafts:{'novelai:person:harin':'portrait'},negative:{},seeds:{},provider:'novelai',positiveBase:'art style'}});
const response=()=>({setHeader(){},end(text){this.data=JSON.parse(text);}});
const request=(url,body)=>({method:body?'POST':'GET',url:'/api/archive?action='+url,headers:{'x-game-access-code':'game-code'},...(body?{body}:{})});
function configure(t){const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GAME_ACCESS_CODE'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'db-secret',GAME_ACCESS_CODE:'game-code'});t.after(()=>{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];});}
test('archive validation rejects damaged game states, path injection, active image mismatch and embedded bytes',()=>{assert.ok(validArchive(fixture()));for(const mutate of [a=>a.state.fuel=-1,a=>a.images[0].versions[0].object='../outside.png',a=>a.images[0].versions[0].data=image,a=>a.images[0].active='missing',a=>a.settings.accessCode='secret',a=>a.settings.drafts=JSON.parse('{"__proto__":"evil"}')]){const a=fixture();mutate(a);assert.equal(validArchive(a),false);}});
test('archive API is closed without shared authorization or DB settings, and never leaks its key',async t=>{configure(t);let calls=0;t.mock.method(globalThis,'fetch',async()=>calls++);let r=response();await handler({method:'GET',url:'/api/archive'},r);assert.equal(r.data.configured,true);assert.ok(!JSON.stringify(r.data).includes('db-secret'));r=response();await handler({...request('list'),headers:{}},r);assert.equal(r.statusCode,401);delete process.env.SUPABASE_SERVICE_ROLE_KEY;r=response();await handler(request('list'),r);assert.equal(r.statusCode,503);assert.equal(calls,0);});
test('archive upload uses private content-addressed storage and saved versions are append-only with detached image bytes',async t=>{configure(t);const rows=[],objects=new Map();t.mock.method(globalThis,'fetch',async(url,opts)=>{assert.equal(opts.headers.apikey,'db-secret');assert.equal(opts.headers.Authorization,'Bearer db-secret');const u=new URL(url);
 if(u.pathname.startsWith('/storage/v1/object/asterion-art/')){assert.equal(opts.method,'POST');objects.set(u.pathname.split('/').at(-1),Buffer.from(opts.body));return new Response('{}');}
 if(u.pathname.startsWith('/storage/v1/object/authenticated/asterion-art/'))return new Response(objects.get(u.pathname.split('/').at(-1)));
 if(opts.method==='POST'){const row=JSON.parse(opts.body);assert.equal(row.payload.images[0].versions[0].data,undefined);row.created_at='2026-10-26T01:00:00Z';rows.push(row);return Response.json([row]);}
 if(u.searchParams.has('id'))return Response.json(rows.filter(r=>'eq.'+r.id===u.searchParams.get('id')));
 return Response.json(rows.map(({payload,...r})=>r));
 });let r=response();await handler(request('upload',{action:'upload',image}),r);assert.equal(r.data.object,object);assert.deepEqual(objects.get(object),png);
 for(let i=0;i<2;i++){r=response();await handler(request('save',{action:'save',archive:fixture()}),r);assert.equal(r.statusCode,201);}assert.notEqual(rows[0].id,rows[1].id);
 r=response();await handler(request('get&id='+rows[0].id),r);assert.ok(validArchive(r.data.archive));
 r=response();await handler(request('image&object='+object),r);assert.equal(r.data.image,image);
 r=response();await handler(request('image&object=../outside'),r);assert.equal(r.statusCode,400);
 assert.ok(!JSON.stringify(r.data).includes('db-secret'));
});
test('failed image upload never publishes a partial DB snapshot; restored records are validated before import',async t=>{let calls=[];t.mock.method(globalThis,'fetch',async(url,opts)=>{calls.push(JSON.parse(opts.body||'{}').action);return Response.json({error:'upload failed'},{status:502});});const a=fixture(),records=a.images.map(r=>({...r,versions:r.versions.map(({object,...v})=>({...v,data:image}))}));
 await assert.rejects(saveArchive('game-code',a.state,records,a.settings),/upload failed/);assert.deepEqual(calls,['upload']);
 t.mock.method(globalThis,'fetch',async()=>Response.json({archive:{bad:true}}));await assert.rejects(readArchive('game-code',id),/검증/);
 assert.match(cloudHTML({checked:true}),/DB 연결 대기/);assert.match(cloudHTML({configured:true,checked:true,archives:[{id,created_at:'2026-10-26',summary:'<script>'}]}),/&lt;script&gt;/);
});
