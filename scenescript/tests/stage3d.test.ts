import {resource3DPreview} from '../src/lib/stage3d-resource-preview.ts';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {demoProject,parseProject,validateProject} from '../src/lib/model.ts';
import {stage3DExample,aiAction3DExample} from '../src/lib/stage3d-example.ts';
import {unique3DResourceID,actor3DPosition,actor3DPose,defaultActor3D,parse3DResource,MAX_3D_RESOURCE_BYTES,defaultCharacter3D} from '../src/lib/stage3d.ts';
import {aiGuide} from '../src/lib/guide.ts';
const sample=()=>validateProject(stage3DExample);
test('legacy projects default to empty 3D libraries and disabled stage shots',()=>{
 const p:any=demoProject();delete p.characters;delete p.stages;p.scenes.forEach((s:any)=>delete s.stage3d);const out=parseProject(JSON.stringify(p));assert.deepEqual(out.characters,{});assert.deepEqual(out.stages,{});assert.equal(out.scenes[0].stage3d,null);
});
test('two robots and one stage are shared across two self-contained scene shots',()=>{
 const p=sample();assert.equal(Object.keys(p.characters).length,2);assert.equal(Object.keys(p.stages).length,1);assert.equal(p.scenes.length,2);assert.equal(p.scenes[0].stage3d!.stage,p.scenes[1].stage3d!.stage);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.ok(aiGuide.includes('3D WORLD UNITS'));assert.ok(aiGuide.includes('no implicit cross-scene state'));
});
test('3D import validates finite numbers, known fields, budgets, scopes and own references',()=>{
 const mutate=[(p:any)=>p.characters.mika.height=NaN,(p:any)=>p.characters.mika.height=7,(p:any)=>p.characters.mika.headColor='red',(p:any)=>p.characters.mika.name=null,(p:any)=>p.characters.mika.script='alert(1)',(p:any)=>p.characters=null,(p:any)=>p.stages.plaza.model='remote.glb',(p:any)=>p.scenes[0].stage3d.stage='constructor',(p:any)=>p.scenes[0].stage3d.actors[0].character='constructor',(p:any)=>p.scenes[0].stage3d.camera.pitch=90,(p:any)=>p.scenes[0].stage3d.camera.distance=null,(p:any)=>p.scenes[0].stage3d.actors[0].duration=8,(p:any)=>p.scenes[0].stage3d.actors[0].at=7,(p:any)=>p.scenes[0].stage3d.actors[0].action='eval',(p:any)=>p.scenes[0].stage3d.actors[0].scale=0,(p:any)=>p.scenes[0].stage3d.actors[0].x=Infinity,(p:any)=>p.scenes[0].stage3d.actors[1].id='mika',(p:any)=>p.scenes[0].stage3d.actors=Array.from({length:13},(_,i)=>({...defaultActor3D('mika','r'+i)})),(p:any)=>p.characters=Object.fromEntries(Array.from({length:31},(_,i)=>['c'+i,defaultCharacter3D()]))];
 for(const change of mutate){const p=sample();change(p);assert.throws(()=>validateProject(p));}
});
test('3D action poses are deterministic under reverse seeks and clamp at endpoints',()=>{
 const a={...defaultActor3D('mika'),x:-4,toX:2,action:'walk' as const,at:1,duration:4};const middle=actor3DPose(a,3);actor3DPose(a,8);assert.deepEqual(actor3DPose(a,3),middle);assert.equal(actor3DPose(a,0).x,-4);assert.equal(actor3DPose(a,99).x,2);assert.equal(actor3DPose(a,5).leftLeg,0);assert.notEqual(actor3DPose(a,2).leftLeg,0);
 const wave={...a,action:'wave' as const};assert.equal(actor3DPose(wave,0).rightArm,0);assert.notEqual(actor3DPose(wave,2).rightArm,0);assert.equal(actor3DPose(wave,6).rightArm,0);
});
test('individual 3D resources are versioned, self-contained and strictly bounded',()=>{
 for(const [kind,id,definition] of [['character','mika',sample().characters.mika],['stage','plaza',sample().stages.plaza]] as const){const resource={format:'scenescript-3d-resource',version:'1.0',kind,id,definition};assert.deepEqual(parse3DResource(JSON.stringify(resource)),resource);for(const change of [{version:'2'},{url:'https://invalid'},{kind:'script'},{id:'bad id'},{definition:null}])assert.throws(()=>parse3DResource(JSON.stringify({...resource,...change})));}
 assert.throws(()=>parse3DResource(' '.repeat(MAX_3D_RESOURCE_BYTES+1)),/32 KiB/);
});

test('resource copy IDs stay bounded and never replace an existing character',()=>{const id='a'.repeat(100),copy=unique3DResourceID(id,{[id]:{}});assert.equal(copy.length,100);assert.notEqual(copy,id);assert.ok(copy.endsWith('_2'));assert.equal(unique3DResourceID('new',{}),'new');});

test('downloadable robot example and companion files match the canonical project',()=>{const p=parseProject(readFileSync(new URL('../public/examples/block-robots.scenescript.json',import.meta.url),'utf8'));assert.match(p.thumbnail!.data,/^data:image\/png;base64,/);p.thumbnail=null;assert.deepEqual(p,sample());for(const [file,id,kind] of [['mika.scenecharacter.json','mika','character'],['bo.scenecharacter.json','bo','character'],['plaza.scenestage.json','plaza','stage']]){const resource=parse3DResource(readFileSync(new URL('../public/examples/'+file,import.meta.url),'utf8'));assert.equal(resource.kind,kind);assert.deepEqual(resource.definition,kind==='character'?p.characters[id]:p.stages[id]);}});

test('resource preview is isolated, valid and uses only the chosen character or stage',()=>{
 const project=sample(),before=JSON.stringify(project),character=resource3DPreview('character','bo',project.characters.bo);
 assert.equal(character.studio,true);assert.equal(character.label,'Bo');assert.deepEqual(Object.keys(character.project.characters),['bo']);assert.equal(character.shot.actors.length,1);assert.equal(character.shot.actors[0].character,'bo');assert.equal(character.shot.actors[0].x,0);assert.equal(character.shot.camera.orbit,0);assert.ok(validateProject(character.project));
 const stage=resource3DPreview('stage','plaza',project.stages.plaza);assert.equal(stage.studio,false);assert.equal(stage.shot.actors.length,0);assert.deepEqual(Object.keys(stage.project.stages),['plaza']);assert.ok(validateProject(stage.project));assert.equal(JSON.stringify(project),before);
 for(const height of [1,6])assert.ok(validateProject(resource3DPreview('character','bo',{...project.characters.bo,height}).project));
 assert.throws(()=>resource3DPreview('character','bo',{...project.characters.bo,height:NaN}),/height/);
});

test('AI action sequences inherit endpoints and start times, round trip and hold through gaps',()=>{
 const p=sample(),a=p.scenes[0].stage3d!.actors[0];a.actions=[];const raw:any=JSON.parse(JSON.stringify(p));raw.scenes[0].stage3d.actors[0]={id:'mika',character:'mika',x:-4,z:1,rotation:20,actions:[{type:'walk',duration:2,toX:0},{type:'idle',duration:1},{type:'walk',at:4,duration:2,toZ:3},{type:'wave',duration:1}]};
 const parsed=validateProject(raw),actor=parsed.scenes[0].stage3d!.actors[0];assert.deepEqual(actor.actions.map(a=>a.at),[0,2,4,6]);assert.equal(actor.actions[0].faceMovement,true);assert.deepEqual(actor3DPosition(actor,-1),{x:-4,z:1});assert.deepEqual(actor3DPosition(actor,3.5),{x:0,z:1});assert.deepEqual(actor3DPosition(actor,7),{x:0,z:3});assert.deepEqual(parseProject(JSON.stringify(parsed)),parsed);
 const midpoint=actor3DPose(actor,5,parsed.scenes[0].stage3d!.actors);for(const t of [7,0,6,2,4])actor3DPose(actor,t,parsed.scenes[0].stage3d!.actors);assert.deepEqual(actor3DPose(actor,5,parsed.scenes[0].stage3d!.actors),midpoint);
});

test('sequences reject overlaps, out-of-scope times, excess actions and ambiguous orientation',()=>{
 const change=[(s:any)=>s[1].at=1,(s:any)=>s[0].duration=8,(s:any)=>s[0].duration=0,(s:any)=>s[0].at=-1,(s:any)=>s[0].blend=-1,(s:any)=>s[0].blend=3,(s:any)=>s[0].toX=NaN,(s:any)=>s[0].faceMovement=null,(s:any)=>s[0].script='run()',(s:any)=>s[0].type='dance',(s:any)=>s[0].easing='random',(s:any)=>{s[0].type='wave';s[0].toX=1;},(s:any)=>{s[0].rotation=45;s[0].target='bo';},(s:any)=>{s[0].type='turn';},(s:any)=>s[0].target='missing',(s:any)=>s[0].target='mika',(s:any)=>s[0].target='constructor'];
 for(const mutate of change){const p:any=sample();p.scenes[0].stage3d.actors[0].actions=[{type:'walk',duration:2,toX:1},{type:'wave',duration:2}];mutate(p.scenes[0].stage3d.actors[0].actions);assert.throws(()=>validateProject(p));}
 const p=sample();(p.scenes[0].stage3d!.actors[0] as any).actions=Array.from({length:65},()=>({type:'idle',duration:.01}));assert.throws(()=>validateProject(p),/max 64/);
});

test('reciprocal targets use actor IDs and time-sampled positions without recursive facing',()=>{
 const raw:any=JSON.parse(JSON.stringify(sample()));raw.scenes[0].stage3d.actors=[{id:'one',character:'mika',x:-2,actions:[{type:'turn',duration:1,target:'two'},{type:'wave',duration:4,target:'two'}]},{id:'two',character:'mika',x:2,actions:[{type:'turn',duration:1,target:'one'},{type:'walk',duration:4,toZ:4,target:'one'}]}];
 const actors=validateProject(raw).scenes[0].stage3d!.actors;
 assert.ok(Math.abs(actor3DPose(actors[0],1,actors).rotation-Math.PI/2)<1e-10);assert.ok(Math.abs(actor3DPose(actors[1],1,actors).rotation+Math.PI/2)<1e-10);
 const pose=actor3DPose(actors[0],3,actors),target=actor3DPosition(actors[1],3);assert.ok(Math.abs(pose.rotation-Math.atan2(target.x+2,target.z))<1e-10);assert.deepEqual(actor3DPose(actors[0],6,actors),actor3DPose(actors[0],6,actors));
 const held=actor3DPose(actors[0],5,actors).rotation;assert.equal(actor3DPose(actors[0],7,actors).rotation,held);
});

test('turns take the shortest angular route and coincident targets keep the initial heading',()=>{
 const p:any=JSON.parse(JSON.stringify(sample()));p.scenes[0].stage3d.actors=[{id:'one',character:'mika',rotation:350,actions:[{type:'turn',duration:2,rotation:10}]}];let actors=validateProject(p).scenes[0].stage3d!.actors;const radians=actor3DPose(actors[0],1,actors).rotation;assert.ok(Math.abs(radians-2*Math.PI)<1e-9);
 p.scenes[0].stage3d.actors=[{id:'one',character:'mika',rotation:25,actions:[{type:'turn',duration:2,target:'two'}]},{id:'two',character:'bo',actions:[]}];actors=validateProject(p).scenes[0].stage3d!.actors;assert.ok(Math.abs(actor3DPose(actors[0],2,actors).rotation-25*Math.PI/180)<1e-10);
});

test('walk and wave transitions stay continuous at action boundaries and use eased movement',()=>{
 const raw:any=JSON.parse(JSON.stringify(sample()));raw.scenes[0].stage3d.actors[0]={id:'mika',character:'mika',actions:[{type:'walk',duration:2,toX:4},{type:'wave',duration:2},{type:'idle',duration:3}]};const actors=validateProject(raw).scenes[0].stage3d!.actors,a=actors[0];
 assert.ok(actor3DPosition(a,.5).x<1);assert.equal(actor3DPosition(a,1).x,2);
 for(const at of [0,2,4]){const before=actor3DPose(a,at-1e-6,actors),after=actor3DPose(a,at+1e-6,actors);for(const key of ['x','z','rotation','leftArm','rightArm','leftLeg','rightLeg','wave','bob'] as const)assert.ok(Math.abs(before[key]-after[key])<.0001,key+' jumps at '+at);}
 assert.notEqual(actor3DPose(a,3,actors).rightArm,0);assert.equal(actor3DPose(a,4,actors).rightArm,0);
});

test('offline AI guide sequence example is complete and validates without external resources',()=>{
 const p=validateProject(aiAction3DExample);assert.equal(p.scenes[0].stage3d!.actors[0].actions.length,3);assert.ok(aiGuide.includes(JSON.stringify(aiAction3DExample)));assert.ok(aiGuide.includes('whole-body yaw'));assert.ok(aiGuide.includes('no implicit cross-scene state'));
});


test('decimal action boundaries tolerate floating point roundoff, not real overlap',()=>{
 const raw:any={version:'1.0',title:'Decimals',format:'landscape',characters:{robot:{}},stages:{plaza:{}},scenes:[{id:'s',duration:.4,stage3d:{stage:'plaza',actors:[{id:'r',character:'robot',actions:[{duration:.1},{duration:.2},{at:.3,duration:.1}]}]},elements:[]}]};const p=validateProject(raw);assert.deepEqual(parseProject(JSON.stringify(p)),p);raw.scenes[0].stage3d.actors[0].actions[2].at=.299;assert.throws(()=>validateProject(raw),/non-overlapping/);
});


test('legacy single-action JSON retains its original linear motion and fixed yaw',()=>{
 const raw:any={version:'1.0',title:'Legacy',format:'landscape',characters:{robot:{}},stages:{plaza:{}},scenes:[{id:'s',duration:5,stage3d:{stage:'plaza',actors:[{id:'r',character:'robot',x:-4,z:1,toX:2,toZ:3,rotation:25,action:'walk',at:1,duration:3}]},elements:[]}]};const p=validateProject(raw),a=p.scenes[0].stage3d!.actors[0];assert.deepEqual(a.actions,[]);assert.deepEqual(actor3DPosition(a,2.5),{x:-1,z:2});assert.equal(actor3DPose(a,3).rotation,25*Math.PI/180);assert.deepEqual(parseProject(JSON.stringify(p)),p);
});
