import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('NullTopic serves its own German imprint with the unchanged Company provider details',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/impressum/index.html',import.meta.url),'utf8'));
 try{
  const article=dom.window.document.querySelector('.legal-notice article')!;assert.ok(article);assert.equal(article.getAttribute('lang'),'de');assert.equal(article.getAttribute('translate'),'no');
  const company=readFileSync(new URL('../../../company/src/pages/impressum.astro',import.meta.url),'utf8');
  for(const value of ['JackTools.Net UG (haftungsbeschränkt)','Im Kirchfeld 27','38304 Wolfenbüttel','Christian Wagner, Dipl.-Inform. (FH)','Amtsgericht Ingolstadt','HRB 5933','DE277133529','jacktoolsnet@gmail.com','Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.']){assert.ok(company.includes(value));assert.ok(article.textContent!.includes(value));}
  assert.equal(article.querySelector('a[href^="tel:"]')!.getAttribute('href'),'tel:+4917641235774');assert.equal(article.querySelector('a[href^="mailto:"]')!.getAttribute('href'),'mailto:jacktoolsnet@gmail.com');assert.equal(dom.window.document.querySelector('.hero'),null);
 }finally{dom.window.close();}
});
test('footer imprint navigation stays on NullTopic; privacy and terms also stay on NullTopic',()=>{
 for(const page of ['index.html','operator/index.html','administration/index.html','impressum/index.html']){
  const dom=new JSDOM(readFileSync(new URL('../dist/'+page,import.meta.url),'utf8'));
  try{const footer=dom.window.document.querySelector('footer.site-footer')!;assert.ok(footer.querySelector('a[href="/impressum"]'));assert.equal(footer.querySelector('a[href="https://jacktools.net/impressum/"]'),null);assert.ok(footer.querySelector('a[href="/datenschutz"]'));assert.ok(footer.querySelector('a[href="/nutzungsbedingungen"]'));}finally{dom.window.close();}
 }
});

import {initializeImprint} from '../src/scripts/impressum';
import {initializeHumanLanguage} from '../src/lib/i18n';
import {imprintCopy} from '../src/lib/imprint-copy';
for(const language of ['en','de','es','fr'] as const)test('imprint language and German-authority notice: '+language,()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/impressum/index.html',import.meta.url),'utf8'));const before=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
 try{
  const d=dom.window.document;d.documentElement.lang=language;initializeHumanLanguage(d);initializeImprint();const article=d.getElementById('imprint-document')!,notice=d.getElementById('imprint-translation-notice')!;
  assert.equal(article.lang,language);assert.equal(article.getAttribute('aria-label'),imprintCopy[language].title);assert.equal(d.getElementById('imprint-title')!.textContent,imprintCopy[language].title);assert.equal(article.querySelector('h2')!.textContent,imprintCopy[language].provider);assert.ok(article.textContent!.includes(imprintCopy[language].disputeText));
  assert.equal(notice.hidden,language==='de');if(language!=='de'){assert.ok(notice.textContent!.includes(imprintCopy[language].translationNotice));assert.equal(notice.querySelector('a')!.getAttribute('href'),'/impressum?lang=de');assert.equal(notice.querySelector('a')!.textContent,imprintCopy[language].original);}
  for(const value of ['JackTools.Net UG (haftungsbeschränkt)','Im Kirchfeld 27','38304 Wolfenbüttel','Christian Wagner, Dipl.-Inform. (FH)','Amtsgericht Ingolstadt','HRB 5933','DE277133529','jacktoolsnet@gmail.com'])assert.ok(article.textContent!.includes(value));
  const footer=d.querySelector('.site-footer a[href="/impressum"]')!;assert.equal(footer.textContent,imprintCopy[language].title);assert.ok(!footer.textContent!.includes('(DE)'));assert.equal(article.querySelector('a[href^="mailto:"]')!.getAttribute('href'),'mailto:jacktoolsnet@gmail.com');
 }finally{dom.window.close();if(before)Object.defineProperty(globalThis,'document',before);else Reflect.deleteProperty(globalThis,'document');}
});
