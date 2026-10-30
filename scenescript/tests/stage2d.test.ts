import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultStage2D,defaultObject2D,defaultActor2D,defaultAction2D,parseStage2D,lightCollector2D,retimeStage2D} from '../src/lib/stage2d.ts';
import {actorFrame2D,cameraFrame2D} from '../src/lib/motion2d.ts';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
import {demoProject,parseProject,validateProject} from '../src/lib/model.ts';
import {DEFAULT_PROJECT_URL,resolveStartupProject} from '../src/lib/startup-project.ts';
import {parseStoryboard,exportStoryboard,importStoryboard} from '../src/lib/storyboard.ts';
test('2D libraries are separate from scene instances, portable and independently reusable',()=>{
 const p=lightCollectorProject(),s=p.scenes[0],shot=s.stage2d!;assert.equal(Object.keys(p.stages2d).length,2);assert.equal(Object.keys(p.objects2d).length,2);
 assert.ok(!('actors' in p.stages2d.forest));assert.ok(!('actions' in p.objects2d.collector));assert.ok(!('ending' in p.objects2d.collector));
 const second=structuredClone(shot.actors[0]);second.id='blue';second.color='#4488ff';second.x=740;second.actions=[{...defaultAction2D('wave'),at:1,duration:2}];shot.actors.push(second);
 const scene=structuredClone(s);scene.id='second';scene.stage2d!.stage='night-garden';p.scenes.push(scene);
 const next=parseProject(JSON.stringify(p));assert.equal(next.scenes[0].stage2d!.actors[2].object,'collector');assert.equal(next.scenes[1].stage2d!.stage,'night-garden');assert.equal(next.objects2d.collector.color,'#f28b70');
 assert.equal(actorFrame2D(second,2).wave,1);assert.equal(actorFrame2D(shot.actors[0],2).wave,0);assert.deepEqual(validateProject(p),next);
 assert.equal(validateProject(demoProject()).scenes[0].stage2d,null);
});
test('strict references, finite bounds, action budgets and attachment rules are enforced',()=>{
 const good=lightCollectorProject();
 for(const mutate of [(p:any)=>p.scenes[0].stage2d.stage='missing',(p:any)=>p.scenes[0].stage2d.transition.stage='missing',(p:any)=>p.scenes[0].stage2d.actors[0].object='missing',(p:any)=>p.scenes[0].stage2d.actors[1].actions[1].target='spark',(p:any)=>p.scenes[0].stage2d.actors[1].actions[1].target='missing',(p:any)=>p.scenes[0].stage2d.actors.push(p.scenes[0].stage2d.actors[0]),(p:any)=>p.scenes[0].stage2d.actors[0].actions[0].duration=50,(p:any)=>p.scenes[0].stage2d.actors[0].scale=NaN,(p:any)=>p.objects2d.collector.code='alert(1)',(p:any)=>p.stages2d.forest.preset='code',(p:any)=>p.scenes[0].stage2d.camera.reverse(),(p:any)=>p.scenes[0].stage2d.actors[0].actions.push({...defaultAction2D('wave'),at:4.1}),(p:any)=>p.objects2d.collector.kind='shape']){const p=structuredClone(good);mutate(p);assert.throws(()=>validateProject(p));}
 const sources:Record<string,unknown>=Object.create(null);Object.assign(sources,{'constructor':{...defaultObject2D()}});const p=demoProject();p.objects2d=sources as any;assert.ok(Object.hasOwn(validateProject(p).objects2d,'constructor'));const shot=defaultStage2D('constructor');assert.throws(()=>parseStage2D(shot,'shot',good));
});
test('actions and camera are absolute, retiming is explicit, and repeated poses do not accumulate state',()=>{
 const d=lightCollector2D(),actor=d.shot.actors[0],before=actorFrame2D(actor,7.9);actorFrame2D(actor,14);assert.deepEqual(actorFrame2D(actor,7.9),before);assert.ok(before.flight>.9);assert.equal(actorFrame2D(actor,16).x,562);
 const retimed=structuredClone(d.shot);retimeStage2D(retimed,.5);assert.equal(retimed.actors[0].actions[0].duration,1.7);assert.equal(retimed.transition!.at,5.3);assert.equal(retimed.ending!.at,6.05);
 assert.equal(cameraFrame2D([],10).zoom,1);assert.equal(cameraFrame2D(d.shot.camera,16).zoom,1.04);
 const shape=defaultActor2D('prop','prop');shape.actions=[{...defaultAction2D('move'),toX:700,toY:300}];assert.equal(actorFrame2D(shape,5).x,700);
});
test('old bundled presets upgrade once without mutating the source or discarding appearance',()=>{
 const raw:any=demoProject();raw.scenes=raw.scenes.slice(0,1);raw.scenes[0].duration=8;raw.scenes[0].elements=[];raw.scenes[0].stage2d={preset:'light-collector',bodyColor:'#123456',wave:false,endingTitle:'Hallo',endingSubtitle:'Welt'};
 const before=JSON.stringify(raw),p=validateProject(raw),s=p.scenes[0].stage2d!;assert.equal(JSON.stringify(raw),before);assert.equal(p.objects2d[s.actors[0].object].color,'#123456');assert.ok(!s.actors[0].actions.some(a=>a.type==='wave'));assert.equal(s.ending!.title,'Hallo');assert.equal(s.actors[1].actions[0].duration,8);assert.deepEqual(validateProject(p),p);
});
test('shipped project, schema defaults, recovery and German storyboard stay in sync',async()=>{
 const p=lightCollectorProject(),shipped=parseProject(readFileSync(new URL('../public'+DEFAULT_PROJECT_URL,import.meta.url),'utf8'));assert.deepEqual(shipped,validateProject(p));
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));for(const [key,value]of Object.entries(defaultStage2D()))assert.deepEqual(schema.$defs.stage2D.properties[key].default,value);
 const board=parseStoryboard(p.storyboard);assert.equal(board.language,'Deutsch');assert.equal(board.duration,16);assert.deepEqual(board.shots.map(s=>s.duration),[4,3,4,5]);assert.ok(board.style.includes('project.stages2d'));assert.ok(board.shots.at(-1)!.action.includes(p.scenes[0].stage2d!.ending!.subtitle));assert.equal(board.approved,false);
 assert.equal(importStoryboard(exportStoryboard(board),board).shots.length,4);
 let called=false;const saved=await resolveStartupProject(JSON.stringify(demoProject()),async()=>{called=true;return p;});assert.equal(called,false);assert.ok(saved.recovered);const fallback=await resolveStartupProject(null,async()=>{throw Error('offline');});assert.equal(fallback.project.storyboard!.language,'Deutsch');
});

test('2D resource production instructions preserve the separation in the storyboard-to-AI workflow',async()=>{
 const {productionInstructions,reviewProduction}=await import('../src/lib/production-review.ts');const p=lightCollectorProject(),text=productionInstructions(p.storyboard!);assert.ok(text.includes('Project.objects2d'));assert.ok(text.includes('unique scene-local instance IDs'));assert.ok(!reviewProduction(p).length);
 p.storyboard!.production!.renderMode='mixed';assert.ok(!reviewProduction(p).some(i=>i.code==='missing2d'));
 const first=actorFrame2D(p.scenes[0].stage2d!.actors[0],1.9);const shot=structuredClone(p.scenes[0].stage2d!);retimeStage2D(shot,.5);const faster=actorFrame2D(shot.actors[0],.95);assert.equal(first.x,faster.x);assert.equal(first.phase,faster.phase);
});
