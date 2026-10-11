import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseCrop,panelRects,panelTemplates} from '../src/lib/crop.ts';
import {createPanels} from '../src/lib/panels.ts';
import {demoProject,parseProject} from '../src/lib/model.ts';
import {panelProject} from '../src/lib/panel-example.ts';
test('crop defaults, nulls, percent bounds and strict fields',()=>{
 assert.equal(parseCrop(undefined),null);assert.equal(parseCrop(null),null);assert.deepEqual(parseCrop({x:50,y:0,width:50,height:100}),{x:50,y:0,width:50,height:100});
 for(const c of [{x:0,y:0,width:0,height:50},{x:51,y:0,width:50,height:50},{x:0,y:99,width:20,height:2},{x:-1,y:0,width:10,height:10},{x:null,y:0,width:10,height:10},{x:0,y:0,width:10,height:10,code:'bad'},{x:0,width:10,height:10},{x:0,y:0,width:NaN,height:10}])assert.throws(()=>parseCrop(c));
 const p=demoProject();delete (p.scenes[0].elements[0] as any).crop;assert.equal(parseProject(JSON.stringify(p)).scenes[0].elements[0].crop,null);p.scenes[0].elements[0].crop={x:1,y:2,width:3,height:4};assert.deepEqual(parseProject(JSON.stringify(p)).scenes[0].elements[0].crop,p.scenes[0].elements[0].crop);
});
test('all panel layouts are bounded ordinary elements and share one asset',()=>{
 for(const template of panelTemplates){let n=0;const elements=createPanels('shared',template,()=>`id-${++n}`);assert.equal(elements.length,panelRects(template).length*2);assert.equal(new Set(elements.map(e=>e.id)).size,elements.length);for(const [i,e]of elements.entries()){assert.equal(e.type,i%2?'image':'shape');assert.equal(e.animation,'none');if(i%2){assert.equal(e.asset,'shared');assert.deepEqual(e.crop,{x:0,y:0,width:100,height:100});}assert(e.x>=0&&e.y>=0&&e.x+e.width<=100&&e.y+e.height<=100);}}
});
test('panel example round trips with one real embedded SVG and independent crops',()=>{
 const p=panelProject();assert.deepEqual(JSON.parse(JSON.stringify(parseProject(JSON.stringify(p)))),p);assert.equal(Object.keys(p.assets).length,1);assert.equal(p.scenes.length,3);assert.notDeepEqual(p.scenes[2].elements[1].crop,p.scenes[2].elements[3].crop);
});
