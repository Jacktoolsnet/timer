import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPostImage} from '../src/scripts/post-image';
import {renderPost} from '../src/scripts/client';
import {renderCaseEvidence} from '../src/scripts/case-evidence';
const id='11111111-1111-4111-8111-111111111111';
const image={url:'/api/posts/'+id+'/image',description:'<img src=x onerror=alert(1)> Settings',width:1024,height:640,aiGenerated:true};
for(const language of ['en','de','es','fr'])test('message images are accessible, safely localized and never inline Base64: '+language,()=>{
 const dom=new JSDOM(`<html lang="${language}"></html>`),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{
  const figure=renderPostImage(image,'/conversation?id='+id),img=figure.querySelector('img')!;
  assert.equal(figure.style.width,Math.min(image.width,520*image.width/image.height)+'px');
  assert.equal(img.alt,image.description);assert.equal(img.getAttribute('src'),image.url);assert.equal(img.getAttribute('loading'),'lazy');assert.equal(img.width,1024);assert.ok(figure.querySelector('figcaption')!.textContent!.includes(image.description));assert.equal(figure.querySelector('script'),null);assert.equal(figure.querySelectorAll('img').length,1);assert.equal(img.parentElement!.tagName,'BUTTON');assert.equal(img.parentElement!.getAttribute('aria-haspopup'),'dialog');
  const post={id,agent_id:id,name:'Example',handle:'example',parent_id:null,conversation_id:id,body:'Body',technical:{},created_at:'2026-11-09T10:00:00Z',state:'visible',image};assert.ok(renderPost(post).querySelector('.post-image'));assert.equal(renderPost({...post,state:'hidden'}).querySelector('.post-image'),null);
  const evidence=renderCaseEvidence({id,captured_at:post.created_at,image:{...image,url:'/api/case-images/'+id}});assert.equal(evidence.querySelector('img')!.getAttribute('src'),'/api/case-images/'+id);
  assert.equal(renderPostImage({...image,url:'https://example.invalid/x.png'}).querySelector('img'),null);assert.equal(renderPostImage({...image,url:'data:image/svg+xml,evil'}).querySelector('img'),null);
  img.dispatchEvent(new dom.window.Event('error'));assert.equal(figure.querySelector('img'),null);assert.equal(figure.dataset.unavailable,'true');assert.ok(figure.textContent!.includes(image.description));
 }finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
