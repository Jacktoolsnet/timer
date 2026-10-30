import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {race3DExample,raceProgress3D,raceDuration3D} from '../src/lib/race3d-example.ts';
import {raceEffectsWav} from '../src/lib/race3d-audio.ts';
import {resolveStartupProject} from '../src/lib/startup-project.ts';
import {validateProject,parseProject,demoProject,projectJsonBytes} from '../src/lib/model.ts';
import {actor3DFrame} from '../src/lib/stage3d.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('finished race is a valid four-lap production with continuous transforms through every camera cut',()=>{
 const p=validateProject(race3DExample);close(p.scenes.reduce((n,s)=>n+s.duration,0),raceDuration3D);assert.equal(p.scenes.length,13);
 for(const car of ['red','blue']){
  let laps=0;for(let i=0;i<p.scenes.length;i++){const scene=p.scenes[i],shot=scene.stage3d!,actor=shot.actors.find(a=>a.id===car)!;laps+=actor.path?.laps??0;
   if(i){const previous=p.scenes[i-1],old=previous.stage3d!,a=actor3DFrame(old.actors.find(a=>a.id===car)!,previous.duration,old.actors,p.stages.track.paths!),b=actor3DFrame(actor,0,shot.actors,p.stages.track.paths!);for(const field of ['position','up','forward'] as const)for(const axis of ['x','y','z'] as const)close(a[field][axis],b[field][axis]);}
  }close(laps,4);
 }
 assert.ok(raceProgress3D('blue',12)>raceProgress3D('red',12));assert.ok(raceProgress3D('blue',24)<raceProgress3D('red',24));close(raceProgress3D('red',48),4);assert.ok(raceProgress3D('blue',48)<4);close(raceProgress3D('blue',48.5),4);
 assert.ok(p.music?.enabled);assert.ok(p.music.notes.length>200);assert.ok(p.characters.marshal.model!.animations.finishWave);assert.ok(p.firstComment.includes('Team'));assert.ok(p.hashtags.includes('#MonsterTruck'));
});
test('procedural effects are deterministic, finite mono PCM, correctly timed and self-contained',()=>{
 const a=raceEffectsWav(),b=raceEffectsWav();assert.deepEqual(a,b);const v=new DataView(a.buffer);assert.equal(new TextDecoder().decode(a.slice(0,4)),'RIFF');assert.equal(v.getUint32(24,true),12000);assert.equal(v.getUint16(22,true),1);close(v.getUint32(40,true)/24000,61.5);
 const energy=(time:number)=>{let sum=0;for(let i=0;i<600;i++){const sample=v.getInt16(44+(Math.floor(time*12000)+i)*2,true);sum+=sample*sample;}return sum;};assert.equal(energy(1),0);assert.ok(energy(4.04)>0);assert.ok(energy(8)>0);assert.ok(energy(58)>0);
});
test('shipped default includes cover, sound, four templates and complete publication metadata within recovery budget',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),'utf8'));assert.equal(p.title,race3DExample.title);assert.match(p.thumbnail!.data,/^data:image\/jpeg;base64,/);assert.match(p.audios.racefx.data,/^data:audio\/wav;base64,/);close(p.audios.racefx.duration,raceDuration3D);assert.equal(p.narration!.asset,'racefx');assert.equal(p.groups3d.audience.characters.length,4);assert.ok(projectJsonBytes(p)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(p)),p);
});
test('startup prioritizes saved work, handles corrupt storage and failed default loads without losing editing',async()=>{
 const p=demoProject();p.title='My saved work';let calls=0;const load=async()=>{calls++;return validateProject(race3DExample);};const recovered=await resolveStartupProject(JSON.stringify(p),load);assert.equal(recovered.project.title,p.title);assert.ok(recovered.recovered);assert.equal(calls,0);
 const fresh=await resolveStartupProject(null,load);assert.equal(fresh.project.title,race3DExample.title);assert.equal(calls,1);assert.equal(fresh.error,false);
 const corrupt=await resolveStartupProject('{invalid',load);assert.ok(corrupt.error);assert.equal(corrupt.project.title,race3DExample.title);
 const failed=await resolveStartupProject(null,async()=>{throw Error('offline');});assert.ok(failed.error);assert.equal(failed.project.title,lightCollectorProject().title);
});
test('production track has a separated spiral, banked curves and entirely above-ground road meshes',async()=>{
 const {racePath3D:route,raceRoadParts3D:road,raceRoadWidth3D:width,spiralEntryIndex3D:entry,spiralExitIndex3D:exit,raceJumpGap3D:gap,raceRoadSamples3D:samples}=await import('../src/lib/race3d-track.ts');
 const {samplePath3D,sub,eulerFrame3D,dot}=await import('../src/lib/path3d.ts');
 const a=route.points[entry],b=route.points[exit];close(a.x,b.x);close(a.y,b.y);assert.ok(Math.abs(a.z-b.z)>width+1);assert.equal(exit-entry,24);
 let length=0,previous=samplePath3D(route,0),maxBank=0;
 for(let i=1;i<=2000;i++){
  const f=samplePath3D(route,i/2000);length+=Math.hypot(...Object.values(sub(f.position,previous.position)));assert.ok(dot(previous.up,f.up)>.98);assert.ok(dot(previous.forward,f.forward)>.98);
  if(f.position.z>0){assert.ok(f.up.y>.8);maxBank=Math.max(maxBank,Math.abs(f.right.y));}
  for(const lane of [-1.15,1.15])assert.ok(samplePath3D(route,i/2000,lane).position.y>.5);
  previous=f;
 }
 assert.ok(length>230);assert.ok(maxBank>Math.sin(20*Math.PI/180));
 for(let i=0;i<samples;i++)assert.equal(road.some(p=>p.id==='road'+i),!gap(samplePath3D(route,(i+.5)/samples).position));assert.ok(road.some(p=>p.position.x>9&&p.position.x<14&&p.position.z< -8));
 for(const p of road){const r=p.rotation,f=eulerFrame3D(r.x*Math.PI/180,r.y*Math.PI/180,r.z*Math.PI/180);for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const bottom=p.position.y+x*p.size.x/2*f.right.y+y*p.size.y/2*f.up.y+z*p.size.z/2*f.forward.y;assert.ok(bottom>0,`${p.id} penetrates ground: ${bottom}`);}}
 const seam0=samplePath3D(route,0),seam1=samplePath3D(route,1-1e-7);assert.ok(dot(seam0.up,seam1.up)>.99999);
});
test('detailed trucks use reusable animated wheel children and shipped geometry matches the source',()=>{
 const p=validateProject(race3DExample),shipped=parseProject(readFileSync(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),'utf8'));
 for(const car of ['red','blue']){const m=p.characters[car].model!;assert.ok(m.parts.length>120);for(const id of ['grille','rollCrossbar','roofLights','spareTire','axle1','shockleftFront','treadleftFront0'])assert.ok(m.parts.some(p=>p.id===id),id);assert.equal(m.parts.find(p=>p.id==='treadleftFront0')!.parent,'rollleftFront');assert.deepEqual(shipped.characters[car].model,m);}
 assert.deepEqual(shipped.characters.marshal,p.characters.marshal);
 assert.deepEqual(shipped.stages.track.paths,p.stages.track.paths);
 assert.deepEqual(shipped.stages.track.model,p.stages.track.model);
});
test('larger arena contains the whole road; rotated seated fans face the loop and align with their benches',async()=>{
 const {stage3DGroundSize,defaultStage3D}=await import('../src/lib/stage3d.ts'),{groupMembers3D,groupMemberFrame3D}=await import('../src/lib/group3d.ts');
 const p=validateProject(race3DExample),stage=p.stages.track,half=stage3DGroundSize(stage)/2;assert.equal(stage3DGroundSize(defaultStage3D()),56);assert.equal(half,45);
 for(const part of stage.model!.parts.filter(p=>/^road\d+$/.test(p.id))){assert.ok(Math.abs(part.position.x)+part.size.x/2+part.size.z/2<half);assert.ok(Math.abs(part.position.z)+part.size.x/2+part.size.z/2<half);}
 const placement=p.scenes[0].stage3d!.groups![0];assert.equal(placement.rotation,180);
 for(const [index,member] of groupMembers3D(p.groups3d.audience).entries()){
  const frame=groupMemberFrame3D(member,placement);assert.ok(frame.forward.z<-.98);
  const bench=stage.model!.parts.find(p=>p.id==='standBench'+Math.floor(index/12))!;
  assert.ok(Math.abs(frame.position.z-bench.position.z)<.03);assert.ok(Math.abs(frame.position.x-bench.position.x)<6.2);
 }
 assert.ok(stage.model!.parts.some(p=>p.id==='towerDeck'));assert.ok(stage.model!.parts.some(p=>p.id==='towerLetter0'));
});
test('marshal and attached flag keep one global wave clock across all cuts, with room beside the track',async()=>{
 const {modelPose3D}=await import('../src/lib/model3d.ts');const p=validateProject(race3DExample),model=p.characters.marshal.model!;
 assert.equal(model.parts.filter(p=>/^flagTile/.test(p.id)).length,24);assert.equal(model.parts.find(p=>p.id==='flagPole')!.parent,'flagArm');
 for(let i=1;i<p.scenes.length;i++){
  const previous=p.scenes[i-1],scene=p.scenes[i],before=previous.stage3d!.actors.find(a=>a.id==='marshal')!,after=scene.stage3d!.actors.find(a=>a.id==='marshal')!;
  const a=modelPose3D(model,{},before.motions,previous.duration-1e-7).get('flagWave')!,b=modelPose3D(model,{},after.motions,0).get('flagWave')!;assert.ok(Math.abs(a-b)<.0001);
  assert.equal(after.z,-19.6);assert.equal(after.y,3);
 }
 const waving=p.scenes.find(s=>s.id==='race8')!.stage3d!.actors.find(a=>a.id==='marshal')!;assert.notEqual(modelPose3D(model,{},waving.motions,.1).get('flagWave'),modelPose3D(model,{},waving.motions,.3).get('flagWave'));
});
test('English publication metadata and authored cover are preserved in the shipped race',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),'utf8')),notes=readFileSync(new URL('../public/examples/monstertruck-race-publication.en.md',import.meta.url),'utf8');
 for(const key of ['title','description','firstComment','hashtags'] as const){assert.equal(p[key],race3DExample[key]);assert.ok(notes.includes(p[key]));}
 assert.ok(p.title.length<70);assert.equal(p.hashtags.split(' ').length,3);assert.ok(!p.hashtags.includes('#Roblox'));assert.ok(p.description.includes('Not Roblox gameplay'));
 const cover=readFileSync(new URL('../public/examples/monstertruck-race-cover-en.jpg',import.meta.url));assert.equal(p.thumbnail!.data,'data:image/jpeg;base64,'+cover.toString('base64'));assert.ok(cover.byteLength<2*1024*1024);
});
