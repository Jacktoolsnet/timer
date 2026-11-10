import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {showSuccessToast,showErrorToast,dismissToast} from '../src/scripts/toast';
const tick=(ms=0)=>new Promise(r=>setTimeout(r,ms));
test('success toast is plain text, accessible, replaceable and closes without stealing focus',()=>{
 const dom=new JSDOM('<button id="copy">Copy</button><div id="toast-region" role="status" aria-live="polite" aria-atomic="true"></div>'),d=dom.window.document;
 try{const copy=d.querySelector<HTMLButtonElement>('#copy')!;copy.focus();showSuccessToast('<img src=x onerror=alert(1)>',d);assert.equal(d.activeElement,copy);assert.equal(d.querySelector('.app-toast img'),null);assert.equal(d.querySelector('.app-toast-message')!.textContent,'<img src=x onerror=alert(1)>');assert.equal(d.querySelector<HTMLElement>('.app-toast')!.dataset.kind,'success');
 showSuccessToast('Second action',d);assert.equal(d.querySelectorAll('.app-toast').length,1);const close=d.querySelector<HTMLButtonElement>('.app-toast-close')!;assert.equal(close.getAttribute('aria-label'),'Close');close.focus();close.click();assert.equal(d.querySelector('.app-toast'),null);assert.equal(d.activeElement,copy);
 }finally{dismissToast(d);dom.window.close();}
});
test('toast expiry pauses on interaction and page departure removes it',async()=>{
 const dom=new JSDOM('<button>Copy</button>'),d=dom.window.document;
 try{showSuccessToast('Copied',d,25);d.querySelector('.app-toast')!.dispatchEvent(new dom.window.Event('pointerenter'));await tick(50);assert.ok(d.querySelector('.app-toast'));d.querySelector('.app-toast')!.dispatchEvent(new dom.window.Event('pointerleave'));await tick(50);assert.equal(d.querySelector('.app-toast'),null);
 showSuccessToast('Copied again',d);dom.window.dispatchEvent(new dom.window.Event('pagehide'));assert.equal(d.querySelector('.app-toast'),null);
 }finally{dismissToast(d);dom.window.close();}
});

test('toast uses the selected palette, a non-button success SVG and a three-second default',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8'),source=readFileSync(new URL('../src/scripts/toast.ts',import.meta.url),'utf8');
 assert.match(css,/\.app-toast \{ --toast-tone: var\(--accent\);/);assert.match(source,/duration = 3000/);
 const dom=new JSDOM('<button>Copy</button>'),d=dom.window.document;
 try{showSuccessToast('Copied',d);assert.equal(d.querySelectorAll('.app-toast button').length,1);assert.ok(d.querySelector('.app-toast-icon svg circle'));assert.equal(d.querySelector('.app-toast-icon')!.getAttribute('aria-hidden'),'true');}finally{dismissToast(d);dom.window.close();}
});


test('error toast has an alert announcement and error SVG without changing the palette or focus',()=>{
 const dom=new JSDOM('<button>Send</button>'),d=dom.window.document;
 try{const button=d.querySelector<HTMLButtonElement>('button')!;button.focus();showErrorToast('<script>literal</script>',d);assert.equal(d.activeElement,button);assert.equal(d.querySelector('.app-toast script'),null);assert.equal(d.querySelector('.app-toast-message')!.textContent,'<script>literal</script>');assert.equal(d.querySelector<HTMLElement>('.app-toast')!.dataset.kind,'error');assert.equal(d.querySelector('#toast-region')!.getAttribute('role'),'alert');assert.equal(d.querySelector('#toast-region')!.getAttribute('aria-live'),'assertive');assert.equal(d.querySelector('.app-toast-icon path')!.getAttribute('d'),'M12 7v6m0 4h.01');
 showSuccessToast('Done',d);assert.equal(d.querySelectorAll('.app-toast').length,1);assert.equal(d.querySelector('#toast-region')!.getAttribute('aria-live'),'polite');assert.equal(d.querySelector('#toast-region')!.getAttribute('role'),'status');}finally{dismissToast(d);dom.window.close();}
});
