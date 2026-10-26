import test from 'node:test';
import assert from 'node:assert/strict';
import {generateText,generateImage,generateSpeech,listAiVoices,AiApiError} from '../src/lib/ai-api.ts';
const key='fake-provider-key-NOT-REAL',signal=()=>new AbortController().signal;
const request={model:'gpt-5-mini',instructions:'Return JSON.',input:'{"story":"test"}'};
const completed=(text:string)=>({status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text}]}]});
const mock=(r:unknown)=>async()=>Response.json(r);
test('Responses sends minimal fixed-origin request, secret only in header, no storage or retries',async()=>{
 let calls=0;
 const result=await generateText(key,{...request,images:['data:image/png;base64,AAAA']},signal(),async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(init?.credentials,'omit');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.equal(init?.referrerPolicy,'no-referrer');
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer '+key);assert.ok(!String(init?.body).includes(key));
  const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.text.format.type,'json_object');assert.ok(!Object.hasOwn(body,'max_output_tokens'));assert.equal(body.input[0].content[2].type,'input_image');
  return Response.json(completed('{"valid":true}'));
 });assert.deepEqual(JSON.parse(result),{valid:true});assert.equal(calls,1);
});
test('incomplete, refused, malformed or missing text is never accepted',async()=>{
 for(const r of [{status:'incomplete',output:[]},completed('```json\n{}\n```'),{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]},completed('')])await assert.rejects(generateText(key,request,signal(),mock(r)),AiApiError);
});
test('safe HTTP errors do not expose provider response or credentials and never retry',async()=>{
 for(const [status,code]of [[401,'auth'],[403,'permission'],[429,'limit'],[400,'request'],[500,'request']] as const){let calls=0;await assert.rejects(generateText(key,request,signal(),async()=>{calls++;return new Response('echo '+key,{status});}),e=>e instanceof AiApiError&&e.code===code&&!e.message.includes(key));assert.equal(calls,1);}
});
test('aborted operations and fetch failures use safe errors',async()=>{
 const controller=new AbortController();controller.abort();let called=false;
 await assert.rejects(generateText(key,request,controller.signal,async()=>{called=true;throw new Error(key);}),e=>e instanceof AiApiError&&e.code==='cancelled');assert.equal(called,false);
 await assert.rejects(generateText(key,request,signal(),async()=>{throw new Error(key);}),e=>e instanceof AiApiError&&e.code==='network'&&!e.message.includes(key));
});
test('oversized response / request rejected without unbounded buffering',async()=>{
 await assert.rejects(generateText(key,request,signal(),async()=>new Response('{}',{headers:{'content-length':String(13*1024*1024)}})),e=>e instanceof AiApiError&&e.code==='size');
 let calls=0;await assert.rejects(generateText(key,{...request,input:'x'.repeat(11*1024*1024)},signal(),async()=>{calls++;return Response.json({});}),AiApiError);assert.equal(calls,0);
});
test('image call accepts only embedded data, never follows model-generated URLs',async()=>{
 const args={model:'gpt-image-2',prompt:'A sketch',size:'1024x1024',quality:'medium'};
 assert.equal(await generateImage(key,args,signal(),async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/images/generations');const b=JSON.parse(String(init?.body));assert.equal(b.n,1);assert.equal(b.output_format,'png');return Response.json({data:[{b64_json:'AAAA'}]});}),'data:image/png;base64,AAAA');
 await assert.rejects(generateImage(key,args,signal(),mock({data:[{url:'https://evil.invalid/image'}]})),AiApiError);
});
test('speech uses only narration text, voice in fixed path, xi-api-key and real audio bytes',async()=>{
 const blob=await generateSpeech(key,{voice:'Voice123',model:'eleven_multilingual_v2',text:'Hello'},signal(),async(url,init)=>{assert.equal(url,'https://api.elevenlabs.io/v1/text-to-speech/Voice123?output_format=mp3_44100_128');assert.deepEqual(JSON.parse(String(init?.body)),{text:'Hello',model_id:'eleven_multilingual_v2'});assert.equal((init?.headers as Record<string,string>)['xi-api-key'],key);assert.ok(!('Authorization'in init!.headers!));return new Response(new Uint8Array([1,2,3]));});assert.equal(blob.size,3);
 await assert.rejects(generateSpeech(key,{voice:'../evil',model:'m',text:'Hello'},signal(),mock({})),AiApiError);
});
test('voice catalog whitelist and first page bound',async()=>{
 assert.deepEqual(await listAiVoices(key,signal(),mock({voices:[{voice_id:'Voice123',name:'Test',secret:key},{voice_id:'../evil',name:'No'}]})),[{id:'Voice123',name:'Test'}]);
});

test('voice pages expose only bounded metadata, retain pagination and never invent gender',async()=>{
 const {listVoicePage}=await import('../src/lib/ai-api.ts');
 const r=await listVoicePage(key,signal(),'a/b&c',async(url,init)=>{assert.equal(url,'https://api.elevenlabs.io/v2/voices?page_size=100&next_page_token=a%2Fb%26c');assert.equal((init?.headers as Record<string,string>)['xi-api-key'],key);return Response.json({voices:[{voice_id:'V1',name:'Name',labels:{gender:'male',language:'German',accent:'Berlin'},verified_languages:[{language:'en'}],secret:key},{voice_id:'V2',name:'Unknown female sounding',labels:{}},{voice_id:'V3',name:'Neutral',labels:{gender:'neutral'}}],has_more:true,next_page_token:'next'});});
 assert.deepEqual(r,{voices:[{id:'V1',name:'Name',gender:'male',languages:['de','en'],accent:'Berlin'},{id:'V2',name:'Unknown female sounding',gender:'unknown',languages:[],accent:''},{id:'V3',name:'Neutral',gender:'neutral',languages:[],accent:''}],next:'next'});assert.ok(!JSON.stringify(r).includes(key));
 await assert.rejects(listVoicePage(key,signal(),'',mock({voices:[],has_more:true})),AiApiError);
 await assert.rejects(listVoicePage(key,signal(),'same',mock({voices:[],has_more:true,next_page_token:'same'})),AiApiError);
});

test('reasoning effort is model-dependent, omitted by default and sent as an API option',async()=>{
 const {modelProfile,supportsReasoning,usableModel}=await import('../src/lib/ai-models.ts');assert.equal(supportsReasoning('gpt-6.1-sol','none'),false);assert.equal(supportsReasoning('gpt-6.1-sol','high'),true);assert.equal(supportsReasoning('gpt-6-luna','none'),true);assert.equal(supportsReasoning('gpt-5-mini','minimal'),true);assert.equal(supportsReasoning('unknown-model','low'),false);assert.equal(modelProfile('gpt-5-mini-2025-08-07')?.id,'gpt-5-mini');assert.equal(modelProfile('gpt-5-mini-extra'),undefined);assert.equal(usableModel({id:'text-embedding-3-small',name:'embedding'},'text'),false);assert.equal(usableModel({id:'gpt-image-2',name:'image'},'text'),false);assert.equal(usableModel({id:'ft:gpt-new:account:custom',name:'custom'},'text'),true);
 await generateText(key,{...request,model:'gpt-6.1-sol',reasoning:'high'},signal(),async(_,init)=>{assert.deepEqual(JSON.parse(String(init?.body)).reasoning,{effort:'high'});return Response.json(completed('{}'));});
 await generateText(key,request,signal(),async(_,init)=>{assert.ok(!('reasoning'in JSON.parse(String(init?.body))));return Response.json(completed('{}'));});
 for(const [model,reasoning]of [['gpt-6.1-sol','none'],['gpt-5-mini','none'],['new-model','low'],['gpt-image-2',undefined]] as const){let calls=0;await assert.rejects(generateText(key,{...request,model,reasoning},signal(),async()=>{calls++;return Response.json(completed('{}'));}),AiApiError);assert.equal(calls,0);}
});

test('model catalogs are read-only, provider-specific, bounded and discard unrelated fields',async()=>{
 const {listGenerationModels}=await import('../src/lib/ai-api.ts');
 const openai=await listGenerationModels('openai',key,signal(),async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/models');assert.equal(init?.method,'GET');assert.equal(init?.body,undefined);assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer '+key);return Response.json({data:[{id:'gpt-6.1-sol',owned_by:key},{id:'gpt-6.1-sol'},{id:'unsafe id'},null]});});assert.deepEqual(openai,[{id:'gpt-6.1-sol',name:'gpt-6.1-sol'}]);
 const eleven=await listGenerationModels('elevenlabs',key,signal(),async(url,init)=>{assert.equal(url,'https://api.elevenlabs.io/v1/models');assert.equal((init?.headers as Record<string,string>)['xi-api-key'],key);return Response.json([{model_id:'tts_model',name:'TTS',can_do_text_to_speech:true},{model_id:'vc_model',name:'VC',can_do_text_to_speech:false}]);});assert.deepEqual(eleven,[{id:'tts_model',name:'TTS'}]);
 await assert.rejects(listGenerationModels('openai',key,signal(),mock({data:new Array(2001).fill({id:'model'})})),AiApiError);
});


test('JSON mode always includes an explicit JSON instruction inside input, even with a JSON-free project payload',async()=>{
 const input=JSON.stringify({request:'',referenceImageIds:[],storyboard:{kind:'scenescript-storyboard',version:'1.0',board:{title:'Space adventure',language:'German'}}});assert.ok(!/json/i.test(input));
 for(const model of ['gpt-6.1-sol','gpt-5-mini']){
  let calls=0;const result=await generateText(key,{...request,model,input,instructions:'Return JSON according to the supplied format.',reasoning:'medium'},signal(),async(_,init)=>{
   calls++;const body=JSON.parse(String(init?.body));assert.equal(body.text.format.type,'json_object');assert.equal(body.input[0].content[0].text,input);assert.deepEqual(JSON.parse(body.input[0].content[0].text),JSON.parse(input));
   const inputText=body.input.flatMap((m:any)=>m.content).filter((c:any)=>c.type==='input_text').map((c:any)=>c.text).join(' ');
   if(!/json/i.test(inputText))return Response.json({error:{message:'Response input messages must contain the word json',param:'input'}},{status:400});
   assert.match(inputText,/Return exactly one valid JSON object/);return Response.json(completed('{"ok":true}'));
  });assert.deepEqual(JSON.parse(result),{ok:true});assert.equal(calls,1);
 }
});


test('text generation adds no application output-token cap, including for unknown models',async()=>{
 for(const model of ['gpt-6.1-sol','gpt-5-mini','gpt-future-model'])await generateText(key,{...request,model},signal(),async(_,init)=>{const body=JSON.parse(String(init?.body));assert.ok(!Object.hasOwn(body,'max_output_tokens'));return Response.json(completed('{"ok":true}'));});
});

test('image presets preserve exact project ratios and only use custom sizes for known GPT Image 2',async()=>{
 const {imageSettings,validImageSize}=await import('../src/lib/ai-image-settings.ts');
 for(const format of ['landscape','portrait','square'] as const)for(const cover of [false,true]){
  const settings=imageSettings('gpt-image-2',format,cover),[w,h]=settings.size.split('x').map(Number);
  assert.equal(w/h,format==='landscape'?16/9:format==='portrait'?9/16:1);
  assert.equal(settings.quality,cover?'high':'low');assert.equal(settings.size,settings.requestSize);
  assert.equal(validImageSize('gpt-image-2',settings.requestSize),true);
  for(const model of ['gpt-image-1.5','unknown-model']){
   const legacy=imageSettings(model,format,cover);
   assert.ok(['1024x1024','1536x1024','1024x1536'].includes(legacy.requestSize));
   assert.equal(legacy.size,settings.size);assert.equal(validImageSize(model,legacy.requestSize),true);
  }
 }
 assert.equal(validImageSize('gpt-image-2-2026-10-01','1280x720'),true);
});
test('invalid image dimensions fail locally before a paid request',async()=>{
 for(const [model,size]of [['gpt-image-2','256x256'],['gpt-image-2','1152x648'],['gpt-image-2','3840x3840'],['gpt-image-1.5','1280x720'],['unknown-model','1280x720']]){
  let calls=0;await assert.rejects(generateImage(key,{model,size,prompt:'Sketch',quality:'low'},signal(),async()=>{calls++;return Response.json({});}),AiApiError);assert.equal(calls,0);
 }
});
