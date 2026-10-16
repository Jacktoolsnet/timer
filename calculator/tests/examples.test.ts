import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildExample,exampleDefinitions,exampleIds} from '../src/lib/examples.ts';
import {calculate,fixed,validateDocument} from '../src/lib/calculation.ts';
test('all localized examples are valid, named and calculate expected totals',()=>{
 for(const lang of ['de','en','es','fr'] as const)for(const id of exampleIds){
  const doc=buildExample(lang,id);assert.deepEqual(validateDocument(doc),doc);assert.equal(doc.steps.length,exampleDefinitions[lang][id].names.length);assert.ok(doc.steps.every(s=>s.name.trim()));
  const expected={family:'1420.00',holiday:'300.00',craft:'3696.74'};assert.equal(fixed(calculate(doc).result!,2),expected[id]);
 }
});
test('templates are independent fresh documents',()=>{const first=buildExample('de','family');first.steps[0].value='1';first.steps[0].enabled=false;assert.equal(buildExample('de','family').steps[0].value,'3200');assert.equal(buildExample('de','family').steps[0].enabled,true);});
