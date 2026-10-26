import {test} from 'node:test';import assert from 'node:assert/strict';
import {testApiKey} from '../src/lib/api-key-test.ts';
const key='TEST-NOT-A-REAL-KEY';
const response=(status:number,body:unknown={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('key checks only perform provider-specific GET requests with private headers and no bodies/cookies/redirects',async()=>{
 for(const provider of ['openai','elevenlabs'] as const){let calls=0;const fetcher:typeof fetch=async(url,init)=>{calls++;assert.equal(url,provider==='openai'?'https://api.openai.com/v1/models':'https://api.elevenlabs.io/v1/user');assert.equal(init!.method,'GET');assert.equal(init!.body,undefined);assert.equal(init!.credentials,'omit');assert.equal(init!.cache,'no-store');assert.equal(init!.redirect,'error');assert.equal(init!.referrerPolicy,'no-referrer');const headers=new Headers(init!.headers);assert.equal(headers.get(provider==='openai'?'Authorization':'xi-api-key'),provider==='openai'?'Bearer '+key:key);assert.equal(headers.has(provider==='openai'?'xi-api-key':'Authorization'),false);assert.ok(!String(url).includes(key));return response(200);};assert.deepEqual(await testApiKey(provider,key,undefined,fetcher),{state:'ok',status:200});assert.equal(calls,1);}
});
test('permission, authentication, rate, provider and unexpected responses are distinct and never expose response data',async()=>{
 for(const [status,body,state] of [[401,{error:{message:key,code:'invalid_api_key'}},'auth'],[401,{detail:{status:'missing_permissions',message:key}},'permission'],[401,{error:{message:'Missing scopes: model.read '+key}},'permission'],[403,{detail:key},'permission'],[429,{error:key},'rate'],[500,{error:key},'unavailable'],[404,{error:key},'unavailable']] as const){const result=await testApiKey('openai',key,undefined,async()=>response(status,body));assert.equal(result.state,state);assert.ok(!JSON.stringify(result).includes(key));}
 assert.equal((await testApiKey('openai',key,undefined,async()=>new Response('unexpected HTML',{status:200,headers:{'content-type':'text/html'}}))).state,'unavailable');
 assert.equal((await testApiKey('elevenlabs',key,undefined,async()=>response(401,{detail:{status:'invalid_api_key',message:key}}))).state,'auth');
});
test('input validation, abort and network errors are safe and do not retry',async()=>{
 let calls=0;const fail:typeof fetch=async()=>{calls++;throw new Error(key);};
 for(const value of ['', 'key with spaces','line\nbreak','a'.repeat(1025)])assert.equal((await testApiKey('openai',value,undefined,fail)).state,'input');assert.equal((await testApiKey('unknown' as never,key,undefined,fail)).state,'input');assert.equal(calls,0);
 const aborted=new AbortController();aborted.abort();assert.equal((await testApiKey('openai',key,aborted.signal,fail)).state,'cancelled');assert.equal(calls,0);
 const result=await testApiKey('openai',key,undefined,fail);assert.equal(result.state,'network');assert.ok(!JSON.stringify(result).includes(key));assert.equal(calls,1);
 const controller=new AbortController();const pending=testApiKey('openai',key,controller.signal,(_url,options)=>new Promise((_resolve,reject)=>{options!.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});}));controller.abort();assert.equal((await pending).state,'cancelled');
});
test('oversized error responses cannot flood memory or turn a failed key into a success',async()=>{
 const result=await testApiKey('openai',key,undefined,async()=>new Response('x'.repeat(20_000),{status:401}));assert.deepEqual(result,{state:'auth',status:401});
});

test('a stalled provider times out instead of retrying',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const pending=testApiKey('openai',key,undefined,(_url,options)=>new Promise((_resolve,reject)=>{options!.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});}));
 context.mock.timers.tick(15_000);assert.equal((await pending).state,'timeout');
});
