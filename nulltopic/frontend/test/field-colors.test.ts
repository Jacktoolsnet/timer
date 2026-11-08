import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
test('typing and autofill previews keep the themed inset surface even without an autofill pseudo-class',()=>{
 const start=css.indexOf(':root :is(input:not([type]), input[type=text]');
 assert.notEqual(start,-1);
 const rule=css.slice(start,css.indexOf('}',start));
 assert.match(rule,/input\[type=password\]/);
 assert.match(rule,/background-color: var\(--surface\) !important/);
 assert.match(rule,/box-shadow: inset 0 0 0 1000px var\(--surface\) !important/);
 assert.match(rule,/-webkit-text-fill-color: var\(--text\) !important/);
 assert.doesNotMatch(rule,/input\[type=(checkbox|radio|range)\]/);
 assert.match(css,/background-color: Field !important;\s*box-shadow: none !important;/);
});
test('fields and autofill use palette tokens instead of fixed browser colors',()=>{
 assert.match(css,/input,\s*select,\s*textarea\s*\{[^}]*background: var\(--surface\);\s*color: var\(--text\);/);
 for(const state of [':autofill',':-webkit-autofill']){
  const start=css.indexOf(':is(input, textarea, select)'+state+' {');
  assert.notEqual(start,-1);
  const rule=css.slice(start,css.indexOf('}',start));
  assert.match(rule,/0 0 0 1000px var\(--surface\) inset/);
  assert.match(rule,/-webkit-text-fill-color: var\(--text\)/);
  assert.match(rule,/caret-color: var\(--text\)/);
 }
 assert.match(css,/@media \(forced-colors: active\)[\s\S]*?:autofill[^}]*box-shadow: none; -webkit-text-fill-color: CanvasText;/);
});
