import {randomInt} from 'node:crypto';
export function novelaiPayload(b,model){
 const negative=b.negativePrompt??'lowres, bad anatomy, bad hands, text, watermark, logo, blurry, worst quality, bad quality';
 const caption=text=>({caption:{base_caption:text,char_captions:[]},use_coords:false,use_order:true});
 return {input:b.prompt,model,action:'generate',parameters:{params_version:3,width:b.kind==='person'?832:1216,height:b.kind==='person'?1216:832,scale:5,sampler:'k_euler_ancestral',steps:28,n_samples:1,seed:b.seed??randomInt(0,4294967296),negative_prompt:negative,noise_schedule:'karras',qualityToggle:false,ucPreset:3,sm:false,sm_dyn:false,dynamic_thresholding:false,cfg_rescale:0,legacy:false,v4_prompt:caption(b.prompt),v4_negative_prompt:caption(negative),image_format:'webp'}};
}
export async function generateNovelAI(b,token,model){
 const payload=novelaiPayload(b,model);
 const response=await fetch('https://image.novelai.net/ai/generate-image',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},signal:AbortSignal.timeout(105000),body:JSON.stringify(payload)});
 if(!response.ok){const message={401:'NovelAI API 토큰을 확인하세요.',402:'NovelAI Anlas 잔액 또는 구독 조건을 확인하세요.',403:'NovelAI 모델 접근 권한을 확인하세요.',429:'NovelAI 요청 제한입니다. 자동 재시도하지 않습니다.'}[response.status]||'NovelAI 생성 요청이 실패했습니다. 모델과 구독 조건을 확인하세요.';throw Error(message);}
 const data=await response.json(),encoded=data.images?.[0]?.image;
 if(typeof encoded!=='string'||!encoded.length||encoded.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('NovelAI 이미지 응답이 없거나 크기 한도를 넘었습니다.');
 const bytes=Buffer.from(encoded,'base64');let mime;
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='png';
 else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')mime='webp';
 else throw Error('NovelAI가 지원하지 않는 이미지 형식을 반환했습니다.');
 return {image:'data:image/'+mime+';base64,'+encoded,seed:payload.parameters.seed,model:'novelai/'+model,provider:'novelai',usage:null,mode:'ai'};
}
