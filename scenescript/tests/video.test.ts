import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultVideo,parseVideo,validateVideoData,videoTime} from '../src/lib/video.ts';
import {demoProject,parseProject,newElement} from '../src/lib/model.ts';
const data='data:video/webm;base64,AAAA';
test('video settings, trims and references validate',()=>{const assets={clip:{name:'clip.webm',data,duration:40}};const c={...defaultVideo(),asset:'clip',start:3.5,end:35.6};assert.deepEqual(parseVideo(c,assets),c);assert(Math.abs(videoTime(c,40,100)-35.599)<1e-9);assert.equal(videoTime({...c,loop:true},40,32.1),3.5);for(const v of [{...c,start:36},{...c,end:50},{...c,asset:'missing'},{...c,volume:2},{...c,loop:'true'},{...c,html:'evil'}])assert.throws(()=>parseVideo(v,assets));assert.throws(()=>validateVideoData('https://example.org/a.webm'));assert.throws(()=>validateVideoData('data:text/html;base64,AAAA'));});
test('legacy projects are silent and video payloads round trip once',()=>{const p=demoProject();p.videos={clip:{name:'clip.webm',data,duration:40}};p.backgroundVideo={...defaultVideo(),asset:'clip',start:3.5,end:35.6};const e=newElement('video','video');e.video=p.backgroundVideo;p.scenes[0].elements.push(e);const result=parseProject(JSON.stringify(p));assert.deepEqual(result.videos.clip,p.videos.clip);assert.deepEqual(result.backgroundVideo,p.backgroundVideo);assert.equal(result.scenes[0].elements.at(-1)!.type,'video');delete (p as any).videos;delete (p as any).backgroundVideo;p.scenes[0].elements.pop();assert.deepEqual(Object.keys(parseProject(JSON.stringify(p)).videos),[]);});
test('documented video normalization, null exceptions, defaults and namespaces',()=>{
 const decode=(value:unknown)=>parseProject(JSON.stringify(value));
 const p=demoProject();p.videos={clip:{name:'clip.webm',data,duration:40}};
 for(const value of [undefined,null]){
  const result=decode({...p,videos:value,backgroundVideo:value});assert.deepEqual(Object.keys(result.videos),[]);assert.equal(result.backgroundVideo,null);
 }
 assert.deepEqual(decode({...p,backgroundVideo:{}}).backgroundVideo,defaultVideo());
 for(const type of ['video','text','image','shape','simulation'] as const){
  const e=newElement(type,'entry');const raw={...e} as Record<string,unknown>;delete raw.video;
  const project={...p,scenes:[{...p.scenes[0],elements:[raw]}]};
  assert.deepEqual(decode(project).scenes[0].elements[0].video,type==='video'?defaultVideo():null);
  raw.video=null;assert.equal(decode(project).scenes[0].elements[0].video,null);
  raw.video={asset:'clip'};assert.deepEqual(decode(project).scenes[0].elements[0].video,{...defaultVideo(),asset:'clip'});
  raw.video={asset:'missing'};assert.throws(()=>decode(project),/missing video/);
 }
 assert.equal(parseVideo({asset:'clip'},p.videos)!.end,null);assert.equal(parseVideo({asset:'clip',end:null},p.videos)!.end,null);
 for(const key of ['asset','start','loop','muted','volume','fit'])assert.throws(()=>parseVideo({[key]:null},p.videos));
 assert.throws(()=>parseVideo({start:86400},{}));assert.throws(()=>parseVideo({end:0},{}));
 assert.deepEqual(parseVideo({start:86399,end:86400},{}),{...defaultVideo(),start:86399,end:86400});
 const image='data:image/png;base64,AAAA';p.assets={clip:{name:'clip.png',data:image}};
 p.scenes[0].elements=[{...newElement('video','clip'),asset:'clip',fit:'contain',video:{...defaultVideo(),asset:'clip',fit:'cover'}}];p.scenes[0].id='clip';
 const same=decode(p);assert.equal(same.scenes[0].elements[0].fit,'contain');assert.equal(same.scenes[0].elements[0].video!.fit,'cover');
 assert.throws(()=>decode({...p,videos:{}}),/missing video/);assert.throws(()=>decode({...p,assets:{}}),/missing asset/);
 const shape=newElement('shape','shape');(shape as any).fillColor=null;p.scenes[0].elements=[shape];assert.equal(decode(p).scenes[0].elements[0].fillColor,shape.color);
});
