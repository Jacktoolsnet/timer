import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import documents from '../src/lib/visitor-legal-copy.json';
import {initializeHumanLanguage} from '../src/lib/i18n';

for(const [route,kind] of [['datenschutz','privacy'],['nutzungsbedingungen','terms']] as const){
 for(const language of ['de','en'] as const)test(`static visitor document: ${route}/${language}`,()=>{
  const path=route+(language==='en'?'/en':'')+'/index.html';
  const dom=new JSDOM(readFileSync(new URL('../dist/'+path,import.meta.url),'utf8'));
  try{
   const d=dom.window.document,section=d.querySelector<HTMLElement>('.visitor-legal')!,article=section.querySelector('article')!,copy=documents[kind][language];
   assert.equal(section.lang,language);assert.equal(section.getAttribute('translate'),'no');assert.equal(section.dataset.legalKind,kind);assert.equal(section.dataset.legalVersion,'2026-11-10-visitor-draft-1');assert.equal(section.querySelector('h1')!.textContent,copy.title);
   assert.equal(article.getAttribute('aria-label'),copy.title);assert.equal(article.querySelectorAll('h2').length,copy.sections.length);
   for(const {heading,paragraphs} of copy.sections){assert.ok(article.textContent!.includes(heading));for(const paragraph of paragraphs)assert.ok(article.textContent!.includes(paragraph));}
   for(const link of section.querySelectorAll<HTMLAnchorElement>('.legal-contents a'))assert.ok(d.getElementById(link.hash.slice(1)));
   assert.equal(section.querySelectorAll('.legal-translation-notice').length,language==='en'?2:1);
   assert.ok(section.querySelector(`a[hreflang="de"][href="/${route}"]`));assert.ok(section.querySelector(`a[hreflang="en"][href="/${route}/en"]`));
   assert.ok(section.querySelector('.legal-draft-notice'));assert.equal(section.querySelector('.legal-related'),null);assert.ok(article.textContent!.includes('jacktoolsnet@gmail.com'));assert.ok(d.querySelector('footer a[href="/datenschutz"]'));assert.ok(d.querySelector('footer a[href="/nutzungsbedingungen"]'));assert.ok(d.querySelector('footer a[href="/impressum"]'));
   assert.equal(section.querySelector('form,iframe,input,dialog'),null);assert.equal(d.querySelector('script[src*="google"],script[src*="adsbygoogle"],.ad-slot'),null);
   assert.ok(article.textContent!.includes('JackTools.Net UG (haftungsbeschränkt)'));assert.ok(article.textContent!.includes('38304 Wolfenbüttel'));
  }finally{dom.window.close();}
 });
}
test('visitor legal bodies are never machine-translated with the surrounding human UI',()=>{
 for(const route of ['datenschutz','datenschutz/en','nutzungsbedingungen','nutzungsbedingungen/en'])for(const language of ['de','en','es','fr']){
  const dom=new JSDOM(readFileSync(new URL('../dist/'+route+'/index.html',import.meta.url),'utf8'));
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
  try{const d=dom.window.document,section=d.querySelector('.visitor-legal')!,before=section.innerHTML;d.documentElement.lang=language;initializeHumanLanguage(d);assert.equal(section.innerHTML,before);assert.ok(d.querySelector('footer a[href="/datenschutz"]'));assert.ok(d.querySelector('footer a[href="/nutzungsbedingungen"]'));}finally{dom.window.close();if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else Reflect.deleteProperty(globalThis,'document');}
 }
});
test('German and service translation keep section parity and describe advertising as not active',()=>{
 for(const kind of ['privacy','terms'] as const)assert.equal(documents[kind].de.sections.length,documents[kind].en.sections.length);
 const de=JSON.stringify(documents.privacy.de),en=JSON.stringify(documents.privacy.en);
 for(const marker of ['nulltopic.storage-consent.v1','nulltopic.appearance.v1','nulltopic.language.v1','nt_session']){assert.ok(de.includes(marker));assert.ok(en.includes(marker));}
 assert.match(de,/derzeit nicht aktiv/);assert.match(en,/not currently active/);assert.match(de,/sechs Kalendermonaten/);assert.match(en,/six calendar months/);
 assert.match(JSON.stringify(documents.terms.de),/keine pauschale Datenschutz- oder Werbeeinwilligung/);
 assert.match(JSON.stringify(documents.terms.en),/not blanket privacy or advertising consent/);
});
