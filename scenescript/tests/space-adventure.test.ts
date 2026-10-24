import {effectState3D} from '../src/lib/effects3d.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProject,validateProject} from '../src/lib/model.ts';
import {canApproveStoryboard} from '../src/lib/storyboard.ts';
import {cameraPose3D} from '../src/lib/camera3d.ts';
import {actor3DFrame} from '../src/lib/stage3d.ts';
import {samplePath3D,dot,norm,sub,add,localVector3D} from '../src/lib/path3d.ts';
import {modelPose3D} from '../src/lib/model3d.ts';
const root=new URL('../public/examples/space-adventure-storyboard/',import.meta.url);
const source=parseProject(readFileSync(new URL('spaceadventure_scenescript.json',root),'utf8'));
const project=parseProject(readFileSync(new URL('space-adventure.scenescript.json',root),'utf8'));
function pose(global:number){
 let start=0;for(const scene of project.scenes){if(global<start+scene.duration){const shot=scene.stage3d!;return modelPose3D(project.stages[shot.stage].model!,shot.stageJoints!,shot.stageMotions!,global-start);}start+=scene.duration;}throw new Error('outside timeline');
}
test('space adventure preserves the exact approved storyboard, comments, references and sketches',()=>{
 assert.deepEqual(project.storyboard,source.storyboard);assert.equal(project.storyboard!.revision,27);
 assert.equal(canApproveStoryboard(project.storyboard!),true);assert.equal(project.storyboard!.approved,true);
 assert.equal(Object.keys(project.storyboard!.images).length,8);assert.deepEqual(validateProject(project),project);
 assert.equal(project.format,'portrait');assert.equal(project.scenes.reduce((n,s)=>n+s.duration,0),28.6);
 assert.equal(project.scenes.length,9);assert.ok(project.scenes.every(s=>s.stage3d&&s.transition==='none'));
 assert.equal(project.scenes.find(s=>s.id==='last-target-under-threat')!.duration+project.scenes.find(s=>s.id==='mission-confirmed')!.duration,4);
});
test('six targets use generic destruction, remain destroyed across cuts and support reverse seeking',()=>{
 const destroyed=(time:number,site:string)=>{let start=0;for(const scene of project.scenes){if(time<start+scene.duration)return scene.stage3d!.effects!.some(e=>e.site===site&&effectState3D(e,time-start).result==='break');start+=scene.duration;}return false;};
 const hits=[7.3,9,12.2,16.4,19.35,24.25];
 for(const [index,at]of hits.entries()){
  const id='relay'+(index+1);assert.equal(destroyed(at-.01,id),false);assert.equal(destroyed(at+.01,id),true);assert.equal(destroyed(Math.min(at+1,28.59),id),true);
 }
 for(let i=1;i<=6;i++)assert.equal(destroyed(28.59,'relay'+i),true);
 assert.equal(destroyed(6.9,'relay1'),false);
 assert.equal(project.stages.sector.model!.effectSites!.length,6);
 assert.ok(!project.stages.sector.model!.parts.some(p=>/relay.*(flash|fire)/.test(p.id)),'no hand-built explosion geometry');
 assert.ok(project.scenes.flatMap(s=>s.stage3d!.effects!).some(e=>e.kind==='burn'));
 assert.ok(project.scenes.flatMap(s=>s.stage3d!.effects!).some(e=>e.kind==='damage'));
 assert.ok(Math.abs(project.scenes.find(s=>s.id==='cockpit-fourth-target')!.elements.find(e=>e.id.endsWith('indicator3dark'))!.at-2.4)<1e-8);
});
test('fleet has one command vessel and four escorts; gates and final volley obey story timing',()=>{
 const parts=project.stages.sector.model!.parts;
 assert.equal(parts.filter(p=>/^fleet\d$/.test(p.id)).length,5);
 assert.equal(pose(19).get('fleet0armor0x'),0);assert.equal(pose(21.7).get('fleet0armor0x'),1);
 assert.equal(pose(3.2).get('arrival0x'),0);assert.ok(pose(1).get('arrival0x')!>.9);
 assert.ok(pose(27.5).get('escapeAperture0x')!>.9);assert.ok(Math.abs(pose(28.59).get('escapeAperture0x')!)<1e-8);
 assert.equal(pose(27.4).get('volleyVisible0x'),0);assert.equal(pose(28).get('volleyVisible0x'),1);
 const actor=project.scenes[0].stage3d!.actors[0],model=project.characters[actor.character].model!;
 assert.equal(modelPose3D(model,actor.joints,actor.motions,0).get('arrivehull'),0);
 assert.equal(modelPose3D(model,actor.joints,actor.motions,1).get('arrivehull'),1);
});
test('publication cover, 28.6-second audible PCM and scored music are embedded and self-contained',()=>{
 assert.equal(project.thumbnail!.data,project.storyboard!.images['sketch-arrival-hook'].data);
 const fx=project.audios.spacefx,wav=Buffer.from(fx.data.split(',')[1],'base64');
 assert.equal(fx.duration,28.6);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);
 assert.equal(wav.readUInt32LE(40)/2/24000,28.6);
 let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>5000&&peak<32767);
 assert.ok(project.music!.enabled&&project.music!.notes.length>100);assert.equal(project.narration!.asset,'spacefx');
 assert.ok(project.description.includes('#SciFi'));assert.equal(Object.keys(project.assets).length,5);
});

test('vortex interiors, textured giant planets, distributed targets and the banked U-turn are native resources',()=>{
 const model=project.stages.sector.model!,parts=model.parts,paths=project.stages.sector.paths!;
 for(const name of ['arrival','fleetAperture','escapeAperture']){
  const tunnel=parts.find(p=>p.id===name+'Tunnel')!;assert.equal(tunnel.shape,'plane');assert.ok(tunnel.texture?.asset);
  const asset=project.assets[tunnel.texture!.asset];assert.match(asset.data,/^data:image\/png;base64,/);
 }
 assert.equal(parts.find(p=>p.id==='oceanPlanet')!.size.x,27);assert.ok(parts.find(p=>p.id==='bandedPlanet')!.texture?.asset);
 const targets=parts.filter(p=>/^relay[1-6]$/.test(p.id));for(let i=1;i<targets.length;i++){
  const a=targets[i-1].position,b=targets[i].position;assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>10);
 }
 const route=paths['escape-payoff'];assert.ok(route.points.some(p=>p.x>5));assert.ok(route.points[0].z>route.points.at(-1)!.z+20);
 assert.ok(paths['laser-double-strike'].ups!.every(p=>p.y>.25),'Bank into curves without an independent barrel roll');
 assert.equal(project.scenes.find(s=>s.id==='escape-payoff')!.stage3d!.actors[0].character,'escaping');
});

test('all cameras stay outside the large planets and the last laser misses the sealed escape aperture',()=>{
 const stage=project.stages.sector,planets=stage.model!.parts.filter(p=>['moon','oceanPlanet','bandedPlanet'].includes(p.id));
 for(const scene of project.scenes){const shot=scene.stage3d!;for(let i=0;i<=20;i++){
  const t=scene.duration*i/20,pose=cameraPose3D(shot.camera,t,id=>actor3DFrame(shot.actors.find(a=>a.id===id)!,t,shot.actors,stage.paths));
  for(const planet of planets){const p=planet.position;assert.ok(Math.hypot(pose.position.x-p.x,pose.position.y-p.y,pose.position.z-p.z)>planet.size.x/2,scene.id+' camera inside '+planet.id);}
 }}
 const escape=project.scenes.find(s=>s.id==='escape-payoff')!,actor=escape.stage3d!.actors[0],model=project.characters[actor.character].model!;
 assert.equal(modelPose3D(model,actor.joints,actor.motions,2.5).get('exithullx'),0);
 assert.ok(Math.abs(pose(28.5).get('escapeAperture0x')!)<1e-6);
 const ship=samplePath3D(stage.paths!['escape-payoff'],2.47/2.6);assert.ok(ship.position.z+2.6<24.12,'tail cleared entrance before concealment');
 assert.ok(20+pose(28.47).get('volleyTravel0z')!-2>24.12,'leading laser tip stays behind the ship until its tail clears');
 assert.ok(20+pose(28.5).get('volleyTravel0z')!>24,'first tracer centre has not reached the sealed entrance yet');
 assert.ok(samplePath3D(stage.paths!['escape-payoff'],.95).forward.z<-.95);
});

test('detailed cockpit has moving physical instruments and editable, mission-synchronized readouts',()=>{
 assert.ok(project.scenes.filter(s=>s.stage3d?.actors.some(a=>a.character==='cockpit')).every(s=>s.elements.every(e=>e.id!=='reticle'&&e.text!=='⌖')),'Cockpit views stay free of crosshairs');
 const cockpit=project.characters.cockpit.model!;assert.ok(cockpit.parts.length>=60);
 for(const id of ['gaugeNeedleL','throttleR','ventL0','bezelScrewR3','toggleL2'])assert.ok(cockpit.parts.some(p=>p.id===id));
 const scene=project.scenes.find(s=>s.id==='cockpit-fourth-target')!,actor=scene.stage3d!.actors[0];
 const a=modelPose3D(cockpit,actor.joints,actor.motions,.2),b=modelPose3D(cockpit,actor.joints,actor.motions,1.2);
 assert.notEqual(a.get('needleL'),b.get('needleL'));assert.notEqual(a.get('throttleR'),b.get('throttleR'));
 for(const id of ['cockpit-mission','cockpit-fourth-target','mission-confirmed']){
  const shot=project.scenes.find(s=>s.id===id)!;assert.ok(shot.elements.length<=100);assert.ok(shot.elements.some(e=>e.id.endsWith('scanDot')&&e.motionPath?.repeat==='loop'));
  assert.equal(shot.elements.filter(e=>/speed[0-3]$/.test(e.id)).length,4);
 }
 const counter=scene.elements.find(e=>e.id.endsWith('targetCounterAfter'))!;assert.equal(counter.at,2.4);assert.equal(counter.text,'TARGETS  4 / 6');
 assert.equal(scene.elements.find(e=>e.id.endsWith('weaponState3'))!.at,2.4);
 assert.equal(scene.elements.find(e=>e.id.endsWith('fireStatus'))!.until,2.4);
 assert.equal(scene.elements.find(e=>e.id.endsWith('charge0'))!.until,2);
 assert.equal(scene.elements.find(e=>e.id.endsWith('recharge0'))!.at,2.4);
 assert.ok(scene.elements.find(e=>e.id.endsWith('recharge4'))!.at>2.8);
});

test('the film ends with the closed gate and the fighter stays hidden at the exact timeline endpoint',()=>{
 const scene=project.scenes.at(-1)!,shot=scene.stage3d!,actor=shot.actors[0],model=project.characters[actor.character].model!;
 assert.ok(Math.abs(scene.duration-2.6)<1e-8);
 for(const time of [2.48,scene.duration-.001,scene.duration,scene.duration+.01]){
  const values=modelPose3D(model,actor.joints,actor.motions,time);
  for(const p of model.parts)for(const j of p.joints.filter(j=>j.id.startsWith('exit')))assert.equal(values.get(j.id),0);
 }
 const end=modelPose3D(project.stages.sector.model!,shot.stageJoints!,shot.stageMotions!,scene.duration);
 assert.equal(end.get('escapeAperture0x'),0);assert.equal(project.scenes.reduce((n,s)=>n+s.duration,0),28.6);
});

test('arrival aperture opens from a vertical seam before the fighter actually crosses its plane',()=>{
 const shot=project.scenes[0].stage3d!,actor=shot.actors[0],model=project.characters[actor.character].model!,path=project.stages.sector.paths!['arrival-hook'];
 assert.equal(pose(0).get('arrival0x'),0);
 assert.ok(pose(.12).get('arrival0y')!>pose(.12).get('arrival0x')!*5,'opening begins as a tall narrow seam');
 assert.equal(pose(.9).get('arrival0x'),1);assert.equal(pose(.9).get('arrival0y'),1);
 assert.equal(modelPose3D(model,actor.joints,actor.motions,.8).get('arrivehull'),0);
 assert.equal(modelPose3D(model,actor.joints,actor.motions,.9).get('arrivehull'),1);
 const before=samplePath3D(path,.9/3).position,after=samplePath3D(path,2.35/3).position;
 assert.ok(before.z+2.7<-13,'even the nose is behind the opaque vortex when enabled');
 assert.ok(after.z-2.7>-13,'the tail clears the gate before it contracts');
 assert.equal(pose(2.98).get('arrival0x'),0);
});


test('flight paths round manoeuvres, keep moving nose-first and meet without orientation snaps',()=>{
 const paths=project.stages.sector.paths!;
 for(const [index,scene] of project.scenes.entries()){
  const path=paths[scene.id],oriented=scene.stage3d!.actors[0].path!.orient,steps=Math.ceil(scene.duration*60);
  for(let i=1;i<=steps;i++){
   const a=samplePath3D(path,(i-1)/steps),b=samplePath3D(path,i/steps),travel=sub(b.position,a.position);
   assert.ok(Math.hypot(travel.x,travel.y,travel.z)>.001,scene.id+' must translate, not rotate in place');
   assert.ok(dot(norm(travel),a.forward)>.99,scene.id+' nose follows its curved trajectory');
   const limit=Math.cos((oriented?5:10)*Math.PI/180);
   assert.ok(dot(a.forward,b.forward)>limit,scene.id+' heading changes gradually at 60 fps');
   assert.ok(dot(a.up,b.up)>limit,scene.id+' banks gradually instead of spinning');
  }
  if(index){
   const a=samplePath3D(paths[project.scenes[index-1].id],1),b=samplePath3D(path,0),gap=sub(a.position,b.position);
   assert.ok(Math.hypot(gap.x,gap.y,gap.z)<1e-6,'positions join at '+scene.id);
   assert.ok(dot(a.forward,b.forward)>Math.cos(6*Math.PI/180),'tangents join at '+scene.id);
  }
 }
});


test('torpedoes cold-launch through sliding bay doors before their detailed cyan engines ignite',()=>{
 const fighter=project.characters.needlefin.model!;
 assert.ok(!fighter.parts.some(p=>p.id==='launchHatch'));
 for(const id of ['doorLeft','doorRight'])assert.equal(fighter.parts.flatMap(p=>p.joints).find(j=>j.id===id)!.motion,'translation');
 for(const [sceneId,id,release,impact] of [['torpedo-third-target','torpedo3',.7,2.2],['fifth-target-fleet-arrival','torpedo5',.4,1.35]] as const){
  const shot=project.scenes.find(s=>s.id===sceneId)!.stage3d!,hero=shot.actors[0],actor=shot.actors.find(a=>a.id===id)!,model=project.characters[actor.character].model!;
  const torpedo=(time:number)=>modelPose3D(model,actor.joints,actor.motions,time);
  const closed=modelPose3D(fighter,hero.joints,hero.motions,release-.3),open=modelPose3D(fighter,hero.joints,hero.motions,release);
  assert.equal(closed.get('doorLeft'),0);assert.equal(open.get('doorLeft'),-.65);assert.equal(open.get('doorRight'),.65);
  assert.ok(model.parts.some(p=>p.id==='sensor'));assert.equal(model.parts.filter(p=>p.id.startsWith('fin')).length,4);
  assert.equal(torpedo(release-.01).get('visiblebody'),0);
  assert.equal(torpedo(release+.01).get('visiblebody'),1);assert.equal(torpedo(release+.3).get('visibleengine'),0);
  assert.ok(torpedo(release+.42).get('visibleengine')!>.99);assert.ok(torpedo(release+.42).get('visibletrail')!>.99);
  const early=torpedo(release+.01),late=torpedo(release+.3);
  const earlyPosition={x:early.get('movex')!,y:early.get('movey')!,z:early.get('movez')!},latePosition={x:late.get('movex')!,y:late.get('movey')!,z:late.get('movez')!};
  const frame=actor3DFrame(hero,release,shot.actors,project.stages.sector.paths);
  assert.ok(dot(sub(latePosition,earlyPosition),frame.up)<-.8,'torpedo drops clear before ignition');
  assert.equal(torpedo(impact).get('visiblebody'),0);assert.equal(torpedo(impact+.01).get('visibletrail'),0);
  assert.deepEqual(torpedo(release+.01),early,'reverse seeking restores the launch deterministically');
 }
});


test('discreet twin laser ports are present on all exterior variants and emit from the actual muzzle',()=>{
 for(const name of ['needlefin','arriving','escaping']){
  const parts=project.characters[name].model!.parts;
  for(const side of [-1,1]){
   const muzzle=parts.find(p=>p.id==='laserMuzzle'+side)!;
   assert.equal(muzzle.shape,'cylinder');assert.ok(muzzle.size.x<.2&&muzzle.size.y<.06);
   assert.ok(parts.some(p=>p.id==='laserBore'+side));assert.ok(parts.some(p=>p.id==='laserLens'+side));
  }
 }
 for(const [id,time,side] of [['laser1',6.95,-1],['laser2',8.6,1],['laser4',16,-1],['laser6',23.8,1]] as const){
  let start=0;const scene=project.scenes.find(s=>{if(time<start+s.duration)return true;start+=s.duration;return false;})!;
  const frame=samplePath3D(project.stages.sector.paths![scene.id],(time-start)/scene.duration),expected=add(frame.position,localVector3D(frame,{x:side*.29,y:-.13,z:2.789})),values=pose(time);
  for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(values.get(id+'move'+axis)!-expected[axis])<1e-7,id+' starts at its nose port');
 }
});
