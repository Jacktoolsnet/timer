import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
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
 assert.match(css,/@media \(forced-colors: active\)\s*\{[^}]*:autofill[^}]*box-shadow: none; -webkit-text-fill-color: CanvasText;/);
});
