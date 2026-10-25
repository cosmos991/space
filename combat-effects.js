// Presentation only. All outcomes have already been resolved and saved by the engine.
let active=null;
export function cancelCombatEffects(){active?.abort();}
export async function playCombatEffects(root,effects,{reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}){
 cancelCombatEffects();if(!root?.isConnected||!effects.length)return;
 const controller=new AbortController(),signal=controller.signal;active=controller;
 const nodes=[],animations=[];const stage=root.querySelector('.combat-stage'),status=root.querySelector('.combat-fx-status');
 if(!stage){active=null;return;}
 root.setAttribute('aria-busy','true');
 const wait=ms=>new Promise(resolve=>{if(signal.aborted)return resolve();const onAbort=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(()=>{signal.removeEventListener('abort',onAbort);resolve();},ms);signal.addEventListener('abort',onAbort,{once:true});});
 const element=(cls,parent=stage,text='')=>{const el=document.createElement('span');el.className=cls;el.textContent=text;el.setAttribute('aria-hidden','true');parent.append(el);nodes.push(el);return el;};
 const animate=(el,frames,options)=>{if(!el.animate)return;const a=el.animate(frames,{fill:'both',...options});animations.push(a);};
 const point=side=>{const art=root.querySelector(`[data-combat-side="${side}"] .combat-art, [data-combat-side="${side}"] .enemy-contact`);const a=art?.getBoundingClientRect(),b=stage.getBoundingClientRect();return a?{x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2}:null;};
 try{
  for(const effect of effects){
   if(signal.aborted||!root.isConnected)break;
   const source=effect.source==='enemy'?'enemy':'player',target=source==='player'?'enemy':'player';
   const shooter=root.querySelector(`[data-combat-side="${source}"]`),victim=root.querySelector(`[data-combat-side="${target}"]`);
   if(!shooter||!victim)continue;
   if(effect.kind!=='shot'){
    if(status)status.textContent=effect.kind==='guard'?'방어막 재충전':'철수 기동 성공';
    if(!reducedMotion){const pulse=element('combat-shield-pulse',shooter);animate(pulse,[{opacity:0,transform:'scale(.85)'},{opacity:.6,offset:.4},{opacity:0,transform:'scale(1.08)'}],{duration:420});}
    await wait(reducedMotion?100:420);continue;
   }
   const family=['laser','ballistic','plasma','missile'].includes(effect.family)?effect.family:'ballistic';
   if(status)status.textContent=`${source==='player'?'노마드':'적 함선'} ${effect.heavy?'집중 포격':'사격'} · ${effect.hit?'명중':'빗나감'}`;
   const from=point(source),to=point(target);if(!from||!to)continue;
   if(!reducedMotion){
    const impact={x:to.x,y:to.y+(effect.hit?0:-42)};const dx=impact.x-from.x,dy=impact.y-from.y,distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    const muzzle=element(`combat-muzzle fx-${family}`);muzzle.style.left=from.x+'px';muzzle.style.top=from.y+'px';
    animate(muzzle,[{opacity:1,transform:'translate(-50%,-50%) scale(.3)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.8)'}],{duration:200});
    const count=effect.heavy?3:family==='ballistic'?2:1;
    for(let i=0;i<count;i++){
     const projectile=element(`combat-projectile fx-${family} ${source==='enemy'?'fx-hostile':''}`);projectile.style.left=from.x+'px';projectile.style.top=(from.y+(i-(count-1)/2)*7)+'px';projectile.style.setProperty('--shot-angle',angle+'deg');
     if(family==='laser'){
      projectile.style.width=distance+'px';projectile.style.transform=`rotate(${angle}deg)`;animate(projectile,[{opacity:0},{opacity:1,offset:.18},{opacity:.85,offset:.7},{opacity:0}],{duration:270,delay:i*75});
     }else animate(projectile,[{transform:`translate(0,-50%) rotate(${angle}deg)`,opacity:0},{offset:.08,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${angle}deg)`,opacity:1},{offset:1,transform:`translate(${dx}px,${dy}px) rotate(${angle}deg)`,opacity:0}],{duration:family==='missile'?480:340,delay:i*75});
    }
    animate(shooter,[{transform:'translateX(0)'},{transform:`translateX(${source==='player'?-3:3}px)`,offset:.25},{transform:'translateX(0)'}],{duration:180});
    await wait((family==='missile'?480:family==='laser'?230:340)+(count-1)*75);
   }
   if(signal.aborted||!root.isConnected)break;
   const damage=effect.hit?`${effect.shield?'실드 −'+effect.shield:''}${effect.shield&&effect.hull?' / ':''}${effect.hull?'선체 −'+effect.hull:''}`:'MISS';
   if(effect.hit){
    const meters=victim.querySelectorAll('.combat-meter');
    for(const [index,damage]of [[0,effect.hull],[1,effect.shield]]){
     const value=meters[index]?.querySelector('strong'),bar=meters[index]?.querySelector('.meter i');
     if(!value||!bar)continue;const [current,max]=value.textContent.split('/').map(Number);if(!Number.isFinite(current)||!Number.isFinite(max)||max<=0)continue;
     const next=Math.max(0,current-(damage||0));value.textContent=`${next} / ${max}`;bar.style.width=next/max*100+'%';
    }
   }
   const label=element(`combat-damage ${effect.hit?'':'miss'}`,victim,damage||'명중');
   if(!reducedMotion){
    const pulse=element(`combat-hit-pulse ${effect.hit?(effect.shield?'shield':'hull'):'miss'}`,victim);
    animate(pulse,[{opacity:0},{opacity:effect.hit?.85:.2,offset:.2},{opacity:0}],{duration:400});
    animate(label,[{opacity:0,transform:'translate(-50%,8px)'},{opacity:1,offset:.2},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-18px)'}],{duration:600});
    if(effect.hit)animate(victim,[{transform:'translateX(0)'},{transform:'translateX(3px)',offset:.2},{transform:'translateX(-3px)',offset:.4},{transform:'translateX(0)'}],{duration:220});
   }
   await wait(reducedMotion?160:560);
   for(const n of nodes)n.remove();nodes.length=0;
  }
 }finally{
  animations.forEach(a=>a.cancel());nodes.forEach(n=>n.remove());root.removeAttribute('aria-busy');if(status)status.textContent='';if(active===controller)active=null;
 }
}
