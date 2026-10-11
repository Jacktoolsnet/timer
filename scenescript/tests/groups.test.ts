import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoProject,newElement,parseProject,animationState} from '../src/lib/model.ts';
import {newGroup,sceneElementMatrix,sceneElementState,dissolveGroup,parsePlacement} from '../src/lib/groups.ts';
import {applyMatrix,bubbleTarget} from '../src/lib/comic.ts';
import {defaultBubble} from '../src/lib/comic.ts';
import {History} from '../src/lib/history.ts';
import {editInterval} from '../src/lib/timeline.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const fixture=()=>{const p=demoProject(),s=p.scenes[0];s.elements=[newElement('shape','a'),newElement('bubble','b')];s.elements.forEach(e=>{e.animation='none';});return {p,s};};
test('old projects default groups/placement; strict group and matrix validation',()=>{
 const {p,s}=fixture();const g=newGroup(s,['a','b'],'g');s.groups=[g];const round=()=>parseProject(JSON.stringify(p));assert.deepEqual(round().scenes[0].groups,[g]);
 for(const mutate of [(p:any)=>p.scenes[0].groups=null,(p:any)=>p.scenes[0].groups[0].members=['missing'],(p:any)=>p.scenes[0].groups[0].members=['a','a'],(p:any)=>p.scenes[0].groups[0].id='a',(p:any)=>p.scenes[0].groups[0].until=0,(p:any)=>p.scenes[0].groups[0].animation='typewriter',(p:any)=>p.scenes[0].groups[0].pivot=null,(p:any)=>p.scenes[0].groups[0].hack=1]){const copy=structuredClone(p);mutate(copy);assert.throws(()=>parseProject(JSON.stringify(copy)));}
 s.groups.push({...g,id:'other'});assert.throws(round);s.groups=[];delete (s as any).groups;delete (s.elements[0] as any).placement;const parsed=round();assert.deepEqual(parsed.scenes[0].groups,[]);assert.equal(parsed.scenes[0].elements[0].placement,null);
 assert.throws(()=>parsePlacement({a:0,b:0,c:0,d:0,e:0,f:0},'m'));assert.throws(()=>parsePlacement({a:1,b:0,c:0,d:1,e:0,f:Infinity},'m'));
});
test('identity grouping preserves geometry and layer order; group matrices rotate about pivot',()=>{
 const {s}=fixture(),e=s.elements[0],before=sceneElementMatrix(e,s,2,1920,1080);const g=newGroup(s,['a','b'],'g');s.groups=[g];assert.deepEqual(sceneElementMatrix(e,s,2,1920,1080),before);
 g.pivot={x:0,y:0};g.rotation=90;g.x=10;const p=applyMatrix(sceneElementMatrix(e,s,2,1920,1080),{x:0,y:0});close(p.x,192-before.f);close(p.y,before.e);assert.deepEqual(s.elements.map(e=>e.id),['a','b']);
});
test('speaker anchors include group transforms and visibility is independent',()=>{
 const {s}=fixture();const speaker=s.elements[0],bubble=s.elements[1];speaker.anchors.mouth={x:30,y:40};bubble.bubble={...defaultBubble(),tail:{...defaultBubble().tail,mode:'anchor',element:'a',anchor:'mouth'}};
 s.groups=[newGroup(s,['a'],'g')];s.groups[0].x=20;s.groups[0].rotation=20;s.groups[0].until=1;
 const target=bubbleTarget(bubble,s,2,1920,1080),world=applyMatrix(sceneElementMatrix(bubble,s,2,1920,1080),target),mouth=applyMatrix(sceneElementMatrix(speaker,s,2,1920,1080),{x:speaker.width*1920*.003,y:speaker.height*1080*.004});close(world.x,mouth.x);close(world.y,mouth.y);assert.equal(sceneElementState(speaker,s,2,1920,1080).visible,false);assert.equal(sceneElementState(bubble,s,2,1920,1080).visible,true);
});
test('ungroup bakes world geometry and opacity at the current playhead; member animation remains',()=>{
 const {s}=fixture(),g=newGroup(s,['a','b'],'g');g.rotation=37;g.x=12;g.y=-8;g.opacity=.7;g.animation='zoom';s.groups=[g];const before=s.elements.map(e=>sceneElementMatrix(e,s,.6,1920,1080));dissolveGroup(s,g,.6,1920,1080);assert.equal(s.groups.length,0);for(const [i,e]of s.elements.entries()){const after=sceneElementMatrix(e,s,.6,1920,1080);for(const key of ['a','b','c','d','e','f'] as const)close(after[key],before[i][key]);close(e.opacity,.7);assert.equal(e.animation,'none');}
 assert.doesNotThrow(()=>parseProject(JSON.stringify({...demoProject(),scenes:[s]})));const hidden=newGroup(s,['a'],'hidden');hidden.at=2;s.groups=[hidden];assert.throws(()=>dissolveGroup(s,hidden,1,1920,1080));
});
test('CSS zero-origin matrix and visibility compose entry/exit and placement',()=>{
 const {s}=fixture(),e=s.elements[0];e.animation='slide-left';e.rotation=23;e.until=4;e.exitAnimation='zoom-out';e.placement={a:1,b:0,c:0,d:1,e:123,f:45};const state=sceneElementState(e,s,3.8,1920,1080),matrix=sceneElementMatrix(e,s,3.8,1920,1080);const nums=state.transform.slice(7,-1).split(',').map(Number);close(nums[4]+e.x*1920/100,matrix.e);close(nums[5]+e.y*1080/100,matrix.f);assert.equal(sceneElementState(e,s,4,1920,1080).visible,false);assert.equal(animationState(e,4).visible,false);
});
test('bounded immutable undo/redo coalesces typing and clears redo on edits',()=>{
 const h=new History({a:1},2);h.record({a:2},'a',0);h.record({a:3},'a',100);assert.deepEqual(h.undo(),{a:1});assert.deepEqual(h.redo(),{a:3});h.record({a:4});const old=h.undo()!;old.a=999;assert.deepEqual(h.redo(),{a:4});h.undo();h.record({a:5});assert.equal(h.canRedo,false);h.record({a:6});h.record({a:7});assert.deepEqual(h.undo(),{a:6});assert.deepEqual(h.undo(),{a:5});assert.equal(h.undo(),undefined);h.reset({a:8});assert.equal(h.canUndo,false);
});
test('timeline clamps, snaps and preserves omitted end only for start edits',()=>{
 assert.deepEqual(editInterval(1,3,5,9,'move'),{at:3,until:5});assert.deepEqual(editInterval(1,3,5,-9,'move'),{at:0,until:2});assert.deepEqual(editInterval(1,null,5,1,'start'),{at:2,until:null});assert.deepEqual(editInterval(1,null,5,-.24,'move',true),{at:.8,until:4.8});assert.deepEqual(editInterval(1,3,5,-10,'end'),{at:1,until:1.001});assert.deepEqual(editInterval(1,3,5,10,'start'),{at:2.999,until:3});
});
test('defaults and explicit null exceptions for groups are precise',()=>{
 const {p,s}=fixture();(s as any).groups=[{id:'g',members:['a']}];const g=parseProject(JSON.stringify(p)).scenes[0].groups[0];assert.equal(g.animation,'none');assert.equal(g.opacity,1);assert.deepEqual(g.pivot,{x:50,y:50});assert.equal(g.until,null);assert.equal(g.motionPath,null);
 for(const key of ['name','pivot','x','y','rotation','opacity','at','animation','animationDuration','exitAnimation','exitDuration']){const copy=structuredClone(p);(copy.scenes[0].groups[0] as any)[key]=null;assert.throws(()=>parseProject(JSON.stringify(copy)),key);}
 const copy=structuredClone(p);copy.scenes[0].groups[0].until=null;copy.scenes[0].groups[0].motionPath=null;assert.doesNotThrow(()=>parseProject(JSON.stringify(copy)));
});
test('group opacity is multiplicative and group end is an independent visibility gate',()=>{
 const {s}=fixture();s.elements[0].opacity=.5;const g=newGroup(s,['a'],'g');g.opacity=.4;g.until=2;g.exitAnimation='fade';g.exitDuration=1;s.groups=[g];close(sceneElementState(s.elements[0],s,1.5,1920,1080).opacity,.1);assert.equal(sceneElementState(s.elements[0],s,2,1920,1080).visible,false);assert.equal(sceneElementState(s.elements[1],s,2,1920,1080).visible,true);
});
test('timeline tiny or zero legacy intervals never produce an invalid explicit end',()=>{
 assert.deepEqual(editInterval(5,null,5,-1,'move'),{at:5,until:null});assert.deepEqual(editInterval(1,1.0000001,5,1,'start'),{at:1,until:1.0000001});
});
