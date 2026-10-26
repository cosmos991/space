import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,missionOrder,contract} from '../engine.js';
import {prepareMissionFeedback,finishMissionFeedback,missionFeedbackHTML,showMissionFeedback} from '../mission-feedback.js';
test('assignment feedback shows promised rewards without granting them; completion reports actual capped trust and promotion once',()=>{
 const s=freshState(10),id='union-supply@0',before=structuredClone(s),prepared=prepareMissionFeedback(s,id,'accept');
 assert.deepEqual(s,before);const message=missionOrder(s,id,'accept'),accepted=finishMissionFeedback(s,prepared,message);
 assert.equal(s.credits,before.credits);assert.equal(accepted.done,false);assert.equal(accepted.credits,420);assert.match(missionFeedbackHTML(accepted),/완료 시 보상/);
 missionOrder(s,id,'pickup');s.location='terra';s.diplomacy.reputation.union=99;
 const completing=prepareMissionFeedback(s,id,'complete'),result=missionOrder(s,id,'complete'),completed=finishMissionFeedback(s,completing,result),after=structuredClone(s);
 assert.equal(completed.credits,420);assert.equal(completed.honor,8);assert.equal(completed.trust,3);assert.equal(completed.promoted,true);assert.equal(completed.progress,2);
 assert.match(missionFeedbackHTML(completed),/새로운 등급으로 승급/);assert.deepEqual(s,after);assert.throws(()=>missionOrder(s,id,'complete'));assert.deepEqual(s,after);
 const t=freshState(11);missionOrder(t,id,'accept');missionOrder(t,id,'pickup');t.location='terra';t.diplomacy.reputation.union=599;
 const p=prepareMissionFeedback(t,id,'complete');missionOrder(t,id,'complete');assert.equal(finishMissionFeedback(t,p,'').trust,1);
});
test('legacy supply contracts get feedback and non-terminal mission steps never produce a completion popup',()=>{
 const s=freshState(12),p=prepareMissionFeedback(s,'legacy-supply','accept');contract(s,'accept');assert.equal(finishMissionFeedback(s,p,'').credits,650);
 assert.equal(prepareMissionFeedback(s,'union-supply@0','pickup'),null);assert.equal(prepareMissionFeedback(s,'bad','complete'),null);
 const data=finishMissionFeedback(s,p,'<script>alert(1)</script>');assert.ok(!missionFeedbackHTML(data).includes('<script>'));assert.match(missionFeedbackHTML(data),/&lt;script&gt;/);
});
test('feedback can be dismissed immediately with either confirmation or close, and can be reopened',()=>{
 const s=freshState(13),data=finishMissionFeedback(s,prepareMissionFeedback(s,'union-supply@0','accept'),'accepted'),before=structuredClone(s);
 const dialog={open:false,innerHTML:'',showModal(){this.open=true;},close(){this.open=false;}};
 for(let n=0;n<2;n++){showMissionFeedback(dialog,data);assert.equal(dialog.open,true);dialog.onclick({target:{closest:()=>({})}});assert.equal(dialog.open,false);}
 assert.deepEqual(s,before);
});
