import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import handler from '../api/archive.js';
import {validArchive} from '../archive-schema.js';
import {freshState} from '../engine.js';
import {saveArchive,readArchive,prepareArchiveRestore,cloudHTML} from '../archive-client.js';
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]),image='data:image/png;base64,'+png.toString('base64'),object=createHash('sha256').update(png).digest('hex')+'.png';
const fixture=()=>({version:1,state:freshState(99),images:[{key:'99:person:harin',active:id,versions:[{id,prompt:'portrait',model:'novelai/nai-diffusion-4-5-full',time:12,provider:'novelai',seed:0,negativePrompt:'text',object}]}],settings:{drafts:{'novelai:person:harin':'portrait'},negative:{},seeds:{},provider:'novelai',positiveBase:'art style'}});
test('restore explicitly offers both backup choices and never invokes a cloud backup when skipped',async t=>{
 const a=fixture(),calls=[];let backups=0,broken=false;t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,method:options.method});if(url.includes('action=get'))return Response.json({archive:broken?{...a,state:{}}:a});if(url.includes('action=image'))return Response.json({image});throw Error('unexpected cloud mutation');});
 const options={backupCurrent:false,backup:async()=>{backups++;}};
 const loaded=await prepareArchiveRestore('code',id,options);assert.equal(backups,0);assert.equal(loaded.records[0].versions[0].data,image);assert.ok(calls.every(c=>c.method==='GET'));
 await prepareArchiveRestore('code',id,{...options,backupCurrent:true});assert.equal(backups,1);
 broken=true;await assert.rejects(prepareArchiveRestore('code',id,{...options,backupCurrent:true}));assert.equal(backups,1);await assert.rejects(prepareArchiveRestore('code',id,{...options,backupCurrent:undefined}));
 const html=cloudHTML({configured:true,archives:[{id,summary:'save',created_at:new Date().toISOString()}],review:id});assert.match(html,/data-cloud-backup="no"/);assert.match(html,/data-cloud-backup="yes"/);assert.match(html,/백업 없이 불러오기/);
});
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
test('cloud usage counts private image bytes and deletion removes only the selected snapshot',async t=>{configure(t);let removed=false;const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,method:options.method});if(options.method==='HEAD')return new Response(null,{headers:{'content-range':'0-0/3'}});if(url.includes('/storage/v1/object/list/'))return Response.json([{id:'image-id',name:object,metadata:{size:1234}}]);if(options.method==='DELETE'){removed=true;assert.ok(url.includes('id=eq.'+id));return Response.json([{id}]);}throw Error('unexpected request');});let r=response();await handler(request('usage'),r);assert.equal(r.data.usage.archiveCount,3);assert.equal(r.data.usage.imageBytes,1234);assert.equal(r.data.usage.imageCount,1);assert.equal(r.data.usage.complete,true);r=response();await handler(request('delete',{action:'delete',id,confirmId:'wrong'}),r);assert.equal(r.statusCode,400);assert.equal(removed,false);r=response();await handler(request('delete',{action:'delete',id,confirmId:id}),r);assert.equal(r.data.deleted,id);assert.equal(r.data.imagesRetained,true);assert.ok(!calls.some(c=>c.method==='DELETE'&&c.url.includes('/storage/')));r=response();await handler({...request('delete',{action:'delete',id,confirmId:id}),headers:{}},r);assert.equal(r.statusCode,401);});
test('cloud details show actual crew, image choices, links and prompts without executing stored markup',async()=>{const {archiveDetailsHTML}=await import('../archive-client.js');const a=fixture();a.settings.drafts['officer-link:union']='https://example.com/a.png';a.settings.drafts.test='<script>alert(1)</script>';const html=archiveDetailsHTML({id,archive:a});assert.match(html,/저장 내용/);assert.match(html,/적용 중/);assert.match(html,/https:\/\/example.com\/a.png/);assert.ok(!html.includes('<script>'));const controls=cloudHTML({configured:true,archives:[{id,summary:'record',created_at:new Date().toISOString()}],deleteReview:id});assert.match(controls,/data-cloud-inspect/);assert.match(controls,/data-cloud-usage/);assert.match(controls,/되돌릴 수 없습니다/);});
