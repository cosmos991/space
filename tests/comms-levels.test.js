import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/comms.js';
import {freshState,validSave} from '../engine.js';
import {commsHTML,channelMessagesHTML} from '../comms-ui.js';
import {setChannelLevel,channelLevel,COMMS_LEVELS} from '../comms-levels.js';
import {append,selectChannel} from '../communications.js';
const response=()=>({setHeader(){},end(s){this.data=JSON.parse(s);}});
function configure(t){const old={OPENAI_API_KEY:process.env.OPENAI_API_KEY,GAME_ACCESS_CODE:process.env.GAME_ACCESS_CODE,OPENAI_MODEL:process.env.OPENAI_MODEL};Object.assign(process.env,{OPENAI_API_KEY:'test-key',GAME_ACCESS_CODE:'test-code',OPENAI_MODEL:'legacy-default'});t.after(()=>{for(const [k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;});}
const req=body=>({method:'POST',headers:{'x-game-access-code':'test-code'},socket:{remoteAddress:'level-tests'},body:{messages:[{role:'user',content:'안녕하세요'}],...body}});
test('public and faction levels persist per channel, default to economy, and switch between local post and AI send',()=>{
 const s=freshState(30),pub=s.comms.channels[0];assert.equal(channelLevel(pub),'economy');assert.match(commsHTML(s),/id="chat-form"/);assert.match(commsHTML(s),/comms-ai-level/);
 setChannelLevel(s,pub.id,'local');assert.match(commsHTML(s),/id="public-form"/);setChannelLevel(s,'dm-union','advanced');selectChannel(s,'dm-union');assert.match(commsHTML(s),/고급 · Astra/);
 const restored=JSON.parse(JSON.stringify(s));assert.ok(validSave(restored));assert.equal(channelLevel(restored.comms.channels[0]),'local');assert.equal(channelLevel(restored.comms.channels.find(c=>c.id==='dm-union')),'advanced');
 assert.throws(()=>setChannelLevel(s,pub.id,'arbitrary-model'));s.comms.channels[0].aiLevel='invalid';assert.equal(validSave(s),false);
});
test('each AI level resolves server-side model and reasoning settings, ignoring arbitrary model overrides',async t=>{
 configure(t);let payload;t.mock.method(globalThis,'fetch',async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({model:payload.model,usage:{input_tokens:10,output_tokens:5,total_tokens:15},output:[{content:[{type:'output_text',text:'수신했습니다.'}]}]})};});
 for(const level of ['economy','standard','advanced']){const r=response();await handler(req({faction:'union',level,model:'hacked-model'}),r);assert.equal(r.statusCode,200);assert.equal(payload.model,COMMS_LEVELS[level].model);assert.equal(payload.reasoning.effort,COMMS_LEVELS[level].effort);assert.equal(r.data.usage.total,15);}
 const r=response();await handler(req({publicChannel:{name:'항성계 전체',topic:'general'},level:'economy',context:{location:'헤이븐'}}),r);assert.equal(r.statusCode,200);assert.match(payload.instructions,/공개 주파수의 NPC 교신원/);assert.match(payload.instructions,/게임 행동은 HUD/);assert.ok(payload.input[0].content.includes('항성계 전체'));
});
test('local mode never calls the provider; explicit AI without a key fails clearly and public AI requires authentication',async t=>{
 configure(t);let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('must not call');});
 let r=response();await handler(req({faction:'free',level:'local'}),r);assert.equal(r.data.mode,'local');assert.equal(calls,0);
 const p={publicChannel:{name:'공개 방송',topic:'safety'},level:'economy'};r=response();await handler({...req(p),headers:{}},r);assert.equal(r.statusCode,401);
 delete process.env.OPENAI_API_KEY;r=response();await handler(req(p),r);assert.equal(r.statusCode,503);assert.equal(r.data.mode,'ai');assert.equal(calls,0);
 for(const body of [{...p,level:'bogus'},{...p,faction:'union'},{...p,publicChannel:{name:'x',topic:'bogus'}}]){r=response();await handler(req(body),r);assert.equal(r.statusCode,400);}
});
test('response badges store actual model safely and survive a save round trip',()=>{
 const s=freshState(31);selectChannel(s,'dm-union');append(s.comms,'dm-union',{role:'assistant',content:'답변',author:'연락관',hours:s.hours,mode:'ai',model:'<script>'});const html=channelMessagesHTML(s);assert.match(html,/AI · &lt;script&gt;/);assert.ok(validSave(JSON.parse(JSON.stringify(s))));
});
