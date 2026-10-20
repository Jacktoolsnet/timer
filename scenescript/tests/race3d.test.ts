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
 assert.ok(p.music?.enabled);assert.ok(p.music.notes.length>200);assert.ok(p.stages.track.model!.animations.finishWave);assert.ok(p.firstComment.includes('Team'));assert.ok(p.hashtags.includes('#Monstertruck'));
});
test('procedural effects are deterministic, finite mono PCM, correctly timed and self-contained',()=>{
 const a=raceEffectsWav(),b=raceEffectsWav();assert.deepEqual(a,b);const v=new DataView(a.buffer);assert.equal(new TextDecoder().decode(a.slice(0,4)),'RIFF');assert.equal(v.getUint32(24,true),12000);assert.equal(v.getUint16(22,true),1);close(v.getUint32(40,true)/24000,61.5);
 const energy=(time:number)=>{let sum=0;for(let i=0;i<600;i++){const sample=v.getInt16(44+(Math.floor(time*12000)+i)*2,true);sum+=sample*sample;}return sum;};assert.equal(energy(1),0);assert.ok(energy(4.04)>0);assert.ok(energy(8)>0);assert.ok(energy(58)>0);
});
test('shipped default includes cover, sound, four templates and complete publication metadata within recovery budget',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),'utf8'));assert.equal(p.title,race3DExample.title);assert.match(p.thumbnail!.data,/^data:image\/png;base64,/);assert.match(p.audios.racefx.data,/^data:audio\/wav;base64,/);close(p.audios.racefx.duration,raceDuration3D);assert.equal(p.narration!.asset,'racefx');assert.equal(p.groups3d.audience.characters.length,4);assert.ok(projectJsonBytes(p)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(p)),p);
});
test('startup prioritizes saved work, handles corrupt storage and failed default loads without losing editing',async()=>{
 const p=demoProject();p.title='My saved work';let calls=0;const load=async()=>{calls++;return validateProject(race3DExample);};const recovered=await resolveStartupProject(JSON.stringify(p),load);assert.equal(recovered.project.title,p.title);assert.ok(recovered.recovered);assert.equal(calls,0);
 const fresh=await resolveStartupProject(null,load);assert.equal(fresh.project.title,race3DExample.title);assert.equal(calls,1);assert.equal(fresh.error,false);
 const corrupt=await resolveStartupProject('{invalid',load);assert.ok(corrupt.error);assert.equal(corrupt.project.title,race3DExample.title);
 const failed=await resolveStartupProject(null,async()=>{throw Error('offline');});assert.ok(failed.error);assert.equal(failed.project.title,demoProject().title);
});
