import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseProject,animationState,projectJsonBytes} from '../src/lib/model.ts';
import {cameraFrame2D} from '../src/lib/motion2d.ts';import {poseModel2D} from '../src/lib/model2d.ts';import {reviewProduction} from '../src/lib/production-review.ts';import {objectSoundScore2D} from '../src/lib/sound2d.ts';
const load=()=>parseProject(readFileSync('public/examples/halloween-heart.scenescript.json','utf8'));
test('directed Halloween starter is a portable 28-second English film with German storyboard, imported resources and no voice',()=>{
 const p=load(),b=p.storyboard!;assert.equal(p.scenes.length,6);assert.equal(p.scenes.reduce((n,s)=>n+s.duration,0),28);assert.equal(b.duration,28);assert.equal(b.language,'English');assert.equal(b.production!.dialogue,false);assert.equal(p.narration,null);assert.equal(Object.keys(p.audios).length,0);assert.ok(p.music?.enabled);assert.equal(p.format,'portrait');assert.equal(b.approved,false);assert.ok(b.story.includes('Arbeitsbeschreibungen im Storyboard bleiben auf Deutsch'));
 for(const [i,shot]of b.shots.entries()){const s=p.scenes[i];assert.equal(shot.duration,s.duration);assert.equal(shot.status,'draft');assert.deepEqual(shot.characters,[...new Set(s.stage2d!.actors.map(a=>a.object))]);assert.deepEqual(shot.settings,[s.stage2d!.stage]);assert.ok(shot.action.includes('Verbindlicher englischer Bildschirmtext:'));}
 for(const subject of [...b.characters,...b.settings]){assert.equal(subject.status,'draft');assert.equal(subject.model2d,undefined);assert.equal(subject.resource2d,subject.id);assert.ok(subject.image&&b.images[subject.image].data);}
 assert.ok(projectJsonBytes(p)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.deepEqual(reviewProduction(p),[]);assert.ok(b.settings.every(s=>s.objects?.length===0));assert.ok(!b.look!.atmosphere.includes('Vektormodelle sind'));assert.ok(b.settings.every(s=>!s.design!.details.includes('Referenzbild enthält')));
});
test('all text exits before scene changes, image dissolves have no simultaneous old/new captions, closing frame reaches black',()=>{
 const p=load();for(const s of p.scenes){const texts=s.elements.filter(e=>e.type==='text');assert.ok(texts.length>=2);for(const e of texts){assert.equal(e.exitAnimation,'fade');assert.ok(e.until!==null&&e.until<=s.duration-.28);assert.equal(animationState(e,s.duration,1080,1920,s.duration).visible,false);assert.ok(e.x>=8&&e.x+e.width<=90);assert.ok(e.fontSize>=40);if(s.transition==='crossfade')assert.ok(e.at>=s.transitionDuration);}
  assert.ok(s.elements.filter(e=>e.type==='shape'&&e.id!=='closing-fade').every(e=>e.fillGradient&&e.width===100&&e.radius===0));
 }
 assert.deepEqual(p.scenes.filter(s=>s.transition==='crossfade').map(s=>s.id),['romance','greeting']);assert.ok(p.scenes[0].elements.some(e=>e.font==='Allura'&&e.text.includes('romantic side?')&&e.at<.5));
 const last=p.scenes.at(-1)!,black=last.elements.find(e=>e.id==='closing-fade')!;assert.equal(black.fillColor,'#000000');assert.equal(animationState(black,last.duration-.1,1080,1920,last.duration).opacity,1);
});
test('table shots preserve prop positions and camera endpoints; small ring reveals instead of teleporting or duplicating food',()=>{
 const p=load(),table=p.scenes.filter(s=>s.stage2d!.stage==='table');for(const [i,s]of table.entries()){
  assert.equal(s.stage2d!.actors.filter(a=>a.object==='bread').length,1);assert.equal(s.stage2d!.actors.filter(a=>a.object==='cup').length,2);assert.ok(s.stage2d!.actors.filter(a=>a.object==='ring').every(a=>a.scale<=.3));
  if(i){const previous=table[i-1],a=previous.stage2d!.camera.at(-1)!,b=s.stage2d!.camera[0];for(const key of ['x','y','zoom'] as const)assert.equal(a[key],b[key]);for(const actor of previous.stage2d!.actors){const next=s.stage2d!.actors.find(a=>a.id===actor.id);assert.ok(next);for(const key of ['x','y','scale','rotation'] as const)assert.equal(actor[key],next[key]);}}
 }
 const reveal=p.objects2d.ring.model!;assert.equal(poseModel2D(reveal,'reveal',.3).get('presentation')!.opacity,0);assert.equal(poseModel2D(reveal,'reveal',2).get('presentation')!.opacity,1);assert.ok(table[1].stage2d!.actors.some(a=>a.actions.some(action=>action.clip==='reveal')));assert.ok(cameraFrame2D(table[1].stage2d!.camera,5.2).zoom>=1.15);
 const sounds=objectSoundScore2D(p)!;assert.equal(sounds.notes.length,1);assert.ok(sounds.notes[0].at>8&&sounds.notes[0].at<9);
});
test('hands move independently into contact; cup steam and practical lights animate without pulsing illustration colors',()=>{
 const p=load(),hands=p.objects2d.hands.model!,start=poseModel2D(hands,'touch',0),end=poseModel2D(hands,'touch',3);assert.equal(hands.parts.filter(p=>p.shape==='sprite').length,2);assert.notEqual(start.get('left')!.x,end.get('left')!.x);assert.notEqual(start.get('right')!.x,end.get('right')!.x);assert.equal(end.get('left')!.x,0);assert.equal(end.get('right')!.x,0);assert.equal(hands.animations.touch.loop,false);
 const cup=p.objects2d.cup.model!;assert.ok(cup.parts.filter(p=>p.id.endsWith('-wisp')).length>=2);assert.ok(cup.animations.idle.tracks.some(t=>t.property==='y'));assert.ok(cup.animations.idle.tracks.every(t=>t.part!=='artwork'));
 for(const [id,stage]of Object.entries(p.stages2d)){assert.equal(stage.model!.parts.filter(p=>p.shape==='sprite').length,1);assert.ok(stage.model!.animations.idle.tracks.length>0);assert.equal(stage.model!.width,540);assert.equal(stage.model!.height,960);assert.ok(stage.model!.parts.find(p=>p.shape==='sprite')!.image);assert.ok(id==='cottage'||id==='table');}
 for(const obj of Object.values(p.objects2d))assert.ok(obj.model!.parts.some(p=>p.id.includes('contact')));
});
