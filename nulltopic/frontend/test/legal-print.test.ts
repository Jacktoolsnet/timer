import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('legal documents expose a labelled native print action without changing document content',()=>{
 for(const route of ['datenschutz','datenschutz/en','nutzungsbedingungen','nutzungsbedingungen/en','impressum','operator/datenschutz','operator/datenschutz/en','operator/nutzungsbedingungen','operator/nutzungsbedingungen/en']){
  const dom=new JSDOM(readFileSync(new URL('../dist/'+route+'/index.html',import.meta.url),'utf8'));
  try{const d=dom.window.document,button=d.querySelector<HTMLButtonElement>('.legal-notice [data-print-legal]')!;assert.ok(button);assert.equal(button.type,'button');assert.ok(button.getAttribute('aria-label'));assert.equal(button.dataset.tooltip,button.getAttribute('aria-label'));assert.ok(button.querySelector('svg[aria-hidden=true]'));assert.ok(d.querySelector('.legal-notice article'));}finally{dom.window.close();}
 }
 const script=readFileSync(new URL('../src/components/LegalPrintButton.astro',import.meta.url),'utf8');assert.match(script,/window\.print\(\)/);assert.doesNotMatch(script,/fetch\(|localStorage|sessionStorage/);
});
test('legal print styles retain notices and text but strip theme chrome and avoid orphaned headings',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8').split('/* Scoped to legal pages:')[1];assert.ok(css);
 for(const rule of ['@media print','size:A4','body:has(.legal-notice)>:not(main)','font-size:11pt','orphans:3;widows:3','break-after:avoid-page','.legal-translation-notice[hidden]','background:#fff','color:#000'])assert.ok(css.includes(rule),rule);
 assert.match(css,/\.legal-translation-notice\{display:block!important/);assert.match(css,/\.legal-notice article\{display:block!important/);
 assert.doesNotMatch(css,/article\{[^}]*break-inside:avoid/);
});

test('print icons cannot be squeezed by default button padding or flex shrink',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 const button=css.match(/\.legal-notice \.legal-print-button\{([^}]+)\}/)![1];for(const rule of ['width:48px','height:48px','padding:0','color:var(--accent)'])assert.ok(button.includes(rule));
 const icon=css.match(/\.legal-notice \.legal-print-button svg\{([^}]+)\}/)![1];for(const rule of ['width:26px','height:26px','flex-shrink:0','stroke-width:2'])assert.ok(icon.includes(rule));
});
