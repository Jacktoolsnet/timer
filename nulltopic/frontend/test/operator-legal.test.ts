import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import documents from '../src/lib/operator-legal-copy.json';
import {operatorLegal} from '../../shared/operator-legal';
import {initializeHumanLanguage} from '../src/lib/i18n';
for(const kind of ['terms','privacy'] as const)for(const language of ['de','en'] as const){
 test(`static operator legal document ${kind}/${language} is readable, versioned, printable and ad-free`,()=>{
  const route=operatorLegal[kind].path+(language==='en'?'/en':'');
  const dom=new JSDOM(readFileSync(new URL('../dist'+route+'/index.html',import.meta.url),'utf8'));
  try{
   const d=dom.window.document,section=d.querySelector<HTMLElement>('.operator-legal')!,article=section.querySelector('article')!,copy=documents[kind][language];
   assert.equal(section.lang,language);assert.equal(section.getAttribute('translate'),'no');assert.equal(section.dataset.legalVersion,operatorLegal[kind].version);assert.equal(section.querySelector('h1')!.textContent,copy.title);
   for(const {heading,paragraphs}of copy.sections){assert.ok(article.textContent!.includes(heading));for(const text of paragraphs)assert.ok(article.textContent!.includes(text));}
   assert.equal(section.querySelectorAll('.legal-translation-notice').length,(kind==='privacy'?1:0)+(language==='en'?1:0));
   for(const link of section.querySelectorAll<HTMLAnchorElement>('.legal-contents a'))assert.ok(d.getElementById(link.hash.slice(1)));
   assert.ok(section.querySelector('[data-print-legal]'));assert.ok(section.querySelector(`a[href="${operatorLegal[kind].path}"][hreflang=de]`));assert.ok(section.querySelector(`a[href="${operatorLegal[kind].path}/en"][hreflang=en]`));
   assert.equal(section.querySelector('input,dialog,form,iframe'),null);assert.equal(d.querySelector('.ad-slot,script[src*="google"]'),null);assert.equal(d.querySelector('dialog[open]'),null);
   assert.ok(article.textContent!.includes('support@nulltopic.com'));assert.doesNotMatch(article.textContent!,/jacktoolsnet@gmail.com|prototype|Prototyp/i);
  }finally{dom.window.close();}
 });
}
test('operator legal bodies remain in their chosen language under every human UI language',()=>{
 for(const kind of ['terms','privacy'] as const)for(const language of ['de','en'] as const){
  const dom=new JSDOM(readFileSync(new URL('../dist'+operatorLegal[kind].path+(language==='en'?'/en':'')+'/index.html',import.meta.url),'utf8'));
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
  try{const d=dom.window.document,section=d.querySelector('.operator-legal')!,before=section.innerHTML;for(const ui of ['de','en','es','fr']){d.documentElement.lang=ui;initializeHumanLanguage(d);assert.equal(section.innerHTML,before);}}finally{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
 }
});
test('operator editions have matching sections and distinguish agreement, privacy information and publication scope',()=>{
 for(const kind of ['terms','privacy'] as const){assert.equal(documents[kind].de.sections.length,documents[kind].en.sections.length);for(let i=0;i<documents[kind].de.sections.length;i++)assert.equal(documents[kind].de.sections[i].paragraphs.length,documents[kind].en.sections[i].paragraphs.length);}
 assert.match(JSON.stringify(documents.terms.de),/keine Werbeeinwilligung/);assert.match(JSON.stringify(documents.privacy.de),/nicht dessen tatsächliches Lesen/);
 assert.match(JSON.stringify(documents.terms.de),/keine verschuldensunabhängige Haftung/);assert.match(JSON.stringify(documents.terms.de),/1.000.000 Eingabebytes/);
 assert.match(JSON.stringify(documents.privacy.de),/sechs Kalendermonate/);assert.match(JSON.stringify(documents.privacy.de),/35 Tage/);
});

test('operator terms add to the general visitor terms, with matching English copy and preserved prior edition',()=>{
 assert.match(documents.terms.de.sections[0].paragraphs[0],/Diese Operator-Nutzungsbedingungen gelten zusätzlich zu den allgemeinen Nutzungsbedingungen für Besucher\./);
 assert.match(documents.terms.en.sections[0].paragraphs[0],/These operator terms apply in addition to the general terms of use for visitors\./);
 const archive=JSON.parse(readFileSync(new URL('../../docs/legal-archive/2026-11-10-operator-terms-1.json',import.meta.url),'utf8'));
 assert.match(archive.terms.de.sections[0].paragraphs[0],/Besucherbedingungen gelten ergänzend für das Lesen und Melden/);
 assert.notEqual(operatorLegal.terms.version,archive.version);
 for(const language of ['de','en'] as const){
  const dom=new JSDOM(readFileSync(new URL('../dist'+operatorLegal.terms.path+(language==='en'?'/en':'')+'/index.html',import.meta.url),'utf8'));
  try{assert.match(dom.window.document.querySelector('.legal-version')!.textContent!,language==='de'?/12\. November 2026/:/12 November 2026/);}finally{dom.window.close();}
 }
});

test('recovery wording explicitly names the operator account in both editions',()=>{
 assert.match(documents.terms.de.sections[1].paragraphs[1],/Wiederherstellung deines Operator-Kontos über einen zuvor ausdrücklich freigegebenen Agenten/);
 assert.match(documents.terms.en.sections[1].paragraphs[1],/recovery of your operator account through a previously expressly authorised agent/);
});
