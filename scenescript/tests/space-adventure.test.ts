import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProject,validateProject} from '../src/lib/model.ts';
import {canApproveStoryboard} from '../src/lib/storyboard.ts';
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
 assert.ok(pose(27).get('escapeAperture0x')!>.9);assert.ok(Math.abs(pose(28.4).get('escapeAperture0x')!)<1e-8);
 assert.equal(pose(28.4).get('volleyVisible0x'),0);assert.equal(pose(28.7).get('volleyVisible0x'),1);
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
 assert.ok(project.description.includes('#SciFi'));assert.equal(Object.keys(project.assets).length,1);
});
