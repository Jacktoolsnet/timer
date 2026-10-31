import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {animationState,parseProject,projectJsonBytes} from '../src/lib/model.ts';import {DEFAULT_PROJECT_URL} from '../src/lib/startup-project.ts';import {poseModel2D,poseClipsModel2D} from '../src/lib/model2d.ts';import {actorFrame2D} from '../src/lib/motion2d.ts';import {narrationClips} from '../src/lib/audio.ts';import {reviewProduction} from '../src/lib/production-review.ts';import {objectSoundScore2D} from '../src/lib/sound2d.ts';
const load=()=>parseProject(readFileSync('public'+DEFAULT_PROJECT_URL,'utf8'));
test('new independent default is a portable 14.8-second portrait Halloween film with a German board and English text',()=>{
 assert.equal(DEFAULT_PROJECT_URL,'/examples/halloween-night-flight.scenescript.json');const p=load(),b=p.storyboard!;assert.equal(p.title,'Halloween After Dark');assert.equal(p.format,'portrait');assert.equal(b.format,'portrait');assert.equal(b.language,'English');assert.equal(b.duration,14.8);assert.equal(p.scenes.reduce((t,s)=>t+s.duration,0),14.8);assert.equal(p.scenes.length,4);assert.deepEqual(b.shots.map(s=>s.id),p.scenes.map(s=>s.id));assert.equal(b.approved,false);assert.match(b.story,/Arbeitsbeschreibungen bleiben auf Deutsch/);assert.deepEqual(reviewProduction(p),[]);
 for(const[i,s]of p.scenes.entries()){const stage=p.stages2d[s.stage2d!.stage].model!;assert.equal(stage.width,540);assert.equal(stage.height,960);assert.equal(stage.originX,0);assert.equal(stage.originY,0);assert.equal(b.shots[i].duration,s.duration);assert.deepEqual(b.shots[i].characters,[...new Set(s.stage2d!.actors.map(a=>a.object))]);}
 for(const s of [...b.characters,...b.settings]){assert.equal(s.status,'draft');assert.ok(s.resource2d);assert.equal(s.model2d,undefined);assert.ok(s.image&&b.images[s.image].data);}
 assert.ok(projectJsonBytes(p)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.ok(p.publishing!.youtube.tags&&!p.publishing!.youtube.tags.includes('#'));assert.ok(p.publishing!.tiktok.cover?.data);assert.ok(p.thumbnail?.data);assert.equal(parseProject(readFileSync('public/examples/halloween-heart.scenescript.json','utf8')).title,'Halloween mit Herz');
});
test('independent wing/leg/light tracks and real flight paths exist; spider thread matches its descending body',()=>{
 const p=load(),bat=p.objects2d.bat.model!,spider=p.objects2d.spider.model!,pumpkin=p.objects2d.pumpkin.model!,stage=p.stages2d.forest.model!;
 assert.equal(bat.animations.idle.duration,.25);assert.equal(spider.animations.idle.tracks.length,8);assert.notEqual(poseModel2D(bat,'idle',0).get('left-wing')!.scaleY,poseModel2D(bat,'idle',.12).get('left-wing')!.scaleY);assert.notEqual(poseModel2D(pumpkin,'idle',.3).get('fire')!.opacity,poseModel2D(pumpkin,'idle',.55).get('fire')!.opacity);assert.ok(stage.animations.lower.tracks.length>stage.animations.idle.tracks.length);assert.equal(poseModel2D(stage,'idle',2).get('thread')!.opacity,0);
 const scene=p.scenes[1],sp=scene.stage2d!.actors.find(a=>a.object==='spider')!;assert.equal(scene.stage2d!.stageClip,'lower');for(const t of [0,.4,1.7,2.3,3.1,4.5,5])assert.ok(Math.abs(poseModel2D(stage,'lower',t).get('thread')!.scaleY*530-actorFrame2D(sp,t).y)<1e-8);
 const witch=scene.stage2d!.actors.find(a=>a.object==='witch')!;assert.ok(actorFrame2D(witch,0).x<0);assert.equal(actorFrame2D(witch,5).x,270);assert.equal(actorFrame2D(witch,5).y,154);
});
test('final English greeting is editable, large, safe and held for one second after the children arrive',()=>{
 const p=load(),s=p.scenes.at(-1)!,texts=s.elements.filter(e=>e.type==='text');assert.deepEqual(texts.map(e=>e.text),['Happy Halloween!']);assert.equal(s.duration,1);for(const e of texts){assert.ok(e.fontSize>=50);assert.ok(e.x>=8&&e.x+e.width<=88);assert.ok(e.y>=10&&e.y+e.height<=50);assert.equal(e.until,null);}
});

test('firelight is irregular and stronger without visible flames; aurora has independent moving bands and folds',()=>{
 const p=load(),pumpkin=p.objects2d.pumpkin.model!,stage=p.stages2d.forest.model!;
 assert.ok(!pumpkin.parts.some(p=>p.id.includes('flame')));assert.ok(pumpkin.parts.some(p=>p.id==='outer-firelight'));
 const fire=pumpkin.animations.idle.tracks.find(t=>t.part==='fire')!;assert.ok(fire.keys.length>=12);assert.ok(Math.max(...fire.keys.map(k=>k.value))>=.7);assert.ok(Math.min(...fire.keys.map(k=>k.value))>=.2);
 assert.equal(stage.parts.filter(p=>p.id.startsWith('aurora-ribbon-')).length,4);assert.equal(stage.parts.filter(p=>p.id.startsWith('aurora-fold-')).length,6);
 for(const clip of ['idle','lower']){const a=poseModel2D(stage,clip,.1),b=poseModel2D(stage,clip,3.7);for(let i=0;i<4;i++){const id='aurora-ribbon-'+i;assert.notEqual(a.get(id)!.opacity,b.get(id)!.opacity);assert.notEqual(a.get(id)!.scaleY,b.get(id)!.scaleY);}}
});

test('bat approaches the lens, reveals textured face, keeps flapping and flies fully out before the children',()=>{
 const p=load(),bat=p.objects2d.bat.model!,scene=p.scenes[1],a=scene.stage2d!.actors.find(a=>a.object==='bat')!;
 assert.equal(a.layer,'foreground');assert.ok(a.actions.some(a=>a.type==='play'&&a.clip==='approach'&&a.duration===5));assert.equal(bat.animations.approach.loop,false);
 const idle=poseModel2D(bat,'idle',3.6);assert.equal(idle.get('flight')!.scaleX,1);assert.equal(idle.get('close-face')!.opacity,0);
 let previous=0;for(const t of [0,1.8,2.5,3.1,3.6,4.05]){const pose=poseModel2D(bat,'approach',t);assert.ok(pose.get('flight')!.scaleX>=previous);previous=pose.get('flight')!.scaleX;assert.equal(pose.get('flight')!.scaleX,pose.get('flight')!.scaleY);}assert.equal(previous,10);
 const near=poseClipsModel2D(bat,[{clip:'idle',time:3.6},{clip:'approach',time:3.6}]);assert.equal(near.get('close-face')!.opacity,1);assert.equal(near.get('body')!.opacity,0);assert.ok(near.get('left-wing')!.scaleY<1);assert.ok(bat.parts.some(p=>p.id==='close-face-art'&&p.shape==='sprite'));assert.ok(bat.images!.art.data!.startsWith('data:image/webp;base64,'));
 assert.ok(Math.abs(actorFrame2D(a,4.05).x-270)<1);assert.ok(actorFrame2D(a,5).y+90*a.scale*10<0);assert.equal(p.scenes[0].stage2d!.actors.find(a=>a.object==='bat')!.actions.some(a=>a.clip==='approach'),false);assert.match(p.storyboard!.shots[1].action,/auf die Kamera|zur Kamera/);
});

test('Halloween greeting stays editable, orange and glowing in the same font as the opening',()=>{
 const p=load(),h=p.scenes.at(-1)!.elements.find(e=>e.id==='happy')!;assert.equal(h.type,'text');assert.equal(h.font,'Creepster');assert.equal(h.color,'#ffa947');assert.equal(h.textEffects.glow.enabled,true);assert.equal(h.textEffects.outline.enabled,true);assert.match(p.storyboard!.shots.at(-1)!.action,/Typografie:/);
});

test('aurora curtains ripple in phased waves, loop seamlessly and conservatively leave the moon unobscured',()=>{
 const p=load(),m=p.stages2d.forest.model!,aurora=m.parts.filter(p=>p.id.startsWith('aurora-'));
 assert.equal(aurora.filter(p=>p.id.startsWith('aurora-pleat-')).length,24);
 for(const clip of ['idle','lower'])for(const part of aurora){
  const tracks=m.animations[clip].tracks.filter(t=>t.part===part.id),values=(property:string,base:number)=>tracks.find(t=>t.property===property)?.keys.map(k=>k.value)??[base];
  const ys=part.shape==='path'?part.path.flatMap(c=>c.values.filter((_,i)=>i%2===1)):[0,part.height],localMin=Math.min(...ys),minY=Math.min(...values('y',part.y)),maxScale=Math.max(...values('scaleY',part.scaleY));
  assert.equal(part.parent,null);assert.equal(part.pivotY,0);assert.equal(part.rotation,0);assert.ok(!tracks.some(t=>t.property==='rotation'));
  assert.ok(minY+Math.min(0,localMin*maxScale)-3*(part.blur??0)>=285,part.id+' must stay below the protected moon area, including blur');
 }
 const start=poseModel2D(m,'idle',0),end=poseModel2D(m,'idle',8),a=poseModel2D(m,'idle',.5),b=poseModel2D(m,'idle',3.5);
 for(const part of aurora)for(const key of ['x','y','scaleY','opacity'] as const)assert.ok(Math.abs(start.get(part.id)![key]-end.get(part.id)![key])<1e-8);
 for(let i=0;i<24;i++){const id='aurora-pleat-'+i;assert.notEqual(a.get(id)!.scaleY,b.get(id)!.scaleY);assert.ok(m.animations.idle.tracks.filter(t=>t.part===id).length===4);}
 assert.notEqual(a.get('aurora-pleat-0')!.scaleY,a.get('aurora-pleat-1')!.scaleY);
});

test('witch enters from the left, faces her flight direction and recedes proportionally to the moon',()=>{
 const p=load(),scene=p.scenes[1],witch=scene.stage2d!.actors.find(a=>a.object==='witch')!,m=p.objects2d.witch.model!,clip=m.animations['moon-flight'];assert.equal(clip.loop,false);assert.ok(witch.actions.some(a=>a.type==='play'&&a.clip==='moon-flight'&&a.at===0&&a.duration===scene.duration));
 assert.ok(actorFrame2D(witch,0).x+m.width*witch.scale/2<0);assert.ok(actorFrame2D(witch,1.35).x>0);assert.equal(actorFrame2D(witch,4.7).x,270);assert.equal(actorFrame2D(witch,4.7).y,154);
 let previous=Infinity;for(const t of [0,1.1,1.35,2.4,3.35,4.35,4.8,5]){const pose=poseModel2D(m,'moon-flight',t).get('moon-flight-root')!;assert.ok(pose.scaleX<0);assert.equal(-pose.scaleX,pose.scaleY);assert.ok(pose.scaleY<=previous);previous=pose.scaleY;}assert.ok(previous<.01);assert.equal(poseModel2D(m,'moon-flight',5).get('moon-flight-root')!.opacity,0);
 for(const part of m.parts.filter(p=>p.id==='rider'||p.id.startsWith('wake-')))assert.equal(part.parent,'moon-flight-root');
 const base=poseModel2D(m,'idle',1);assert.equal(base.get('moon-flight-root')!.scaleX,1);assert.equal(base.get('moon-flight-root')!.opacity,1);assert.match(p.storyboard!.shots[1].action,/von links ins Bild/);assert.match(p.storyboard!.shots[1].action,/proportional immer kleiner/);
});



test('large textured spider has eight independently phased legs and a top silk attachment',()=>{
 const p=load(),m=p.objects2d.spider.model!,a=p.scenes[1].stage2d!.actors.find(a=>a.object==='spider')!;
 assert.equal(m.width,220);assert.equal(m.height,180);assert.equal(m.originY,8);
 assert.deepEqual(Object.keys(m.images!).sort(),['body','leg']);
 assert.equal(m.parts.filter(p=>p.shape==='sprite'&&p.image==='leg').length,8);
 assert.equal(m.parts.filter(p=>p.shape==='sprite'&&p.image==='body').length,1);
 const phases=new Set(m.animations.idle.tracks.map(t=>Math.sign(t.keys[1].value-t.keys[0].value)));assert.equal(phases.size,2);
 for(const image of Object.values(m.images!))assert.match(image.data??"",/^data:image\/webp;base64,/);
 // Origin at (110,8) is at the top of the abdomen (110,7), not at the face.
 const root=m.parts.find(p=>p.id==='spider')!,body=m.parts.find(p=>p.id==='body-art')!;
 assert.ok(Math.abs(root.y+body.y-m.originY)<2);
 assert.equal(a.x,405);assert.ok(a.scale*m.width>200);
 assert.ok(actorFrame2D(a,0).y+a.scale*m.height<20);
 assert.equal(actorFrame2D(a,5).y,actorFrame2D(a,0).y);
 assert.match(p.storyboard!.characters.find(c=>c.resource2d==='spider')!.description,/Felltexturen/);
});


test('opening caption uses the same Halloween typeface as the final greeting',()=>{
 const p=load(),opening=p.scenes[0].elements.find(e=>e.id==='opening')!,happy=p.scenes[3].elements.find(e=>e.id==='happy')!;
 assert.equal(opening.font,'Creepster');assert.equal(opening.font,happy.font);
});

test('three cheerful costumed children enter from both sides and meet without a scene-boundary jump',()=>{
 const p=load(),arrival=p.scenes[2],end=p.scenes[3],ids=['child-skeleton','child-witch','child-vampire'];
 assert.equal(arrival.id,'meeting');assert.equal(Object.keys(p.objects2d).length,7);
 for(const[id,i]of ids.map((id,i)=>[id,i] as const)){
  const a=arrival.stage2d!.actors.find(a=>a.object===id)!,b=end.stage2d!.actors.find(a=>a.object===id)!,m=p.objects2d[id].model!;
  assert.ok(i===0?actorFrame2D(a,0).x+m.width/2<0:actorFrame2D(a,0).x-m.width/2>540);
  assert.equal(actorFrame2D(a,5).x,b.x);assert.equal(actorFrame2D(a,5).y,b.y);assert.equal(b.x,[145,270,395][i]);assert.equal(b.y,568);
  assert.ok(a.actions.some(a=>a.type==='play'&&a.clip==='walk'));assert.equal(b.actions.length,0);
  assert.notEqual(poseModel2D(m,'walk',0).get('child')!.y,poseModel2D(m,'walk',.15).get('child')!.y);
  assert.match(m.images!.art.data??'',/^data:image\/webp;base64,/);
 }
 assert.equal(narrationClips(p).length,0);assert.deepEqual(Object.keys(p.audios),[]);assert.equal(p.storyboard!.production!.dialogue,false);
 assert.ok(p.music!.notes.some(n=>n.instrument==='spooky'&&n.at>13));assert.ok(!p.music!.instruments.some(i=>i.id==='bells'));
 assert.ok(objectSoundScore2D(p)!.notes.some(n=>n.at>=5&&n.at<10));
 const readable=JSON.stringify({board:p.storyboard,metadata:p.publishing,description:p.description,scenes:p.scenes,objects:Object.keys(p.objects2d),images:Object.keys(p.storyboard!.images)});
 assert.doesNotMatch(readable,/Santa|Christmas|Weihnacht|Ho! Ho!/i);
});


test('one bat perches, takes off visibly and continues seamlessly while only title and web fade',()=>{
 const p=load(),scene=p.scenes[0],a=scene.stage2d!.actors.find(a=>a.object==='bat')!,m=p.objects2d.bat.model!,stage=p.stages2d.forest.model!,title=scene.elements.find(e=>e.id==='opening')!;
 assert.equal(scene.stage2d!.stageClip,'opening');assert.equal(a.layer,'foreground');assert.ok(a.actions.some(a=>a.type==='play'&&a.clip==='perch'));
 for(const t of [2.1,3,4.35]){const frame=actorFrame2D(a,t);assert.equal(frame.x,399);assert.equal(frame.y,128);}
 const fly=poseModel2D(m,'perch',1),land=poseModel2D(m,'perch',2.1);assert.equal(fly.get('left-wing')!.scaleX,1);assert.equal(land.get('left-wing')!.scaleX,.18);assert.equal(land.get('right-wing')!.scaleX,.18);
 for(const t of [2.1,3.5,4.35,4.4,4.475,4.55,4.6,4.9]){
  const expected=animationState(title,t,540,960,5).opacity;
  assert.equal(poseModel2D(m,'perch',t).get('flight')!.opacity,1);
  assert.ok(Math.abs(poseModel2D(stage,'opening',t).get('opening-web')!.opacity-expected)<1e-8);
 }
 assert.equal(poseModel2D(stage,'idle',2).get('opening-web')!.opacity,0);assert.equal(poseModel2D(stage,'lower',2).get('opening-web')!.opacity,0);
 assert.equal(poseModel2D(m,'idle',4.8).get('flight')!.opacity,1);assert.equal(poseModel2D(m,'approach',4.8).get('flight')!.opacity,1);
 assert.equal(stage.parts.filter(p=>p.id.startsWith('web-ray-')).length,6);assert.equal(stage.parts.filter(p=>p.id.startsWith('web-ring-')).length,4);
 assert.match(p.storyboard!.shots[0].action,/landet|Spinnennetz/);
});

test('bat identity, position, scale and every model part remain continuous across the first scene boundary',()=>{
 const p=load(),a=p.scenes[0].stage2d!.actors.find(a=>a.object==='bat')!,b=p.scenes[1].stage2d!.actors.find(a=>a.object==='bat')!,m=p.objects2d.bat.model!;
 assert.equal(a.id,b.id);assert.equal(a.object,b.object);assert.equal(a.scale,b.scale);assert.equal(a.rotation,b.rotation);assert.equal(a.layer,b.layer);
 assert.equal(actorFrame2D(a,5).x,actorFrame2D(b,0).x);assert.equal(actorFrame2D(a,5).y,actorFrame2D(b,0).y);assert.equal(actorFrame2D(a,5).opacity,1);
 const before=poseClipsModel2D(m,[{clip:'idle',time:5},{clip:'perch',time:5}]),after=poseClipsModel2D(m,[{clip:'idle',time:0},{clip:'approach',time:0}]);
 assert.deepEqual(before,after);for(const scene of p.scenes)assert.ok(scene.stage2d!.actors.filter(a=>a.object==='bat').length<=1);
});
test('Happy Halloween stays fully opaque through the meeting/greeting cut and to the final frame',()=>{
 const p=load(),a=p.scenes[2],b=p.scenes[3],out=a.elements.find(e=>e.id==='meeting-happy')!,incoming=b.elements.find(e=>e.id==='happy')!;
 for(const t of [a.duration-.3,a.duration-.1,a.duration-.000001,a.duration]){const state=animationState(out,t,540,960,a.duration);assert.equal(state.visible,true);assert.equal(state.opacity,1);}
 for(const t of [0,.05,.15,.5,.9,.999999,1]){const state=animationState(incoming,t,540,960,b.duration);assert.equal(state.visible,true);assert.equal(state.opacity,1);}
 for(const key of ['text','font','fontSize','color','x','y','width','height','textEffects'] as const)assert.deepEqual(out[key],incoming[key]);
});

test('film ends exactly one second after the last child finishes entering, with music inside that duration',()=>{
 const p=load(),meeting=p.scenes[2],greeting=p.scenes[3],children=meeting.stage2d!.actors.filter(a=>a.object.startsWith('child-'));
 const arrival=Math.max(...children.flatMap(a=>a.actions.filter(a=>a.type==='move').map(a=>a.at+a.duration)));
 assert.ok(Math.abs(meeting.duration+greeting.duration-arrival-1)<1e-8);assert.equal(greeting.duration,1);
 const duration=p.scenes.reduce((sum,s)=>sum+s.duration,0);assert.equal(duration,14.8);assert.equal(p.storyboard!.duration,duration);
 for(const note of p.music!.notes)assert.ok(note.at+note.duration<=duration+1e-8);
});
