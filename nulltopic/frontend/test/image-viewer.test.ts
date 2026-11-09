import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPostImage} from '../src/scripts/post-image';
import {installDialogMock} from './dialog-mock';
const id='11111111-1111-4111-8111-111111111111',value={url:'/api/posts/'+id+'/image',width:1024,height:640,description:'<script>literal</script> Settings',aiGenerated:true};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fixture(run:(dom:JSDOM,trigger:HTMLButtonElement)=>Promise<void>|void,lang='en',privateImage=false){
 const dom=new JSDOM(`<html lang="${lang}"><body><article id="post-${id}"></article></body></html>`,{url:'http://localhost',pretendToBeVisual:true});installDialogMock(dom);const original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{const figure=renderPostImage({...value,url:privateImage?'/api/case-images/'+id:value.url});dom.window.document.querySelector('article')!.append(figure);await run(dom,figure.querySelector('button')!);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
}
for(const lang of ['en','de','es','fr'])test('image preview is modal, localized, literal and focus-restoring: '+lang,async()=>fixture((dom,trigger)=>{
 trigger.focus();trigger.click();const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#image-viewer')!;assert.ok(dialog.open);assert.equal(dialog.getAttribute('aria-labelledby'),'image-viewer-title');assert.equal(dialog.querySelector('.image-viewer-description')!.textContent,value.description);assert.equal(dialog.querySelector('script'),null);assert.equal(dialog.querySelector('img')!.alt,value.description);assert.equal(d.activeElement,dialog.querySelector('[data-image-close]'));assert.equal(dialog.querySelectorAll('button').length,4);
 for(const b of dialog.querySelectorAll('button')){assert.equal(b.textContent,'');assert.ok(b.getAttribute('aria-label'));assert.equal(b.dataset.tooltip,b.getAttribute('aria-label'));}
 trigger.click();assert.equal(d.querySelectorAll('#image-viewer').length,1);dialog.querySelector<HTMLButtonElement>('[data-image-close]')!.click();assert.equal(d.querySelector('#image-viewer'),null);assert.equal(d.activeElement,trigger);
},lang));
test('zoom is bounded, resettable and keyboard-accessible without hijacking browser zoom',async()=>fixture((dom,trigger)=>{
 trigger.click();const d=dom.window.document,dialog=d.querySelector<HTMLDialogElement>('#image-viewer')!,buttons=dialog.querySelectorAll<HTMLButtonElement>('button'),minus=buttons[1],plus=buttons[2],reset=buttons[3],image=dialog.querySelector('img')!,viewport=dialog.querySelector<HTMLElement>('.image-viewer-viewport')!;
 assert.ok(plus.disabled);image.dispatchEvent(new dom.window.Event('load'));assert.equal(plus.disabled,false);assert.ok(minus.disabled);assert.equal(dialog.querySelector('output')!.textContent,'100%');const width=parseInt(image.style.width);
 plus.click();assert.equal(dialog.querySelector('output')!.textContent,'150%');assert.ok(parseInt(image.style.width)>width);for(let n=0;n<12;n++)plus.click();assert.equal(dialog.querySelector('output')!.textContent,'400%');assert.ok(plus.disabled);
 viewport.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'-',bubbles:true}));assert.equal(dialog.querySelector('output')!.textContent,'350%');viewport.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'+',ctrlKey:true,bubbles:true}));assert.equal(dialog.querySelector('output')!.textContent,'350%');reset.click();assert.equal(dialog.querySelector('output')!.textContent,'100%');assert.ok(reset.disabled);
 viewport.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'+',bubbles:true}));assert.equal(dialog.querySelector('output')!.textContent,'150%');viewport.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'0',bubbles:true}));assert.equal(dialog.querySelector('output')!.textContent,'100%');
}));
test('unavailable media leaves a readable description and a working cancel action',async()=>fixture((dom,trigger)=>{
 trigger.click();const dialog=dom.window.document.querySelector<HTMLDialogElement>('#image-viewer')!;dialog.querySelector('img')!.dispatchEvent(new dom.window.Event('error'));assert.match(dialog.querySelector('[role=status]')!.textContent!,/no longer available/);assert.equal(dialog.querySelector('img')!.hidden,true);assert.equal(dialog.querySelectorAll('button:disabled').length,3);dialog.dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(dialog.isConnected,false);
}));
test('public stream replacements preserve the viewer, but removing the message closes it',async()=>fixture(async(dom,trigger)=>{
 trigger.click();const d=dom.window.document,article=d.querySelector('article')!;article.replaceChildren(renderPostImage(value));await tick();assert.ok(d.querySelector('#image-viewer'));article.remove();await tick();assert.equal(d.querySelector('#image-viewer'),null);
}));
test('private media closes when its workspace is cleared, even without navigation',async()=>fixture(async(dom,trigger)=>{
 trigger.click();dom.window.document.querySelector('article')!.hidden=true;await tick();assert.equal(dom.window.document.querySelector('#image-viewer'),null);
},'en',true));
