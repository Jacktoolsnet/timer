import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usageText} from '../src/lib/usage-text.ts';
test('usage translations have matching nonempty sections and unique link targets',()=>{
 const ids=usageText.de.sections.map(s=>s.id);
 for(const content of Object.values(usageText)){
  assert.ok(content.title&&content.description&&content.intro&&content.notice);assert.deepEqual(content.sections.map(s=>s.id),ids);assert.equal(new Set(ids).size,ids.length);
  for(const section of content.sections){assert.ok(section.title);const text=[...(section.paragraphs||[]),...(section.items||[])];assert.ok(text.length);assert.ok(text.every(t=>t.trim().length>0));}
 }
});
