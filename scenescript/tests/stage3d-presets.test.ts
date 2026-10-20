import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetCharacterModel3D,presetStageModel3D} from '../src/lib/stage3d-presets.ts';
import {modelPose3D,parseModel3D,modelPartCount3D} from '../src/lib/model3d.ts';
import {parseCharacter3D,parseStage3D,actor3DPose,actor3DFace} from '../src/lib/stage3d.ts';
import {validateProject,parseProject} from '../src/lib/model.ts';
import {stage3DExample} from '../src/lib/stage3d-example.ts';
import {facePixel3D} from '../src/lib/stage3d-face.ts';
test('all old figure types and the plaza expand to editable, independent models',()=>{
 for(const style of ['classic','robot','pixel','brick'] as const){
  const a=parseCharacter3D({style}),b=parseCharacter3D({style});assert.ok(a.model);assert.notEqual(a.model,b.model);
  assert.deepEqual(a.model,presetCharacterModel3D(style));assert.ok(a.model.animations.walk);assert.ok(a.model.animations.wave);
  assert.ok(a.model.parts.some(p=>p.joints.some(j=>j.control==='leftArm')));assert.ok(a.model.parts.some(p=>p.palette==='headColor'));
 }
 const stage=parseStage3D({});assert.deepEqual(stage.model,presetStageModel3D());assert.equal(stage.model!.parts.find(p=>p.id==='studs')!.instances.length,224);assert.ok(modelPartCount3D(stage.model)>224);
});
test('migration of old projects preserves scenes, timing, camera and the action vocabulary',()=>{
 const raw:any=structuredClone(stage3DExample);for(const c of Object.values(raw.characters) as any[])delete c.model;delete raw.stages.plaza.model;
 const migrated=validateProject(raw),canonical=validateProject(stage3DExample);assert.deepEqual(migrated,canonical);assert.deepEqual(parseProject(JSON.stringify(migrated)),canonical);
 assert.ok(Object.values(migrated.characters).every(c=>c.model!==null));assert.ok(migrated.scenes.every(s=>s.stage3d?.stage==='plaza'));
 const explicit={parts:[{id:'custom'}]};assert.equal(parseCharacter3D({style:'robot',model:explicit}).model!.parts[0].id,'custom');
});
test('walking, waving and breathing controls produce the same limb angles as existing actions',()=>{
 const p=validateProject(stage3DExample),shot=p.scenes[0].stage3d!,actor=shot.actors[0],model=p.characters.mika.model!;
 for(const time of [.5,1.1,3.5,5,6.8]){
  const pose=actor3DPose(actor,time,shot.actors),values=modelPose3D(model,{},[],time,{leftArm:pose.leftArm/Math.PI,rightArm:pose.rightArm/Math.PI,leftLeg:pose.leftLeg/Math.PI,rightLeg:pose.rightLeg/Math.PI,wave:pose.wave/(Math.PI/2),bob:pose.bob/.1});
  for(const name of ['leftArm','rightArm','leftLeg','rightLeg'] as const)assert.ok(Math.abs(values.get(name)!-pose[name]*180/Math.PI)<1e-9,name);
  assert.ok(Math.abs(values.get('wave')!-pose.wave*180/Math.PI)<1e-9);assert.ok(Math.abs(values.get('breathing')!-pose.bob)<1e-9);
 }
});
test('editable pixel geometry reproduces all expression, blink and speech masks, including blends',()=>{
 const model=presetCharacterModel3D('pixel');
 for(const mood of ['neutral','happy','sad','angry','surprised'] as const){
  const p=validateProject(stage3DExample),actor=p.scenes[0].stage3d!.actors[1];actor.expressions=[];const face=actor3DFace(actor,0,mood);
  for(const blink of [0,.4,1])for(const speech of [0,.3,1]){
   const controls={...face,blink,speech,mouth:Math.max(speech,face.surprised)},values=modelPose3D(model,{},[],0,controls);
   for(let row=0;row<8;row++)for(let col=0;col<12;col++)for(const axis of ['x','y']){
    const expected=facePixel3D({...face,blink},row,col,speech);assert.ok(Math.abs(values.get('pixel_'+row+'_'+col+'_'+axis)!-expected)<1e-9);
   }
  }
 }
});
test('scale, layered responses and geometry instances reject invalid or ambiguous definitions',()=>{
 const valid={parts:[{id:'eye',joints:[{id:'height',motion:'scale',axis:'y',min:0,max:2,responses:{happy:.7},control:'blink',target:0}]}]};
 const model=parseModel3D(valid)!;assert.equal(model.parts[0].joints[0].value,1);assert.equal(modelPose3D(model,{},[],0,{happy:1,blink:.5}).get('height'),.35);
 for(const mutate of [(m:any)=>m.parts[0].shape='group',(m:any)=>m.parts[0].joints[0].min=-1,(m:any)=>m.parts[0].joints[0].responses={execute:1},(m:any)=>m.parts[0].joints[0].responses={happy:3},(m:any)=>m.parts[0].instances=[{x:1}],(m:any)=>m.parts[0].palette='not an ID']){
  const raw:any=structuredClone(valid);mutate(raw);assert.throws(()=>parseModel3D(raw));
 }
 assert.throws(()=>parseModel3D({parts:[{id:'copies',instances:Array.from({length:257},()=>({}))}]}),/256/);
 assert.throws(()=>parseModel3D({parts:[{id:'copies',instances:[{x:Infinity}]}]}));
});
