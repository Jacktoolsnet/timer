import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import documents from '../src/lib/agent-privacy-copy.json';
import {agentPrivacy} from '../../shared/agent-privacy';
import {initializeHumanLanguage} from '../src/lib/i18n';
import {PUBLIC_PAGE_PATHS,productionAdLocation} from '../src/lib/advertising';
for(const language of ['de','en'] as const)test(`agent privacy ${language} is complete, pinned, printable, linked and ad-free`,()=>{
 const route=agentPrivacy.path+(language==='en'?'/en':'');
 const dom=new JSDOM(readFileSync(new URL('../dist'+route+'/index.html',import.meta.url),'utf8'));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{
  const d=dom.window.document,section=d.querySelector<HTMLElement>('.agent-privacy')!,copy=documents[language];
  assert.equal(section.lang,language);assert.equal(section.getAttribute('translate'),'no');assert.equal(section.dataset.legalVersion,agentPrivacy.version);
  assert.equal(section.querySelector('h1')!.textContent,copy.title);
  for(const chapter of copy.sections)for(const paragraph of chapter.paragraphs)assert.ok(section.querySelector('article')!.textContent!.includes(paragraph));
  for(const link of section.querySelectorAll<HTMLAnchorElement>('.legal-contents a'))assert.ok(d.getElementById(link.hash.slice(1)));
  assert.ok(section.querySelector('[data-print-legal]'));assert.ok(section.querySelector('.legal-draft-notice'));
  assert.ok(section.querySelector('a[href="/agent/datenschutz"][hreflang="de"]'));assert.ok(section.querySelector('a[href="/agent/datenschutz/en"][hreflang="en"]'));
  if(language==='en')assert.match(section.textContent!,/German original is authoritative/);
  assert.ok(d.querySelector('footer a[href="/agent/datenschutz"]'));
  assert.equal(d.querySelector('[data-ad-placement],ins.adsbygoogle,script[src*="googlesyndication"],dialog[open]'),null);
  assert.equal(PUBLIC_PAGE_PATHS.includes(route),false);assert.equal(productionAdLocation({hostname:'nulltopic.com',protocol:'https:',pathname:route}),false);
  const before=section.innerHTML;for(const ui of ['de','en','es','fr']){d.documentElement.lang=ui;initializeHumanLanguage(d);assert.equal(section.innerHTML,before);}
 }finally{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
test('agent privacy translations retain parity and distinguish people, public counts, readmarks and case media',()=>{
 assert.equal(documents.de.sections.length,documents.en.sections.length);
 documents.de.sections.forEach((s,i)=>assert.equal(s.paragraphs.length,documents.en.sections[i].paragraphs.length));
 const de=JSON.stringify(documents.de),en=JSON.stringify(documents.en);
 for(const term of ['natürliche Person','Anzahlen','Abrufstände','24 Stunden','Animation','Vorschaubild','sechs Kalendermonate','support@nulltopic.com'])assert.ok(de.includes(term));
 for(const term of ['natural person','counts','readmarks','24 hours','animation','poster','six calendar months'])assert.ok(en.includes(term));
 assert.doesNotMatch(de,/verifiziertes Modell|Werbeeinwilligung durch den Agenten/);
});
