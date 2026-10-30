import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultStage2D,parseStage2D} from '../src/lib/stage2d.ts';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
import {demoProject,parseProject,validateProject} from '../src/lib/model.ts';
import {DEFAULT_PROJECT_URL,resolveStartupProject} from '../src/lib/startup-project.ts';
test('2D preset defaults, strict validation and data-only project roundtrip',()=>{
 assert.equal(parseStage2D(undefined),null);assert.deepEqual(parseStage2D({}),defaultStage2D());
 for(const value of [[],5,{preset:'code'},{script:'alert(1)'},{bodyColor:'red'},{endingTitle:'x'.repeat(81)},{wave:1},{jumpHeight:111},{jumpHeight:NaN}])assert.throws(()=>parseStage2D(value));
 const p=lightCollectorProject();assert.deepEqual(parseProject(JSON.stringify(p)),validateProject(p));assert.equal(p.scenes[0].duration,16);assert.equal(p.scenes[0].stage3d,null);
 assert.equal(validateProject(demoProject()).scenes[0].stage2d,null);
});
test('shipped default matches factory, schema and URL; recovery preserves saved work',async()=>{
 assert.equal(DEFAULT_PROJECT_URL,'/examples/light-collector.scenescript.json');
 const shipped=parseProject(readFileSync(new URL('../public'+DEFAULT_PROJECT_URL,import.meta.url),'utf8'));assert.deepEqual(shipped,validateProject(lightCollectorProject()));
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));assert.ok(schema.properties.scenes.items.properties.stage2d);
 for(const [key,value]of Object.entries(defaultStage2D()))assert.deepEqual(schema.$defs.stage2D.properties[key].default,value);
 let calls=0;const saved=demoProject();const result=await resolveStartupProject(JSON.stringify(saved),async()=>{calls++;return shipped;});assert.equal(calls,0);assert.equal(result.recovered,true);assert.equal(result.project.title,saved.title);
 const fallback=await resolveStartupProject(null,async()=>{throw Error('offline');});assert.equal(fallback.project.title,shipped.title);assert.ok(fallback.error);assert.ok(fallback.project.scenes[0].stage2d);
});
