import {FACTIONS} from './factions.js';
import {PORTS,unitPrice} from './economy.js';
export const TOPICS={general:'종합',trade:'교역',safety:'항로 안전',exploration:'탐사'};
export const CHANNEL_DIRECTORY=[{id:'trade-net',name:'교역 네트워크',topic:'trade'},{id:'safety-net',name:'항로 안전망',topic:'safety'},{id:'explorer-net',name:'탐사자 라운지',topic:'exploration'}];
const CONTACTS=Object.fromEntries(FACTIONS.map(f=>[f.id,f.name]));
const channel=(id,name,kind,topic='general',contact=null,locked=false)=>({id,name,kind,topic,contact,locked,readAt:0,messages:[]});
export function freshComms(hours=0,chats={}){
 const c={version:1,sequence:0,active:'system',channels:[channel('system','항성계 전체','public','general',null,true),...Object.entries(CONTACTS).map(([id,name])=>channel('dm-'+id,name,'direct','general',id,true))]};
 append(c,'system',{author:'헤이븐 통신국',content:'아스테리온 공개 주파수입니다. 항해·거래·사건 소식이 게임 시간에 따라 수신됩니다.',role:'system',hours,kind:'notice'});
 for(const id of Object.keys(CONTACTS))for(const m of (chats[id]||[]).slice(-60))append(c,'dm-'+id,{author:m.role==='user'?'CSV 노마드':CONTACTS[id],content:m.content,role:m.role==='user'?'user':'assistant',hours,kind:'chat'});
 return c;
}
export function migrateComms(s){if(!s.comms)s.comms=freshComms(s.hours,s.chats);return s;}
export function activeChannel(s){return s.comms.channels.find(c=>c.id===s.comms.active)||s.comms.channels[0];}
export function append(c,id,message){const ch=c.channels.find(ch=>ch.id===id);if(!ch)return null;const item={seq:++c.sequence,author:String(message.author||'통신국').slice(0,60),content:String(message.content||'').slice(0,4000),role:['user','assistant','npc','system'].includes(message.role)?message.role:'npc',hours:message.hours,kind:message.kind||'chat',eventId:message.eventId||null,...(message.missionId?{missionId:message.missionId,missionFaction:message.missionFaction}:{})};ch.messages.push(item);ch.messages=ch.messages.slice(-80);return item;}
export function broadcast(s,{author='항성계 통신국',content,topic='general',kind='chat',eventId=null}){migrateComms(s);for(const c of s.comms.channels)if(c.kind==='public'&&(c.id==='system'||c.topic===topic||c.topic==='general'))append(s.comms,c.id,{author,content,role:kind==='report'?'system':'npc',hours:s.hours,kind,eventId});}
export function addChannel(s,{directoryId,name,topic='general',kind='public',contact='free'}){
 migrateComms(s);if(s.comms.channels.length>=12)throw Error('채널은 최대 12개까지 추가할 수 있습니다.');
 let c;if(directoryId){const item=CHANNEL_DIRECTORY.find(c=>c.id===directoryId);if(!item)throw Error('등록되지 않은 주파수입니다.');if(s.comms.channels.some(c=>c.id===directoryId))throw Error('이미 구독한 채널입니다.');c=channel(item.id,item.name,'public',item.topic);}else{
  const label=String(name||'').trim();if(label.length<2||label.length>24)throw Error('채널 이름은 2~24자로 입력하세요.');if(s.comms.channels.some(c=>c.name===label))throw Error('같은 이름의 채널이 있습니다.');if(!Object.hasOwn(TOPICS,topic)||!['public','direct'].includes(kind)||!Object.hasOwn(CONTACTS,contact))throw Error('채널 설정을 확인하세요.');
  c=channel('custom-'+(s.comms.sequence+1),label,kind,topic,kind==='direct'?contact:null);
 }
 s.comms.channels.push(c);s.comms.active=c.id;append(s.comms,c.id,{author:'통신 시스템',content:c.kind==='public'?`${TOPICS[c.topic]} 주파수에 연결했습니다. 공개 글은 NPC 시뮬레이션이며 게임 시간이 진행되면 새 방송이 수신됩니다.`:`${CONTACTS[c.contact]} 연결 채널입니다. 메시지를 보내면 해당 세력과 개별 통신합니다.`,role:'system',hours:s.hours,kind:'notice'});return c;
}
export function selectChannel(s,id){if(!s.comms.channels.some(c=>c.id===id))throw Error('채널을 찾을 수 없습니다.');s.comms.active=id;markRead(s,id);}
export function markRead(s,id=s.comms.active){const ch=s.comms.channels.find(c=>c.id===id);if(ch)ch.readAt=ch.messages.at(-1)?.seq||ch.readAt;}
export const unread=c=>c.messages.filter(m=>m.seq>c.readAt&&m.role!=='user').length;
export function publicPost(s,text){const c=activeChannel(s);const content=String(text).trim();if(c.kind!=='public'||!content||content.length>1200)throw Error('1~1,200자의 공개 통신을 입력하세요.');append(s.comms,c.id,{author:'CSV 노마드 · 함장',content,role:'user',hours:s.hours});markRead(s);}
export function ambientPost(s,roll){
 const entries=[
  ['general','수송선 아틀라스','헤이븐 관제, 수송선 아틀라스입니다. 오늘도 모두 안전 항해하세요.'],
  ['general','독립 선장 미라','성계 외곽은 조용하네요. 항해 중에는 연료 잔량부터 확인하는 게 좋겠습니다.'],
  ['safety','연합 항로관제','외곽 항로에서는 구조 신호와 잔해를 주의하세요. 사건 발생 시 함선 시간이 자동 정지됩니다.'],
  ['safety','호위선 센티널','성운 진입 전 실드 상태를 확인하세요. 이온 활동이 있는 구역에서는 우회 항로가 안전합니다.'],
  ['exploration','탐사선 오르빗','에코 구역 탐사자는 회수품을 실을 화물 공간을 남겨 두세요.'],
  ['exploration','채굴선 브램','케플러 광맥 탐사는 연료 5가 필요합니다. 채굴 전초기지 후보지를 찾는 분께 참고가 되길 바랍니다.'],
  ['trade','프리포트 상인회','화물 회전율만 보지 마세요. 대량 주문의 가격 영향과 왕복 연료비도 계산해야 합니다.']
 ];
 const index=Math.floor(roll*9);if(index>=entries.length){const ids=Object.keys(PORTS),id=ids[index%ids.length],p=PORTS[id],g=index%2?'tech':'food',u=unitPrice(s,id,g);broadcast(s,{author:p.name+' 시세망',topic:'trade',content:`현재 ${g==='tech'?'기술 부품':'식량'} 호가: 매수 ${u.buy} / 매도 ${u.sell} CR/t. 대량 체결가는 달라질 수 있습니다.`});return;}
 const [topic,author,content]=entries[index];broadcast(s,{topic,author,content});
}
export function validComms(c,hours){return c?.version===1&&Number.isSafeInteger(c.sequence)&&c.sequence>=0&&typeof c.active==='string'&&Array.isArray(c.channels)&&c.channels.length>=4&&c.channels.length<=12&&new Set(c.channels.map(ch=>ch.id)).size===c.channels.length&&['system','dm-union','dm-helios','dm-free',c.active].every(id=>c.channels.some(ch=>ch.id===id))&&c.channels.every(ch=>typeof ch.id==='string'&&typeof ch.name==='string'&&ch.name.length<=60&&['public','direct'].includes(ch.kind)&&Object.hasOwn(TOPICS,ch.topic)&&(ch.kind!=='direct'||Object.hasOwn(CONTACTS,ch.contact))&&Number.isSafeInteger(ch.readAt)&&ch.readAt>=0&&ch.readAt<=c.sequence&&Array.isArray(ch.messages)&&ch.messages.length<=80&&ch.messages.every(m=>Number.isSafeInteger(m.seq)&&m.seq>0&&m.seq<=c.sequence&&typeof m.author==='string'&&typeof m.content==='string'&&m.content.length<=4000&&['user','assistant','npc','system'].includes(m.role)&&Number.isFinite(m.hours)&&m.hours>=0&&m.hours<=hours&&(m.missionId===undefined||(typeof m.missionId==='string'&&m.missionId.length<=100&&Object.hasOwn(CONTACTS,m.missionFaction)))));}
