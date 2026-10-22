import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {inflationExample,inflationDuration,inflationTimelineSeconds,inflationHeight,inflationColumns} from '../src/lib/inflation-example.ts';
import {parseProject,validateProject,projectJsonBytes} from '../src/lib/model.ts';
import {modelPose3D} from '../src/lib/model3d.ts';import {parseStage3D} from '../src/lib/stage3d.ts';
import {DEFAULT_PROJECT_URL,resolveStartupProject} from '../src/lib/startup-project.ts';
const project=()=>validateProject(inflationExample);
test('default is a one-second title card, short crossfade and exactly three-second text-free material simulation',async()=>{
 const p=project(),native=parseProject(readFileSync(new URL('../public'+DEFAULT_PROJECT_URL,import.meta.url),'utf8'));
 assert.equal(p.format,'portrait');assert.equal(p.scenes.length,2);assert.equal(p.scenes[0].duration,1);assert.equal(p.scenes[1].transition,'crossfade');assert.equal(p.scenes[1].transitionDuration,.3);assert.equal(p.scenes[1].duration-.3,inflationTimelineSeconds);assert.equal(inflationTimelineSeconds,3);assert.equal(p.scenes.reduce((n,s)=>n+s.duration,0),inflationDuration);assert.equal(inflationDuration,4.3);
 assert.ok(p.scenes.every(s=>s.elements.length===0));assert.equal(p.music,null);assert.equal(p.scenes[1].narration?.asset,'whoosh');assert.equal(p.scenes[1].narration?.at,.3);assert.equal(p.audios.whoosh.duration,3);
 assert.deepEqual({...native,thumbnail:null,assets:{...native.assets,cover:p.assets.cover}},{...p,thumbnail:null,assets:{...p.assets}});assert.equal(native.thumbnail!.data,native.assets.cover.data);assert.equal(native.thumbnail!.data,'data:image/jpeg;base64,'+readFileSync(new URL('../public/examples/inflation-cover-en.jpg',import.meta.url)).toString('base64'));
 assert.ok(projectJsonBytes(native)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(native)),native);assert.equal((await resolveStartupProject(null,async()=>native)).project.title,p.title);assert.ok(p.description.includes('not historical inflation data'));
 const wav=Buffer.from(p.audios.whoosh.data.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),22050);assert.equal(wav.readUInt32LE(40),22050*3*2);assert.ok([...wav.subarray(20000,22000)].some(x=>x>150));
});
test('material areas flow continuously in opposite directions, stay anchored and hold their final state without resetting',()=>{
 const p=project(),scene=p.scenes[1];
 for(const actor of scene.stage3d!.actors){const model=p.characters[actor.character].model!,money=actor.id==='money';assert.equal(model.animations.flow.tracks.length,60);
 for(let i=0;i<inflationColumns;i++){let previous=inflationHeight(money,i/(inflationColumns-1),0);for(const t of [0,.15,.3,.31,.6,1,1.8,2.7,3.299,3.3,5]){const pose=modelPose3D(model,actor.joints,actor.motions,t),h=pose.get('c'+i+'Height')!,initial=inflationHeight(money,i/(inflationColumns-1),0);assert.ok(money?h>=previous-1e-9:h<=previous+1e-9);assert.ok(Math.abs(pose.get('c'+i+'Lift')!-(h-initial)/2)<1e-8);assert.ok(Math.abs(pose.get('c'+i+'Top')!-(h-initial)/2)<1e-8);previous=h;}assert.equal(previous,inflationHeight(money,i/(inflationColumns-1),1));}
 assert.deepEqual([...modelPose3D(model,actor.joints,actor.motions,3.3)],[...modelPose3D(model,actor.joints,actor.motions,10)]);
 }
 const values=Array.from({length:inflationColumns},(_,i)=>inflationHeight(true,i/(inflationColumns-1),1));assert.ok(values.slice(1,-1).some((n,i)=>Math.abs(n-(values[i]+values[i+2])/2)>.005));
});
test('glass plinth, polished areas and extruded title are embedded declarative geometry',()=>{
 const p=project(),parts=p.stages.chart.model!.parts;assert.equal(parts.find(x=>x.id==='plinth')!.finish,'glass');assert.equal(parts.filter(x=>x.id.startsWith('headline')).length,30);assert.equal(parts.filter(x=>x.id.startsWith('subtitle')).length,53);assert.ok(parts.some(x=>x.id==='glassGrid0'));assert.ok(parts.every(x=>!x.id.startsWith('headline')||x.finish==='polished'));assert.ok(p.characters.chocolate.model!.parts.some(x=>x.finish==='polished'));assert.ok(p.characters.money.model!.parts.some(x=>x.finish==='polished'));
});
test('transparent 3D background is strictly optional, bounded and round-trips without changing opaque stages',()=>{
 const stage={name:'Layer',model:{parts:[{id:'box'}]}};assert.ok(!Object.hasOwn(parseStage3D(stage),'transparentBackground'));assert.ok(!Object.hasOwn(parseStage3D({...stage,transparentBackground:false}),'transparentBackground'));
 const transparent=parseStage3D({...stage,transparentBackground:true});assert.equal(transparent.transparentBackground,true);assert.deepEqual(parseStage3D(JSON.parse(JSON.stringify(transparent))),transparent);for(const value of ['true',1,null])assert.throws(()=>parseStage3D({...stage,transparentBackground:value}),/expected boolean/);
});
