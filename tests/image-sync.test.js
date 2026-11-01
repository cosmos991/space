import test from 'node:test';
import assert from 'node:assert/strict';
import {applyImageChange,reconcileImageRecords,validImageChange} from '../image-sync.js';
import handler from '../api/archive.js';
const uid=n=>String(n).padStart(8,'0')+'-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const asset=n=>({id:uid(n),object:'a'.repeat(64)+'.png',prompt:'art',model:'test',time:n});
const change=(n,kind,details={})=>({id:uid(n+100),target:'ship:nomad',kind,...details});
test('remote choices win over stale browser selection and deleted versions stay deleted',()=>{
 const remote=[{key:'123:ship:nomad',active:uid(2),versions:[asset(2)]}],local=[{key:'123:ship:nomad',active:uid(1),versions:[asset(1),asset(2)]}];
 assert.equal(reconcileImageRecords(123,remote,local)[0].active,uid(2));
 assert.deepEqual(reconcileImageRecords(123,remote,local)[0].versions,[asset(2)]);
 const empty=[{key:'123:ship:nomad',active:null,versions:[]}];assert.equal(reconcileImageRecords(123,empty,local)[0].versions.length,0);
});
test('offline changes overlay remote additions without losing other targets',()=>{
 const remote=[{key:'123:ship:nomad',active:uid(1),versions:[asset(1),asset(2)]},{key:'123:person:harin',active:uid(3),versions:[asset(3)]}];
 const local=[{key:'123:ship:nomad',active:null,versions:[],pendingChanges:[change(1,'delete',{version:uid(1)}),change(2,'select',{version:null})]}];
 const next=reconcileImageRecords(123,remote,local);assert.equal(next[0].active,null);assert.deepEqual(next[0].versions,[asset(2)]);assert.deepEqual(next[1],remote[1]);assert.equal(next[0].pendingChanges.length,2);assert.equal(remote[0].versions.length,2);
});
test('local-only originals survive sync and duplicate replay does not duplicate assets',()=>{
 const local=[{key:'123:person:harin',active:uid(1),versions:[{...asset(1),object:undefined,data:'data:image/png;base64,aA=='}]}];
 assert.equal(reconcileImageRecords(123,[],local)[0].versions[0].data,local[0].versions[0].data);
 const list=[];for(let i=0;i<2;i++)applyImageChange(list,123,change(1,'add',{asset:asset(1)}));assert.equal(list[0].versions.length,1);
 applyImageChange(list,123,change(2,'select',{version:uid(1)}));applyImageChange(list,123,change(3,'delete',{version:uid(1)}));assert.equal(list[0].active,null);assert.equal(list[0].versions.length,0);
 assert.equal(validImageChange(123,change(4,'add',{asset:{...asset(1),data:'secret'}})),false);
});
test('concurrent additions retain the selected image at the 12 image limit',()=>{const list=[{key:'123:ship:nomad',active:uid(1),versions:Array.from({length:12},(_,i)=>asset(i+1))}];applyImageChange(list,123,change(1,'add',{asset:asset(20)}));assert.equal(list[0].versions.length,12);assert.ok(list[0].versions.some(v=>v.id===uid(1)));assert.ok(list[0].versions.some(v=>v.id===uid(20)));});
test('server accepts retryable change IDs and replays generated, applied, then deleted events',async t=>{
 const prior={...process.env};Object.assign(process.env,{SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',GAME_ACCESS_CODE:'test-code'});t.after(()=>{for(const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GAME_ACCESS_CODE'])if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];});
 const rows=[{id:uid(50),payload:{format:'asterion-image-version',target:'ship:nomad',asset:asset(1),apply:true}}];
 t.mock.method(globalThis,'fetch',async(url,o)=>{if(o.method==='POST'){assert.equal(o.headers.Prefer,'resolution=ignore-duplicates');assert.ok(url.endsWith('?on_conflict=id'));const row=JSON.parse(o.body);if(!rows.some(r=>r.id===row.id))rows.push(row);return Response.json({});}if(url.includes('summary=eq.IMAGECATALOG'))return Response.json([]);return Response.json(rows);});
 const send=async body=>{const r={setHeader(){},end(s){this.body=JSON.parse(s);}};await handler({method:body?'POST':'GET',url:'/api/archive?action=catalog&seed=123',headers:{'x-game-access-code':'test-code'},body},r);assert.equal(r.statusCode,200);return r.body;};
 const c=change(1,'delete',{version:uid(1)});for(let i=0;i<2;i++)assert.equal((await send({action:'image-change',seed:123,change:c})).acknowledged,c.id);
 assert.equal(rows.length,2);const result=await send();assert.equal(result.images[0].versions.length,0);assert.equal(result.images[0].active,null);
});
