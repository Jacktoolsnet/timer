import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPostImage} from '../src/scripts/post-image';
import {installDialogMock} from './dialog-mock';
const id='11111111-1111-4111-8111-111111111111';
const value={url:'/api/posts/'+id+'/image',width:100,height:80,description:'<script>literal animation</script>',aiGenerated:true,animated:true,frames:2,durationMs:100};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,figure:HTMLElement)=>Promise<void>|void,language='en',privateImage=false){
 const dom=new JSDOM(`<html lang="${language}"><body><article id="animation-post"></article></body></html>`,{pretendToBeVisual:true,url:'http://localhost'});installDialogMock(dom);
 const saved=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{const figure=renderPostImage({...value,url:privateImage?'/api/case-images/'+id:value.url});dom.window.document.querySelector('article')!.append(figure);await run(dom,figure);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();if(saved)Object.defineProperty(globalThis,'document',saved);else Reflect.deleteProperty(globalThis,'document');}
}
for(const lang of ['en','de','es','fr'])test('animations start with static posters and use localized explicit play/pause: '+lang,async()=>fixture((_dom,figure)=>{
 const image=figure.querySelector('img')!,play=figure.querySelector<HTMLButtonElement>('.image-animation-control')!;assert.equal(image.getAttribute('src'),value.url+'?preview=true');assert.equal(play.getAttribute('aria-pressed'),'false');assert.ok(play.getAttribute('aria-label'));assert.equal(play.dataset.tooltip,play.getAttribute('aria-label'));assert.equal(play.textContent,'');assert.ok(figure.textContent!.includes(value.description));assert.equal(figure.querySelector('script'),null);
 play.click();assert.equal(image.getAttribute('src'),value.url);assert.equal(play.getAttribute('aria-pressed'),'true');play.click();assert.equal(image.getAttribute('src'),value.url+'?preview=true');assert.equal(play.getAttribute('aria-pressed'),'false');
},lang));
test('playback returns to poster after one run and stops on hidden tabs, removal and errors',async()=>fixture(async(dom,figure)=>{
 const image=figure.querySelector('img')!,play=figure.querySelector<HTMLButtonElement>('.image-animation-control')!;play.click();image.dispatchEvent(new dom.window.Event('load'));await new Promise(r=>setTimeout(r,230));assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(image.getAttribute('src'),value.url+'?preview=true');
 play.click();Object.defineProperty(dom.window.document,'hidden',{value:true,configurable:true});dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(play.getAttribute('aria-pressed'),'false');Object.defineProperty(dom.window.document,'hidden',{value:false,configurable:true});
 play.click();figure.remove();await tick();assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(image.getAttribute('src'),null);
 dom.window.document.body.append(figure);play.click();image.dispatchEvent(new dom.window.Event('error'));assert.equal(play.disabled,true);
}));
test('zoom overlay also starts static, controls its own animation and survives stream poster/animation swaps',async()=>fixture(async(dom,figure)=>{
 const d=dom.window.document;figure.querySelector<HTMLButtonElement>('.post-image-trigger')!.click();const dialog=d.querySelector<HTMLDialogElement>('#image-viewer')!,image=dialog.querySelector('img')!,play=dialog.querySelector<HTMLButtonElement>('.image-animation-control')!;
 assert.equal(image.getAttribute('src'),value.url+'?preview=true');assert.equal(dialog.querySelectorAll('button').length,5);play.click();assert.equal(image.getAttribute('src'),value.url);await tick();assert.equal(dialog.open,true);
 const source=figure.querySelector<HTMLButtonElement>('.image-animation-control')!;source.click();await tick();source.click();await tick();assert.equal(dialog.open,true,'poster swapping does not look like message deletion');
 dialog.querySelector<HTMLButtonElement>('[data-image-close]')!.click();assert.equal(d.querySelector('#image-viewer'),null);assert.equal(image.getAttribute('src'),null);
}));
test('private animation and poster share the case endpoint; clearing the workspace removes the overlay',async()=>fixture(async(dom,figure)=>{
 const d=dom.window.document;assert.equal(figure.querySelector('img')!.getAttribute('src'),'/api/case-images/'+id+'?preview=true');figure.querySelector<HTMLButtonElement>('.post-image-trigger')!.click();const dialog=d.querySelector<HTMLDialogElement>('#image-viewer')!;dialog.querySelector<HTMLButtonElement>('.image-animation-control')!.click();d.querySelector('article')!.hidden=true;await tick();assert.equal(dialog.isConnected,false);
},'en',true));

test('animation preview isolates its header layout and groups mobile playback/zoom controls',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.image-viewer > header \{ display: block; width: 100%; max-width: none; min-width: 0; margin: 0;/);
 assert.ok(css.includes('grid-template-areas:"close play fit" "minus amount plus"'));
});
