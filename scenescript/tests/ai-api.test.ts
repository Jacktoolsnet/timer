import test from 'node:test';
import assert from 'node:assert/strict';
import {generateText,generateImage,generateSpeech,listAiVoices,AiApiError} from '../src/lib/ai-api.ts';
const key='fake-provider-key-NOT-REAL',signal=()=>new AbortController().signal;
const request={model:'gpt-5-mini',instructions:'Return JSON.',input:'{"story":"test"}',maxTokens:2048};
const completed=(text:string)=>({status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text}]}]});
const mock=(r:unknown)=>async()=>Response.json(r);
test('Responses sends minimal fixed-origin request, secret only in header, no storage or retries',async()=>{
 let calls=0;
 const result=await generateText(key,{...request,images:['data:image/png;base64,AAAA']},signal(),async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(init?.credentials,'omit');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.equal(init?.referrerPolicy,'no-referrer');
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer '+key);assert.ok(!String(init?.body).includes(key));
  const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.text.format.type,'json_object');assert.equal(body.max_output_tokens,2048);assert.equal(body.input[0].content[1].type,'input_image');
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
