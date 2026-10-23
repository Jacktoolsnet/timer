import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProject,validateProject} from '../src/lib/model.ts';
import {canApproveStoryboard} from '../src/lib/storyboard.ts';
import {cameraPose3D} from '../src/lib/camera3d.ts';
import {actor3DFrame} from '../src/lib/stage3d.ts';
import {samplePath3D} from '../src/lib/path3d.ts';
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
 assert.equal(project.format,'portrait');assert.equal(project.scenes.reduce((n,s)=>n+s.duration,0),30);
 assert.equal(project.scenes.length,9);assert.ok(project.scenes.every(s=>s.stage3d&&s.transition==='none'));
 assert.equal(project.scenes.find(s=>s.id==='last-target-under-threat')!.duration+project.scenes.find(s=>s.id==='mission-confirmed')!.duration,4);
});
test('six targets are destroyed separately, stay destroyed and support reverse seeking',()=>{
 const hits=[7.3,9,12.2,16.4,19.35,24.25];
 for(const [index,at]of hits.entries()){
  const id='relay'+(index+1);assert.equal(pose(at-.01).get(id+'corex'),1);assert.equal(pose(at+.01).get(id+'corex'),0);
  assert.ok(Math.abs(pose(at+1).get(id+'plate0x')!)<1e-8);
 }
 for(let i=1;i<=6;i++)assert.equal(pose(29).get('relay'+i+'corex'),0);
 const before=pose(6.9);pose(29.9);assert.deepEqual(pose(6.9),before);
 assert.ok(Math.abs(project.scenes.find(s=>s.id==='cockpit-fourth-target')!.elements.find(e=>e.id.endsWith('indicator3dark'))!.at-2.4)<1e-8);
});
test('fleet has one command vessel and four escorts; gates and final volley obey story timing',()=>{
 const parts=project.stages.sector.model!.parts;
 assert.equal(parts.filter(p=>/^fleet\d$/.test(p.id)).length,5);
 assert.equal(pose(19).get('fleet0armor0x'),0);assert.equal(pose(21.7).get('fleet0armor0x'),1);
 assert.equal(pose(3.2).get('arrival0x'),0);assert.ok(pose(1).get('arrival0x')!>.9);
 assert.ok(pose(27.5).get('escapeAperture0x')!>.9);assert.ok(Math.abs(pose(28.6).get('escapeAperture0x')!)<1e-8);
 assert.equal(pose(27.4).get('volleyVisible0x'),0);assert.equal(pose(28).get('volleyVisible0x'),1);
 const actor=project.scenes[0].stage3d!.actors[0],model=project.characters[actor.character].model!;
 assert.equal(modelPose3D(model,actor.joints,actor.motions,0).get('arrivehull'),0);
 assert.equal(modelPose3D(model,actor.joints,actor.motions,1).get('arrivehull'),1);
});
test('publication cover, 30-second audible PCM and scored music are embedded and self-contained',()=>{
 assert.equal(project.thumbnail!.data,project.storyboard!.images['sketch-arrival-hook'].data);
 const fx=project.audios.spacefx,wav=Buffer.from(fx.data.split(',')[1],'base64');
 assert.equal(fx.duration,30);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);
 assert.equal(wav.readUInt32LE(40)/2/24000,30);
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
 const route=paths['escape-payoff'];assert.ok(route.points.some(p=>p.x>5));assert.ok(route.points[0].z>route.points.at(-1)!.z+30);
 assert.ok(paths['laser-double-strike'].ups!.some(p=>p.y<-.5),'A barrel roll includes inverted frames');
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
 const ship=samplePath3D(stage.paths!['escape-payoff'],2.47/4);assert.ok(ship.position.z+2.6<24.12,'tail cleared entrance before concealment');
 assert.ok(20+pose(28.47).get('volleyTravel0z')!-2>24.12,'leading laser tip stays behind the ship until its tail clears');
 assert.ok(20+pose(28.5).get('volleyTravel0z')!>24,'first tracer centre has not reached the sealed entrance yet');
 assert.ok(samplePath3D(stage.paths!['escape-payoff'],.95).forward.z<-.99);
});

test('detailed cockpit has moving physical instruments and editable, mission-synchronized readouts',()=>{
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
