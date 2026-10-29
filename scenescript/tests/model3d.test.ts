import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseModel3D,parseJointValues3D,parseModelMotions3D,modelPose3D,modelRadius3D} from '../src/lib/model3d.ts';
import {construction3DExample,aiModel3DExample} from '../src/lib/model3d-example.ts';
import {validateProject,parseProject} from '../src/lib/model.ts';
import {parse3DResource,MAX_3D_RESOURCE_BYTES} from '../src/lib/stage3d.ts';
import {resource3DPreview} from '../src/lib/stage3d-resource-preview.ts';
import {aiGuide} from '../src/lib/guide.ts';
const simple=()=>({parts:[{id:'base',shape:'group'},{id:'arm',parent:'base',joints:[{id:'hinge',min:-90,max:90}]}],animations:{swing:{duration:2,tracks:[{joint:'hinge',keys:[{at:0,value:-60},{at:1,value:60},{at:2,value:-60}]}]}}});
test('free construction projects, generic resources and compact AI example validate and roundtrip',()=>{
 for(const raw of [construction3DExample,aiModel3DExample]){const p=validateProject(raw);assert.deepEqual(parseProject(JSON.stringify(p)),p);}
 const p=validateProject(construction3DExample);for(const [kind,id,definition]of [['character','truck',p.characters.truck],['character','robot',p.characters.robot],['stage','workshop',p.stages.workshop]] as const){
  const raw=JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind,id,definition});assert.ok(new TextEncoder().encode(raw).length<MAX_3D_RESOURCE_BYTES);assert.deepEqual(parse3DResource(raw).definition,definition);
 }
 assert.ok(aiGuide.includes(JSON.stringify(aiModel3DExample)));assert.ok(aiGuide.includes('FREE CONSTRUCTION'));
});
test('construction defaults, strict unknown keys, finite dimensions, parents and joint limits',()=>{
 const model=parseModel3D(simple())!;assert.equal(model.parts[1].shape,'box');assert.deepEqual(model.parts[1].pivot,{x:0,y:0,z:0});assert.equal(model.parts[1].joints[0].target,90);
 const mutations=[(m:any)=>m.parts[1].parent='missing',(m:any)=>m.parts[0].parent='arm',(m:any)=>m.parts[1].id='base',(m:any)=>m.parts[1].parent='arm',(m:any)=>m.parts[1].shape='eval',(m:any)=>m.parts[1].size={x:0},(m:any)=>m.parts[1].position={x:NaN},(m:any)=>m.parts[1].pivot={z:Infinity},(m:any)=>m.parts[1].color='red',(m:any)=>m.parts[1].script='alert(1)',(m:any)=>m.parts[1].roughness=2,(m:any)=>m.parts[1].joints[0].max=-100,(m:any)=>m.parts[1].joints[0].value=100,(m:any)=>m.parts[1].joints[0].target=100,(m:any)=>m.parts[1].joints[0].axis='w',(m:any)=>m.parts[1].joints[0].control='execute',(m:any)=>m.parts[1].joints[0].motion='scale',(m:any)=>m.parts[1].joints[0].min=null,(m:any)=>m.parts[1].joints.push({...m.parts[1].joints[0],id:'other'}),(m:any)=>m.parts.push({id:'third',joints:[{id:'hinge',min:-1,max:1}]}),(m:any)=>{m.parts[1].joints[0].motion='translation';m.parts[1].joints[0].min=-51;}];
 for(const mutate of mutations){const m:any=simple();mutate(m);assert.throws(()=>parseModel3D(m));}
 assert.equal(parseModel3D({parts:Array.from({length:512},(_,i)=>({id:'p'+i}))})!.parts.length,512);assert.throws(()=>parseModel3D({parts:[]}));assert.throws(()=>parseModel3D({parts:Array.from({length:513},(_,i)=>({id:'p'+i}))}));
 assert.throws(()=>parseModel3D({parts:Array.from({length:33},(_,i)=>({id:'p'+i,parent:i?'p'+(i-1):''}))}),/depth/);
 assert.ok(parseModel3D({parts:[...simple().parts].reverse()}));assert.ok(modelRadius3D(model)>0);
});
test('animation keys and timelines validate references, budgets, ordering and numeric bounds',()=>{
 const mutations=[(m:any)=>m.animations.swing.tracks[0].joint='missing',(m:any)=>m.animations.swing.duration=0,(m:any)=>m.animations.swing.tracks[0].keys[0].at=.1,(m:any)=>m.animations.swing.tracks[0].keys[1].at=0,(m:any)=>m.animations.swing.tracks[0].keys[2].at=3,(m:any)=>m.animations.swing.tracks[0].keys[1].value=100,(m:any)=>m.animations.swing.tracks[0].easing='random',(m:any)=>m.animations.swing.tracks.push(m.animations.swing.tracks[0])];
 for(const mutate of mutations){const m:any=simple();mutate(m);assert.throws(()=>parseModel3D(m));}
 const model=parseModel3D(simple())!;
 const motion=parseModelMotions3D([{animation:'swing',duration:2},{animation:'swing',duration:2}],model,4,'motions');assert.deepEqual(motion.map(m=>m.at),[0,2]);
 for(const raw of [[{animation:'missing',duration:2}],[{animation:'swing',duration:5}],[{animation:'swing',duration:2},{animation:'swing',at:1,duration:1}],[{animation:'swing',duration:2,speed:0}],[{animation:'swing',duration:2,loop:1}],[{animation:'swing',duration:2,blend:null}]]){
  assert.throws(()=>parseModelMotions3D(raw,model,4,'motions'));
 }
 assert.throws(()=>parseJointValues3D({missing:1},model,'pose'));assert.throws(()=>parseJointValues3D({hinge:91},model,'pose'));assert.deepEqual(parseJointValues3D({hinge:20},model,'pose'),{hinge:20});
});
test('model poses use absolute time, loops, speed, soft boundaries and per-instance rest overrides',()=>{
 const model=parseModel3D(simple())!,motion=parseModelMotions3D([{animation:'swing',at:1,duration:5,loop:true,blend:0}],model,7,'motions');
 assert.equal(modelPose3D(model,{},motion,1).get('hinge'),-60);assert.equal(modelPose3D(model,{},motion,1.5).get('hinge'),0);assert.equal(modelPose3D(model,{},motion,2).get('hinge'),60);assert.equal(modelPose3D(model,{},motion,4).get('hinge'),60);
 const sample=modelPose3D(model,{},motion,2.2);for(const t of [6,0,3,5])modelPose3D(model,{},motion,t);assert.deepEqual(modelPose3D(model,{},motion,2.2),sample);
 assert.equal(modelPose3D(model,{hinge:25},motion,0).get('hinge'),25);assert.equal(modelPose3D(model,{hinge:25},motion,6).get('hinge'),25);
 motion[0].speed=2;assert.equal(modelPose3D(model,{},motion,1.5).get('hinge'),60);
 motion[0].blend=.2;assert.equal(modelPose3D(model,{hinge:25},motion,1).get('hinge'),25);
 const before=JSON.stringify(model);modelPose3D(model,{},motion,2);assert.equal(JSON.stringify(model),before);
});
test('custom joints can bind to mouth and Mimik controls without hardcoded face geometry',()=>{
 const raw:any=simple();raw.parts[1].joints[0].control='mouth';raw.parts[1].joints[0].target=60;const model=parseModel3D(raw)!;
 assert.equal(modelPose3D(model,{},[],0,{mouth:.5}).get('hinge'),30);
 assert.equal(modelPose3D(model,{hinge:-60},[],0,{mouth:.5}).get('hinge'),0);
 assert.equal(modelPose3D(model,{},[],0,{mouth:5}).get('hinge'),60);
 assert.equal(modelPose3D(model,{},[],0,{happy:1}).get('hinge'),0);
});
test('custom resource previews are isolated and play selected model animations',()=>{
 const p=validateProject(construction3DExample);
 const truck=resource3DPreview('character','truck',p.characters.truck,'drive');assert.equal(truck.shot.actors[0].motions[0].animation,'drive');assert.ok(validateProject(truck.project));
 const stage=resource3DPreview('stage','workshop',p.stages.workshop,'openGate');assert.equal(stage.shot.stageMotions![0].animation,'openGate');assert.ok(validateProject(stage.project));
 assert.equal(resource3DPreview('character','truck',p.characters.truck,'toString').shot.actors[0].motions.length,0);
});
test('spatial actor settings and stage joint/motion references validate before render',()=>{
 const raw:any=structuredClone(construction3DExample);raw.scenes[0].stage3d.actors[0].y=2;raw.scenes[0].stage3d.actors[0].pitch=20;raw.scenes[0].stage3d.actors[0].roll=-15;assert.ok(validateProject(raw));
 for(const mutate of [(p:any)=>p.scenes[0].stage3d.stageJoints={missing:1},(p:any)=>p.scenes[0].stage3d.actors[0].joints={steerleftFront:90},(p:any)=>p.scenes[0].stage3d.actors[0].motions[0].animation='missing',(p:any)=>p.scenes[0].stage3d.actors[0].y=NaN]){
  const p:any=structuredClone(raw);mutate(p);assert.throws(()=>validateProject(p));
 }
 const p:any=structuredClone(raw);p.characters.truck.model={parts:Array.from({length:256},(_,i)=>({id:'p'+i}))};p.scenes[0].stage3d.actors=Array.from({length:9},(_,i)=>({id:'a'+i,character:'truck'}));assert.throws(()=>validateProject(p),/2048/);
});
test('generic downloadable project and independent resources match the canonical example',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/construction.scenescript.json',import.meta.url),'utf8'));assert.match(p.thumbnail!.data,/^data:image\/png;base64,/);p.thumbnail=null;assert.deepEqual(p,validateProject(construction3DExample));
 for(const [file,id,kind] of [['truck.scenecharacter.json','truck','character'],['workshop-robot.scenecharacter.json','robot','character'],['workshop.scenestage.json','workshop','stage']]){
  const resource=parse3DResource(readFileSync(new URL('../public/examples/'+file,import.meta.url),'utf8'));assert.deepEqual(resource.definition,kind==='character'?p.characters[id]:p.stages[id]);
 }
});
test('resource IDs cannot access prototypes and construction key budgets are enforced',()=>{
 const model=parseModel3D(JSON.parse('{"parts":[{"id":"__proto__","joints":[{"id":"constructor","min":-1,"max":1}]}],"animations":{"__proto__":{"duration":1,"tracks":[{"joint":"constructor","keys":[{"at":0,"value":0},{"at":1,"value":1}]}]}}}'))!;
 assert.equal(modelPose3D(model,{},[],0).get('constructor'),0);assert.equal(Object.hasOwn(model.animations,'__proto__'),true);
 const motions=parseModelMotions3D([{animation:'__proto__',duration:1,blend:0}],model,1,'motions');assert.equal(modelPose3D(model,{},motions,.5).get('constructor'),.5);
 const joints=Array.from({length:5},(_,i)=>({id:'j'+i,axis:['x','y','z'][i%3],motion:i<3?'rotation':'translation',min:-1,max:1}));
 const tracks=joints.map(j=>({joint:j.id,keys:Array.from({length:64},(_,i)=>({at:i/63,value:0}))}));
 assert.throws(()=>parseModel3D({parts:[{id:'part',joints}],animations:Object.fromEntries(Array.from({length:16},(_,i)=>['clip'+i,{duration:1,tracks}]))}),/4096/);
});

test('optical finishes are strictly optional, validated and portable without altering standard parts',()=>{
 const plain=parseModel3D({parts:[{id:'base'}]})!;assert.ok(!Object.hasOwn(plain.parts[0],'finish'));assert.deepEqual(parseModel3D({parts:[{id:'base',finish:'standard'}]}),plain);
 for(const finish of ['glass','polished']){const model=parseModel3D({parts:[{id:'base',finish}]})!;assert.equal(model.parts[0].finish,finish);assert.deepEqual(parseModel3D(JSON.parse(JSON.stringify(model))),model);}
 for(const finish of [null,1,true,'mirror','<script>'])assert.throws(()=>parseModel3D({parts:[{id:'bad',finish}]}),/finish/);
 assert.throws(()=>parseModelMotions3D([{animation:'swing',duration:1,finish:'glass'}],parseModel3D(simple()),2,'motions'),/unknown field/);
});
test('signed action targets are calibration gains, while physical poses and animation keys remain bounded',()=>{
 const raw={parts:[{id:'arm',joints:[{id:'shoulder',motion:'rotation',axis:'x',min:-55,max:55,value:0,control:'leftArm',target:180}]}]};
 const model=parseModel3D(raw)!;
 assert.equal(modelPose3D(model,{},[],0,{leftArm:.2}).get('shoulder'),36);
 assert.equal(modelPose3D(model,{},[],0,{leftArm:1}).get('shoulder'),55);
 assert.equal(modelPose3D(model,{},[],0,{leftArm:-1}).get('shoulder'),-55);
 for(const control of ['leftArm','rightArm','leftLeg','rightLeg','wave','bob'])assert.equal(parseModel3D({parts:[{id:'part',joints:[{...raw.parts[0].joints[0],control}]}]})!.parts[0].joints[0].target,180);
 for(const control of ['none','mouth','speech','happy'])assert.throws(()=>parseModel3D({parts:[{id:'part',joints:[{...raw.parts[0].joints[0],control}]}]}),/target: expected number -55–55/);
 assert.throws(()=>parseModel3D({parts:[{id:'part',joints:[{...raw.parts[0].joints[0],target:3601}]}]}),/target/);
 assert.throws(()=>parseModel3D({...raw,animations:{invalid:{duration:1,tracks:[{joint:'shoulder',keys:[{at:0,value:180}]}]}}}),/value/);
});
