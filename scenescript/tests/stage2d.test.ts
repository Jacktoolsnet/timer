import {retimeMusicScene} from '../src/lib/music.ts';
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
 const p=lightCollectorProject(),s=p.scenes[0],shot=s.stage2d!;assert.equal(Object.keys(p.stages2d).length,2);assert.equal(Object.keys(p.objects2d).length,4);
 assert.ok(!('actors' in p.stages2d.forest));assert.ok(!('actions' in p.objects2d.collector));assert.ok(!('ending' in p.objects2d.collector));
 const second=structuredClone(shot.actors[0]);second.id='blue';second.color='#4488ff';second.x=740;second.actions=[{...defaultAction2D('wave'),at:1,duration:2}];shot.actors.push(second);
 const scene=structuredClone(s);scene.id='second';scene.stage2d!.stage='night-garden';p.scenes.push(scene);
 const next=parseProject(JSON.stringify(p));assert.equal(next.scenes[0].stage2d!.actors.at(-1)!.object,'collector');assert.equal(next.scenes.at(-1)!.stage2d!.stage,'night-garden');assert.equal(next.objects2d.collector.color,'#f28b70');
 assert.equal(actorFrame2D(second,2).wave,1);assert.equal(actorFrame2D(shot.actors[0],2).wave,0);assert.deepEqual(validateProject(p),next);
 assert.equal(validateProject(demoProject()).scenes[0].stage2d,null);
});
test('strict references, finite bounds, action budgets and attachment rules are enforced',()=>{
 const good=lightCollectorProject();
 for(const mutate of [(p:any)=>p.scenes[0].stage2d.stage='missing',(p:any)=>p.scenes[1].stage2d.stage='missing',(p:any)=>p.scenes[0].stage2d.actors[0].object='missing',(p:any)=>p.scenes[0].stage2d.actors[1].actions[1].target='spark',(p:any)=>p.scenes[0].stage2d.actors[1].actions[1].target='missing',(p:any)=>p.scenes[0].stage2d.actors.push(p.scenes[0].stage2d.actors[0]),(p:any)=>p.scenes[0].stage2d.actors[0].actions[0].duration=50,(p:any)=>p.scenes[0].stage2d.actors[0].scale=NaN,(p:any)=>p.objects2d.collector.code='alert(1)',(p:any)=>p.stages2d.forest.preset='code',(p:any)=>p.scenes[0].stage2d.camera.reverse(),(p:any)=>p.scenes[0].stage2d.actors[0].actions.push({...defaultAction2D('wave'),at:4.1}),(p:any)=>p.objects2d.collector.kind='shape']){const p=structuredClone(good);mutate(p);assert.throws(()=>validateProject(p));}
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
 const board=parseStoryboard(p.storyboard);assert.equal(board.language,'Deutsch');assert.equal(board.duration,22);assert.deepEqual(board.shots.map(s=>s.duration),[4,3,10,5]);assert.ok(board.style.includes('project.stages2d'));assert.ok(board.shots.at(-1)!.action.includes(p.scenes[1].elements.find(e=>e.id==='closing-subtitle')!.text));assert.equal(board.approved,false);
 assert.equal(importStoryboard(exportStoryboard(board),board).shots.length,4);
 let called=false;const saved=await resolveStartupProject(JSON.stringify(demoProject()),async()=>{called=true;return p;});assert.equal(called,false);assert.ok(saved.recovered);const fallback=await resolveStartupProject(null,async()=>{throw Error('offline');});assert.equal(fallback.project.storyboard!.language,'Deutsch');
});

test('2D resource production instructions preserve the separation in the storyboard-to-AI workflow',async()=>{
 const {productionInstructions,reviewProduction}=await import('../src/lib/production-review.ts');const p=lightCollectorProject(),text=productionInstructions(p.storyboard!);assert.ok(text.includes('Project.objects2d'));assert.ok(text.includes('unique scene-local instance IDs'));assert.ok(!reviewProduction(p).length);
 p.storyboard!.production!.renderMode='mixed';assert.ok(!reviewProduction(p).some(i=>i.code==='missing2d'));
 const first=actorFrame2D(p.scenes[0].stage2d!.actors[0],1.9);const shot=structuredClone(p.scenes[0].stage2d!);retimeStage2D(shot,.5);const faster=actorFrame2D(shot.actors[0],.95);assert.equal(first.x,faster.x);assert.equal(first.phase,faster.phase);
});

import {parseModel2D,poseModel2D} from '../src/lib/model2d.ts';
import {birdModel2D,cityModel2D,free2DProject} from '../src/lib/free2d-example.ts';
import {acceptBoardModel2D,model2DRequest,restoreBoardModels2D,model2DInstructions} from '../src/lib/storyboard-model2d.ts';
test('free vector puppets and layered city sets roundtrip without hardcoded species or environments',()=>{
 const p=validateProject(free2DProject());assert.deepEqual(parseProject(JSON.stringify(p)),p);
 assert.equal(p.objects2d.bird.kind,'custom');assert.equal(p.stages2d.city.preset,'custom');assert.equal(p.objects2d.bird.model!.parts.find(p=>p.id==='wing')!.shape,'path');
 const parsed=poseModel2D(p.objects2d.bird.model!,'fly',.5);assert.equal(parsed.get('wing')!.rotation,25);
 poseModel2D(p.objects2d.bird.model!,'fly',2);assert.deepEqual(poseModel2D(p.objects2d.bird.model!,'fly',.5),parsed);
 assert.equal(poseModel2D(birdModel2D(),'fly',1.5).get('wing')!.rotation,25);
 assert.equal(poseModel2D(birdModel2D(),null,100).get('wing')!.rotation,0);
});
test('model2D rejects unsupported code, invalid hierarchy, geometry, tracks and resource frames',()=>{
 for(const mutate of [
  (m:any)=>m.code='alert(1)',(m:any)=>m.parts[0].url='https://example.test/x',
  (m:any)=>m.parts[0].x=Infinity,(m:any)=>m.parts[0].parent='no-such-part',
  (m:any)=>m.parts[0].parent='body',(m:any)=>m.parts[3].parent='face',
  (m:any)=>m.parts.push(m.parts[0]),(m:any)=>m.parts[2].path[0].values=[1],
  (m:any)=>m.parts[2].path[0].op='exec',(m:any)=>m.parts[6].points=[1,2,3],
  (m:any)=>m.animations.fly.tracks[0].keys[1].at=0,
  (m:any)=>m.animations.fly.tracks[0].keys[1].value=300,
  (m:any)=>m.animations.fly.tracks[0].part='missing',
  (m:any)=>m.animations.fly.tracks.push(m.animations.fly.tracks[0]),
  (m:any)=>m.parts=Array.from({length:257},(_,i)=>({...m.parts[0],id:'p'+i}))
 ]){const m=birdModel2D();mutate(m);assert.throws(()=>parseModel2D(m));}
 const p=free2DProject();p.stages2d.city.model=birdModel2D();assert.throws(()=>validateProject(p),/960/);
 p.stages2d.city.model=cityModel2D();p.scenes[0].stage2d!.actors[0].actions[0].clip='missing';assert.throws(()=>validateProject(p),/clip/);
});
test('2D model AI is targeted, validated, review-only and protected from general AI revisions',()=>{
 const p=lightCollectorProject(),target={kind:'characters' as const,id:'collector'},before=JSON.stringify(p);
 const request=model2DRequest(p,target,'Create a bird');assert.equal(request.target.name,'Der Lichtsammler');assert.ok(!('scenes' in request));assert.match(model2DInstructions,/never executable code/);
 const next=acceptBoardModel2D(JSON.stringify({model:birdModel2D(),reply:'A jointed bird'}),p,target,'Create a bird');
 assert.equal(JSON.stringify(p),before);assert.deepEqual(next.scenes,p.scenes);assert.deepEqual(next.objects2d,p.objects2d);
 assert.equal(next.storyboard!.characters[0].status,'draft');assert.equal(next.storyboard!.characters[0].model2dChat!.length,1);
 const roundtrip=parseProject(JSON.stringify(next));assert.deepEqual(roundtrip.storyboard!.characters[0].model2d,birdModel2D());
 const feedback=JSON.parse(exportStoryboard(next.storyboard!));delete feedback.board.characters[0].model2d;
 assert.deepEqual(importStoryboard(JSON.stringify(feedback),next.storyboard).characters[0].model2d,birdModel2D());
 const raw:any={};restoreBoardModels2D(raw,next);assert.equal(raw.objects2d,undefined);
 next.storyboard!.characters[0].status='approved';restoreBoardModels2D(raw,next);assert.equal(raw.objects2d.collector.kind,'custom');assert.deepEqual(parseModel2D(raw.objects2d.collector.model),birdModel2D());
 assert.throws(()=>acceptBoardModel2D(JSON.stringify({model:birdModel2D()}),p,{kind:'settings',id:'forest'}),/960/);
 assert.throws(()=>acceptBoardModel2D(JSON.stringify({model:birdModel2D(),execute:'oops'}),p,target),/expected/);
});

test('2D review restores approved existing associations and rejects incompatible aliased drafts',()=>{
 const p=lightCollectorProject();p.storyboard!.characters[0].status='approved';
 const raw:any={objects2d:{collector:{name:'wrong',kind:'shape'}}};restoreBoardModels2D(raw,p);assert.deepEqual(raw.objects2d.collector,p.objects2d.collector);
 p.storyboard!.characters[0].model2d=birdModel2D();p.storyboard!.characters[1].status='approved';p.storyboard!.characters[1].resource2d='collector';p.storyboard!.characters[1].model2d=birdModel2D();p.storyboard!.characters[1].model2d.parts[0].width=10;
 assert.throws(()=>restoreBoardModels2D({},p),/conflicting/);
});

import {boardResource2D} from '../src/lib/storyboard-resource-preview.ts';
import {defaultModel2D} from '../src/lib/model2d.ts';
import {defaultStage2DResource,parseObject2D,parseStage2DResource} from '../src/lib/stage2d.ts';
import {model2DNeedsRestyle} from '../src/lib/storyboard-model2d.ts';
test('custom factories create valid editable resources and step keys switch exactly on their boundary',()=>{
 assert.equal(parseObject2D(defaultObject2D('custom')).kind,'custom');assert.equal(parseStage2DResource(defaultStage2DResource('custom')).preset,'custom');
 assert.throws(()=>parseObject2D({kind:'custom'}),/requires model/);
 const model=defaultModel2D();model.animations.step={duration:2,loop:false,tracks:[{part:'body',property:'opacity',keys:[{at:0,value:0,easing:'step'},{at:1,value:1,easing:'step'},{at:2,value:.5,easing:'step'}]}]};
 assert.equal(poseModel2D(model,'step',.999).get('body')!.opacity,0);assert.equal(poseModel2D(model,'step',1).get('body')!.opacity,1);assert.equal(poseModel2D(model,'step',2).get('body')!.opacity,.5);
});
test('2D model refinement uses existing geometry and a recolor does not falsely confirm a restyled silhouette',()=>{
 const p=lightCollectorProject(),target={kind:'characters' as const,id:'collector'};
 p.objects2d.collector={...defaultObject2D('custom'),model:birdModel2D()};
 assert.equal(model2DRequest(p,target,'Change the beak').operation,'refine');
 let next=acceptBoardModel2D(JSON.stringify({model:birdModel2D()}),p,target);next.storyboard!.characters[0].design!.style='block';
 assert.equal(model2DRequest(next,target,'Make it blocky').operation,'restyle');
 next=acceptBoardModel2D(JSON.stringify({model:birdModel2D()}),next,target);assert.equal(model2DNeedsRestyle(next.storyboard!.characters[0]),true);
 const model=birdModel2D();model.parts[0].shape='rectangle';
 next=acceptBoardModel2D(JSON.stringify({model}),next,target);assert.equal(model2DNeedsRestyle(next.storyboard!.characters[0]),false);
 const prop=acceptBoardModel2D(JSON.stringify({model:defaultModel2D()}),p,{kind:'characters',id:'spark'});
 assert.equal(prop.storyboard!.characters[1].kind,'object');assert.equal(prop.storyboard!.characters[1].model2d!.parts[0].id,'body');
});

import {poseClipsModel2D} from '../src/lib/model2d.ts';
test('idle, locomotion and independent facial clips compose without resetting unrelated joints',()=>{
 const model=birdModel2D(),pose=poseClipsModel2D(model,[{clip:'idle',time:1},{clip:'fly',time:.5},{clip:'blink',time:.2}]);
 assert.equal(pose.get('head')!.rotation,4);assert.equal(pose.get('wing')!.rotation,25);assert.equal(pose.get('eye')!.scaleY,.1);
 const p=free2DProject(),actor=p.scenes[0].stage2d!.actors[0];
 actor.actions.push({...defaultAction2D('play'),clip:'blink',at:1,duration:.4});assert.doesNotThrow(()=>validateProject(p));
 actor.actions.push({...defaultAction2D('play'),clip:'fly',at:1,duration:1});assert.throws(()=>validateProject(p),/overlapping animation property/);
});

import {lightCollectorGarden2D,GARDEN_LANDINGS,BUTTERFLY_BIRTH,LIGHT_COLLECTOR_DURATION} from '../src/lib/light-collector-garden.ts';
test('expanded demo has reusable butterflies and flowers with contact-timed births and independent landings',()=>{
 const p=lightCollectorProject(),d=lightCollectorGarden2D(),shot=d.shot;
 assert.equal(p.scenes.reduce((sum,scene)=>sum+scene.duration,0),LIGHT_COLLECTOR_DURATION);assert.equal(shot.actors.length,8);
 const butterflies=shot.actors.filter(a=>a.object==='butterfly'),flowers=shot.actors.filter(a=>a.object==='flower');
 assert.equal(butterflies.length,3);assert.equal(flowers.length,3);
 for(const [i,landing]of GARDEN_LANDINGS.entries()){
  const actor=butterflies[i],hidden=actor.actions.find(a=>a.clip==='hidden')!,birth=actor.actions.find(a=>a.clip==='emerge')!,attach=actor.actions.find(a=>a.type==='attach')!,flower=flowers[i];
  assert.equal(actor.x,BUTTERFLY_BIRTH.x);assert.equal(actor.y,BUTTERFLY_BIRTH.y);assert.equal(hidden.duration,birth.at);assert.ok(birth.at>=BUTTERFLY_BIRTH.at);
  const sample=(time:number)=>poseClipsModel2D(d.objects2d.butterfly.model!,[{clip:'idle',time},...actor.actions.filter(a=>a.type==='play'&&time>=a.at&&time<=a.at+a.duration).map(a=>({clip:a.clip,time:time-a.at}))]);
  assert.equal(sample(birth.at-.01).get('insect')!.opacity,0);assert.equal(sample(birth.at+.31).get('insect')!.opacity,1);
  assert.equal(attach.target,flower.id);assert.equal(attach.burst,false);assert.ok(Math.abs(attach.at+attach.duration-landing.at)<1e-9);
  assert.equal(flower.actions[0].at,landing.at);assert.equal(flower.actions[0].clip,'landing');assert.equal(actor.layer,'foreground');assert.equal(flower.layer,'foreground');
 }
 assert.ok(Math.max(...GARDEN_LANDINGS.map(l=>l.at+1.4))<shot.transition!.at);
 assert.equal(shot.actors[1].actions.find(a=>a.type==='fade')!.at,BUTTERFLY_BIRTH.at);
 assert.equal(p.storyboard!.duration,p.scenes.reduce((sum,scene)=>sum+scene.duration,0));assert.deepEqual(p.storyboard!.shots.map(s=>s.duration),[4,3,10,5]);
 assert.match(p.storyboard!.story,/Schmetterlinge/);assert.match(p.storyboard!.story,/wackeln/);
 for(const id of ['butterfly','flower']){const subject=p.storyboard!.characters.find(s=>s.id===id)!;assert.equal(subject.resource2d,id);assert.deepEqual(subject.model2d,p.objects2d[id].model);assert.equal(subject.status,'draft');const resource=boardResource2D(p,subject,false).resource;assert.ok(resource&&'color' in resource);assert.equal(resource.color,p.objects2d[id].color);}
 const bad=lightCollectorProject();bad.scenes[0].stage2d!.actors[2].layer='unknown' as any;assert.throws(()=>validateProject(bad),/layer/);
});

test('demo separates the forest action and editable night-garden closing into real scenes',()=>{
 const p=validateProject(lightCollectorProject()),[forest,night]=p.scenes;
 assert.equal(p.scenes.length,2);assert.deepEqual(p.scenes.map(s=>s.duration),[17,5]);
 assert.equal(forest.stage2d!.stage,'forest');assert.equal(night.stage2d!.stage,'night-garden');
 for(const scene of p.scenes){assert.equal(scene.stage2d!.transition,null);assert.equal(scene.stage2d!.ending,null);}
 assert.equal(night.elements.find(e=>e.id==='closing-caption')!.text,'jacktools.net');assert.ok(p.storyboard!.shots.at(-1)!.action.includes('jacktools.net'));
 assert.equal(night.transition,'crossfade');assert.equal(night.stage2d!.actors.length,6);
 assert.ok(night.stage2d!.actors.every(a=>a.object==='flower'||a.object==='butterfly'));
 for(const actor of night.stage2d!.actors){assert.ok(actor.actions.every(a=>a.type==='attach'&&!a.burst));}
 const title=night.elements.find(e=>e.id==='closing-title')!;assert.equal(title.type,'text');assert.equal(title.text,'Manchmal genügt');
 title.text='Meine eigene Botschaft';assert.equal(parseProject(JSON.stringify(p)).scenes[1].elements[0].text,title.text);
 assert.ok(p.storyboard!.style.includes('zwei echte Filmszenen'));
});

test('shortening the forest scene preserves adjacent clip boundaries and leaves the closing independent',()=>{
 const p=lightCollectorProject(),closing=structuredClone(p.scenes[1]);
 retimeStage2D(p.scenes[0].stage2d!,8/p.scenes[0].duration);retimeMusicScene(p.music,0,17,8);p.scenes[0].duration=8;
 assert.doesNotThrow(()=>validateProject(p));assert.deepEqual(p.scenes[1],closing);
});

test('demo contains a deterministic native soundtrack and action-synchronous, editable SFX',async()=>{
 const {lightCollectorMusic,LIGHT_COLLECTOR_SFX}=await import('../src/lib/light-collector-audio.ts');
 const {reviewProduction}=await import('../src/lib/production-review.ts');
 const p=validateProject(lightCollectorProject()),music=p.music!;
 assert.deepEqual(music,lightCollectorMusic());assert.equal(music.mode,'score');assert.equal(music.instruments.length,8);
 assert.deepEqual(p.storyboard!.production,{renderMode:'2d',dialogue:false,music:true,sfx:true});
 assert.ok(music.notes.some(n=>n.instrument==='sfx-sparkle'&&n.at===BUTTERFLY_BIRTH.at));
 for(const landing of GARDEN_LANDINGS)assert.ok(music.notes.some(n=>n.instrument==='sfx-bloom'&&n.at===landing.at));
 assert.ok(music.notes.some(n=>n.at===19.3));assert.equal(music.fadeOut,1.25);assert.equal(p.narration,null);
 assert.deepEqual(reviewProduction(p),[]);
 const silent=structuredClone(p);silent.music!.notes=silent.music!.notes.filter(n=>n.instrument!=='sfx-bloom');
 assert.ok(reviewProduction(silent).some(issue=>issue.code==='sfxPending'&&issue.detail!.includes(LIGHT_COLLECTOR_SFX.bloom)));
 const muted=structuredClone(p);muted.music!.instruments.find(i=>i.id==='sfx-wings')!.volume=0;
 assert.ok(reviewProduction(muted).some(issue=>issue.code==='sfxPending'&&issue.detail!.includes(LIGHT_COLLECTOR_SFX.wings)));
});
