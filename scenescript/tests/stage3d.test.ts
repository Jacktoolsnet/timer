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
test('three characters and one stage are shared across two self-contained scene shots',()=>{
 const p=sample();assert.equal(Object.keys(p.characters).length,3);assert.equal(Object.keys(p.stages).length,1);assert.equal(p.scenes.length,2);assert.equal(p.scenes[0].stage3d!.stage,p.scenes[1].stage3d!.stage);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.ok(aiGuide.includes('3D WORLD UNITS'));assert.ok(aiGuide.includes('no implicit cross-scene state'));
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

test('downloadable robot example and companion files match the canonical project',()=>{const p=parseProject(readFileSync(new URL('../public/examples/block-robots.scenescript.json',import.meta.url),'utf8'));assert.match(p.thumbnail!.data,/^data:image\/png;base64,/);p.thumbnail=null;assert.deepEqual(p,sample());for(const [file,id,kind] of [['mika.scenecharacter.json','mika','character'],['bo.scenecharacter.json','bo','character'],['lina.scenecharacter.json','lina','character'],['plaza.scenestage.json','plaza','stage']]){const resource=parse3DResource(readFileSync(new URL('../public/examples/'+file,import.meta.url),'utf8'));assert.equal(resource.kind,kind);assert.deepEqual(resource.definition,kind==='character'?p.characters[id]:p.stages[id]);}});

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

test('character face styles validate, survive resource export and preserve legacy defaults',()=>{
 const p=sample();assert.deepEqual(Object.values(p.characters).map(c=>c.style),['robot','pixel','brick']);
 for(const style of ['classic','robot','pixel','brick']){
  const resource=parse3DResource(JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind:'character',id:'face',definition:{style}}));
  assert.equal((resource.definition as any).style,style);assert.deepEqual(parse3DResource(JSON.stringify(resource)),resource);
 }
 for(const style of [null,42,'smile',{},'']){const raw:any=structuredClone(stage3DExample);raw.characters.mika.style=style;assert.throws(()=>validateProject(raw),/style/);}
 const raw:any=structuredClone(stage3DExample);delete raw.characters.mika.style;assert.equal(validateProject(raw).characters.mika.style,'classic');
});

test('facial expressions are an independent absolute-time track with soft entry and return to base',async()=>{
 const {actor3DFace}=await import('../src/lib/stage3d.ts');
 const a=defaultActor3D('robot');a.expressions=[{expression:'happy',at:1,duration:2,intensity:.8,blend:.5},{expression:'blink',at:3,duration:.24,intensity:1,blend:.12}];
 assert.equal(actor3DFace(a,0).happy,0);assert.equal(actor3DFace(a,1).happy,0);
 assert.ok(Math.abs(actor3DFace(a,1.25).happy-.4)<1e-9);assert.equal(actor3DFace(a,2).happy,.8);
 assert.ok(Math.abs(actor3DFace(a,2.75).happy-.4)<1e-9);assert.equal(actor3DFace(a,3).happy,0);
 assert.ok(actor3DFace(a,3.12).blink>.999);assert.equal(actor3DFace(a,3.12,'happy').happy,1);assert.equal(actor3DFace(a,3.24).blink,0);
 const face=actor3DFace(a,1.3);for(const t of [99,0,3.1,2])actor3DFace(a,t);assert.deepEqual(actor3DFace(a,1.3),face);
 assert.equal(actor3DFace(a,0,'sad').sad,1);assert.ok(Math.abs(actor3DFace(a,2,'sad').sad-.2)<1e-9);
 a.expressions=[{expression:'neutral',at:0,duration:2,intensity:1,blend:0}];assert.equal(actor3DFace(a,1,'angry').angry,0);assert.equal(actor3DFace(a,2,'angry').angry,1);
 a.expressions[0]={expression:'happy',at:0,duration:.1,intensity:1,blend:2};assert.equal(actor3DFace(a,.05).happy,1);
 a.expressions[0].intensity=0;assert.equal(actor3DFace(a,.05,'sad').sad,1);
});

test('expression defaults, timing bounds and independent track validation',()=>{
 const raw:any=structuredClone(stage3DExample);raw.scenes[0].stage3d.actors[0].expressions=[{expression:'happy',duration:2},{expression:'blink',duration:.2},{expression:'sad',at:4,duration:3}];
 const p=validateProject(raw),a=p.scenes[0].stage3d!.actors[0];assert.deepEqual(a.expressions.map(e=>e.at),[0,2,4]);assert.equal(a.expressions[0].intensity,1);assert.equal(a.expressions[0].blend,.2);assert.deepEqual(parseProject(JSON.stringify(p)),p);
 for(const patch of [{expression:'talk'},{expression:null},{at:-1},{duration:0},{duration:8},{intensity:-.1},{intensity:1.1},{intensity:null},{blend:-1},{blend:3},{blend:NaN},{script:'bad'}]){
  const invalid=structuredClone(raw);Object.assign(invalid.scenes[0].stage3d.actors[0].expressions[0],patch);assert.throws(()=>validateProject(invalid),/expressions/);
 }
 for(const expressions of [null,{},Array.from({length:65},()=>({duration:.01})),[{duration:2},{at:1,duration:1}],[{duration:7},{duration:.01}]]){
  const invalid=structuredClone(raw);invalid.scenes[0].stage3d.actors[0].expressions=expressions;assert.throws(()=>validateProject(invalid),/expressions/);
 }
 delete raw.characters.mika.expression;delete raw.scenes[0].stage3d.actors[0].expressions;
 const legacy=validateProject(raw);assert.equal(legacy.characters.mika.expression,'neutral');assert.deepEqual(legacy.scenes[0].stage3d!.actors[0].expressions,[]);
 for(const expression of [null,'talk',0]){raw.characters.mika.expression=expression;assert.throws(()=>validateProject(raw),/expression/);}
});

test('pixel masks stay bounded and blinking preserves the active mouth',async()=>{
 const {pixelFaces3D,facePixel3D}=await import('../src/lib/stage3d-face.ts'),{actor3DFace}=await import('../src/lib/stage3d.ts');
 for(const mask of Object.values(pixelFaces3D)){assert.equal(mask.length,8);for(const row of mask)assert.match(row,/^[.#]{12}$/);}
 const actor=defaultActor3D('robot'),happy=actor3DFace(actor,0,'happy'),blink={...happy,blink:1};
 for(let row=0;row<8;row++)for(let col=0;col<12;col++){const value=facePixel3D(happy,row,col);assert.ok(value>=0&&value<=1);if(row>=4)assert.equal(facePixel3D(blink,row,col),value);}
 assert.ok(aiGuide.includes('Actor3D.expressions'));assert.ok(aiGuide.includes('no persistence across events/scenes'));
});
