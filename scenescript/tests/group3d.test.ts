import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGroup3D,parseGroupPlacements3D,groupMembers3D,groupMemberFrame3D,groupAnimationTime3D,defaultGroupPlacement3D,groupBudget3D} from '../src/lib/group3d.ts';
import {parseCharacter3D,parse3DResource,export3DResource,import3DResource} from '../src/lib/stage3d.ts';
import {parseProject,validateProject,demoProject} from '../src/lib/model.ts';
import {resource3DPreview} from '../src/lib/stage3d-resource-preview.ts';
import {path3DExample} from '../src/lib/path3d-example.ts';
import {vec} from '../src/lib/path3d.ts';
const sample=()=>validateProject(path3DExample);
const simple=()=>({one:parseCharacter3D({model:{parts:[{id:'box',shape:'box'}]}})});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('legacy projects keep empty groups; template references, known fields and bounded numbers validate strictly',()=>{
 assert.deepEqual(parseProject(JSON.stringify({version:'1.0',title:'old',format:'landscape',scenes:[{id:'one',elements:[]}]})).groups3d,{});
 const chars=simple();for(const change of [{characters:[]},{characters:['missing']},{characters:['one','one']},{count:257},{count:1.5},{seed:-1},{seed:1.5},{layout:'script'},{jitter:{x:-1}},{size:{x:51}},{speed:NaN},{points:[{}]},{script:'bad'},{animation:'unknown'}])assert.throws(()=>parseGroup3D({characters:['one'],...change},chars));
 const p=sample();delete p.characters.fan1;assert.throws(()=>validateProject(p),/missing character/);
});
test('grid rows rise deterministically, explicit points match count, and transformations scale arrangement and models separately',()=>{
 const chars=simple(),grid=parseGroup3D({characters:['one'],count:4,columns:2,spacing:{x:2,y:1,z:-3}},chars),members=groupMembers3D(grid);
 assert.deepEqual(members.map(m=>m.position),[vec(-1,0,0),vec(1,0,0),vec(-1,1,-3),vec(1,1,-3)]);
 const points=parseGroup3D({characters:['one'],layout:'points',points:[{x:1},{x:2,y:3}]},chars);assert.equal(points.count,2);assert.deepEqual(groupMembers3D(points).map(m=>m.position),[vec(1),vec(2,3)]);
 assert.throws(()=>parseGroup3D({...points,count:3},chars),/points.length/);
 const frame=groupMemberFrame3D(groupMembers3D(points)[0],{...defaultGroupPlacement3D('points'),x:10,y:2,z:5,rotation:90,scale:2});close(frame.position.x,10);close(frame.position.y,2);close(frame.position.z,3);close(frame.forward.x,1);
});
test('seeded scatter, jitter, template choice and animation variations do not call Math.random or change on resampling',()=>{
 const p=sample(),definition={...p.groups3d.audience,layout:'scatter',size:vec(10,2,6),jitter:vec(.1,.1,.1)},g=parseGroup3D(definition,p.characters),original=Math.random;let first;
 try{Math.random=()=>{throw new Error('unseeded randomness');};first=groupMembers3D(g);assert.equal(groupMembers3D(g),first);}finally{Math.random=original;}
 assert.deepEqual(groupMembers3D(parseGroup3D(definition,p.characters)),first);assert.notDeepEqual(groupMembers3D(parseGroup3D({...definition,seed:74},p.characters)),first);
 assert.equal(new Set(first.map(m=>m.character)).size,4);assert.ok(new Set(first.map(m=>m.phase)).size>40);for(const m of first){assert.ok(Math.abs(m.position.x)<=5.1&&Math.abs(m.position.y)<=1.1&&Math.abs(m.position.z)<=3.1);assert.ok(m.speed>=.88&&m.speed<=1.12);assert.ok(m.phase>=0&&m.phase<2);}
});
test('animation time has deterministic modulo phase, speed and explicit cross-scene continuity',()=>{
 const p=sample(),group=p.groups3d.audience,member=groupMembers3D(group)[0],placement=defaultGroupPlacement3D('audience');
 close(groupAnimationTime3D(member,placement,12,2),groupAnimationTime3D(member,{...placement,timeOffset:12},0,2));
 const a=groupAnimationTime3D(member,placement,-100,2);assert.ok(a>=0&&a<2);assert.equal(groupAnimationTime3D(member,placement,1,2),groupAnimationTime3D(member,placement,1,2));
 assert.notEqual(groupAnimationTime3D(member,placement,1,2),groupAnimationTime3D(groupMembers3D(group)[1],placement,1,2));
});
test('groups have scoped unique placement IDs, a 256-copy total and instance-aware scene part budget',()=>{
 const chars=simple(),group=parseGroup3D({characters:['one'],count:256},chars),groups={g:group};assert.equal(groupBudget3D([defaultGroupPlacement3D('g')],groups,chars,'groups'),256);
 assert.throws(()=>groupBudget3D([defaultGroupPlacement3D('g','a'),defaultGroupPlacement3D('g','b')],groups,chars,'groups'),/256/);
 for(const value of [[{id:'a',group:'absent'}],[{id:'a',group:'g'},{id:'a',group:'g'}],[{id:'a',group:'g',timeOffset:Infinity}],Array.from({length:17},(_,i)=>({id:'g'+i,group:'g'}))])assert.throws(()=>parseGroupPlacements3D(value,groups));
 const p=sample();p.groups3d.audience.count=256;assert.throws(()=>validateProject(p),/2048/);assert.throws(()=>resource3DPreview('group','audience',p.groups3d.audience,'',p.characters),/2048/);
 const repeated=parseCharacter3D({model:{parts:[{id:'many',instances:Array.from({length:256},(_,i)=>({x:i%10}))}]}});const g=parseGroup3D({characters:['many'],count:2},{many:repeated});assert.equal(groupBudget3D([defaultGroupPlacement3D('g')],{g},{many:repeated},'groups'),512);
});
test('group clip must exist in every template and reusable resources round trip without expanding copies into actor JSON',()=>{
 const p=sample();assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.equal(p.scenes[0].stage3d!.actors.length,2);assert.equal(p.scenes[0].stage3d!.groups!.length,1);assert.equal(groupMembers3D(p.groups3d.audience).length,48);
 delete p.characters.fan3.model!.animations.cheer;assert.throws(()=>validateProject(p),/missing clip cheer in fan3/);
});
test('self-contained group bundles import into an empty library and round trip their four templates',()=>{
 const p=sample(),bundle=export3DResource('group','audience',p);assert.equal(Object.keys(bundle.characters!).length,4);assert.deepEqual(parse3DResource(JSON.stringify(bundle)),bundle);
 const imported=import3DResource(bundle,demoProject(),'copy');assert.equal(imported.id,'audience');assert.deepEqual(imported.groups3d.audience,p.groups3d.audience);assert.deepEqual(imported.characters.fan1,p.characters.fan1);
 const preview=resource3DPreview('group','audience',imported.groups3d.audience,'',imported.characters);assert.ok(preview.studio);assert.equal(validateProject(preview.project).scenes[0].stage3d!.groups!.length,1);
 const broken=structuredClone(bundle);delete broken.characters!.fan1;assert.throws(()=>parse3DResource(JSON.stringify(broken)),/missing character/);
});
test('copy/update remap conflicting template IDs without overwriting old figures or accumulating identical dependencies',()=>{
 const p=sample(),bundle=export3DResource('group','audience',p),destination=demoProject();destination.characters.fan1=parseCharacter3D({name:'Keep me',model:{parts:[{id:'keep'}]}});const before=JSON.stringify(destination.characters.fan1);
 const imported=import3DResource(bundle,destination,'copy');assert.equal(imported.groups3d.audience.characters[0],'fan1_2');assert.equal(JSON.stringify(imported.characters.fan1),before);assert.equal(Object.keys(destination.characters).length,1);
 const copy=import3DResource(bundle,imported,'copy');assert.equal(copy.id,'audience_2');assert.equal(Object.keys(copy.characters).length,5);
 const update=import3DResource(bundle,copy,'update');assert.equal(update.id,'audience');assert.equal(Object.keys(update.characters).length,5);assert.equal(JSON.stringify(update.characters.fan1),before);
});
test('bundle dependency overflow fails transactionally before any existing library is changed',()=>{
 const p=sample(),bundle=export3DResource('group','audience',p),destination=demoProject();for(let i=0;i<30;i++)destination.characters['own'+i]=parseCharacter3D({name:'own'+i,model:{parts:[{id:'part'+i}]}});const before=JSON.stringify(destination);assert.throws(()=>import3DResource(bundle,destination,'copy'),/maximum 30/);assert.equal(JSON.stringify(destination),before);
});
test('downloadable group and refreshed race example contain matching templates, seats and fantasy advertising',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/path-camera.scenescript.json',import.meta.url),'utf8')),r=parse3DResource(readFileSync(new URL('../public/examples/path-audience.scenegroup.json',import.meta.url),'utf8'));
 assert.deepEqual(r.definition,p.groups3d.audience);assert.equal(Object.keys(r.characters!).length,4);assert.equal(p.groups3d.audience.count,48);assert.ok(p.stages.track.model!.parts.some(p=>p.id==='adZOOMLetters'));assert.ok(p.stages.track.model!.parts.some(p=>p.id==='standBench3'));
});

test('identical-looking templates keep distinct references when bundles are merged',()=>{
 const destination=demoProject(),one=Object.values(simple())[0];const source={...demoProject(),characters:{a:one,b:structuredClone(one)},groups3d:{duo:parseGroup3D({characters:['a','b'],count:2},{a:one,b:one})}};
 const bundle=export3DResource('group','duo',source),result=import3DResource(bundle,destination,'copy');assert.equal(new Set(result.groups3d.duo.characters).size,2);assert.equal(Object.keys(result.characters).length,2);const again=import3DResource(bundle,result,'update');assert.equal(Object.keys(again.characters).length,2);
});
