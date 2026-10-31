import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseProject,projectJsonBytes} from '../src/lib/model.ts';import {DEFAULT_PROJECT_URL} from '../src/lib/startup-project.ts';import {poseModel2D,poseClipsModel2D} from '../src/lib/model2d.ts';import {actorFrame2D} from '../src/lib/motion2d.ts';import {narrationClips} from '../src/lib/audio.ts';import {reviewProduction} from '../src/lib/production-review.ts';import {objectSoundScore2D} from '../src/lib/sound2d.ts';
const load=()=>parseProject(readFileSync('public'+DEFAULT_PROJECT_URL,'utf8'));
test('new independent default is a portable 22-second portrait Halloween/Christmas film with a German board and English text',()=>{
 assert.equal(DEFAULT_PROJECT_URL,'/examples/halloween-night-flight.scenescript.json');const p=load(),b=p.storyboard!;assert.equal(p.title,'Halloween After Dark');assert.equal(p.format,'portrait');assert.equal(b.format,'portrait');assert.equal(b.language,'English');assert.equal(b.duration,22);assert.equal(p.scenes.reduce((t,s)=>t+s.duration,0),22);assert.equal(p.scenes.length,4);assert.deepEqual(b.shots.map(s=>s.id),p.scenes.map(s=>s.id));assert.equal(b.approved,false);assert.match(b.story,/Arbeitsbeschreibungen bleiben auf Deutsch/);assert.deepEqual(reviewProduction(p),[]);
 for(const[i,s]of p.scenes.entries()){const stage=p.stages2d[s.stage2d!.stage].model!;assert.equal(stage.width,540);assert.equal(stage.height,960);assert.equal(stage.originX,0);assert.equal(stage.originY,0);assert.equal(b.shots[i].duration,s.duration);assert.deepEqual(b.shots[i].characters,[...new Set(s.stage2d!.actors.map(a=>a.object))]);}
 for(const s of [...b.characters,...b.settings]){assert.equal(s.status,'draft');assert.ok(s.resource2d);assert.equal(s.model2d,undefined);assert.ok(s.image&&b.images[s.image].data);}
 assert.ok(projectJsonBytes(p)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.ok(p.publishing!.youtube.tags&&!p.publishing!.youtube.tags.includes('#'));assert.ok(p.publishing!.tiktok.cover?.data);assert.ok(p.thumbnail?.data);assert.equal(parseProject(readFileSync('public/examples/halloween-heart.scenescript.json','utf8')).title,'Halloween mit Herz');
});
test('independent wing/leg/light tracks and real flight paths exist; spider thread matches its descending body',()=>{
 const p=load(),bat=p.objects2d.bat.model!,spider=p.objects2d.spider.model!,pumpkin=p.objects2d.pumpkin.model!,stage=p.stages2d.forest.model!;
 assert.equal(bat.animations.idle.duration,.25);assert.equal(spider.animations.idle.tracks.length,8);assert.notEqual(poseModel2D(bat,'idle',0).get('left-wing')!.scaleY,poseModel2D(bat,'idle',.12).get('left-wing')!.scaleY);assert.notEqual(poseModel2D(pumpkin,'idle',.3).get('fire')!.opacity,poseModel2D(pumpkin,'idle',.55).get('fire')!.opacity);assert.ok(stage.animations.lower.tracks.length>stage.animations.idle.tracks.length);assert.equal(poseModel2D(stage,'idle',2).get('thread')!.opacity,0);
 const scene=p.scenes[1],sp=scene.stage2d!.actors.find(a=>a.object==='spider')!;assert.equal(scene.stage2d!.stageClip,'lower');for(const t of [0,.4,1.7,2.3,3.1,4.5,5])assert.ok(Math.abs(poseModel2D(stage,'lower',t).get('thread')!.scaleY*530-actorFrame2D(sp,t).y)<1e-8);
 const witch=scene.stage2d!.actors.find(a=>a.object==='witch')!;assert.ok(actorFrame2D(witch,0).x<0);assert.equal(actorFrame2D(witch,5).x,270);assert.equal(actorFrame2D(witch,5).y,154);const startSanta=p.scenes[2].stage2d!.actors.find(a=>a.object==='santa')!,endSanta=p.scenes[3].stage2d!.actors.find(a=>a.object==='santa')!;const end=actorFrame2D(startSanta,5);assert.equal(end.x,endSanta.x);assert.equal(end.y,endSanta.y);assert.ok(actorFrame2D(endSanta,7).x<0);
});
test('Santa is genuinely embedded audible speech, ducked over native music and matched reusable effects',()=>{
 const p=load(),clips=narrationClips(p);assert.equal(clips.length,1);assert.equal(clips[0].settings.text,'Ho! Ho! Ho!');assert.equal(clips[0].at,10.85);assert.ok(clips[0].duration>1.5&&clips[0].duration<2.7);assert.equal(p.audioDucking,true);const wav=Buffer.from(p.audios['santa-laugh'].data.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');let peak=0;for(let i=44;i+1<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>3000);assert.ok(peak<32767);assert.ok(p.music!.notes.some(n=>n.instrument==='bells'&&n.at>=12));assert.ok(p.music!.notes.some(n=>n.instrument==='spooky'&&n.at<10));assert.ok(objectSoundScore2D(p)!.notes.some(n=>n.at>=5&&n.at<10));
});
test('final English greeting is editable, large, safe and given a full reading interval',()=>{
 const p=load(),s=p.scenes.at(-1)!,texts=s.elements.filter(e=>e.type==='text');assert.deepEqual(texts.map(e=>e.text),['Happy Halloween!','But don’t forget…','Christmas is coming!','Ho ho ho!']);assert.ok(s.duration>=7);for(const e of texts){assert.ok(e.fontSize>=50);assert.ok(e.x>=8&&e.x+e.width<=88);assert.ok(e.y>=10&&e.y+e.height<=50);assert.ok(e.until!-e.at>=5);}
});

test('firelight is irregular and stronger without visible flames; aurora has independent moving bands and folds',()=>{
 const p=load(),pumpkin=p.objects2d.pumpkin.model!,stage=p.stages2d.forest.model!;
 assert.ok(!pumpkin.parts.some(p=>p.id.includes('flame')));assert.ok(pumpkin.parts.some(p=>p.id==='outer-firelight'));
 const fire=pumpkin.animations.idle.tracks.find(t=>t.part==='fire')!;assert.ok(fire.keys.length>=12);assert.ok(Math.max(...fire.keys.map(k=>k.value))>=.7);assert.ok(Math.min(...fire.keys.map(k=>k.value))>=.2);
 assert.equal(stage.parts.filter(p=>p.id.startsWith('aurora-ribbon-')).length,4);assert.equal(stage.parts.filter(p=>p.id.startsWith('aurora-fold-')).length,6);
 for(const clip of ['idle','lower']){const a=poseModel2D(stage,clip,.1),b=poseModel2D(stage,clip,3.7);for(let i=0;i<4;i++){const id='aurora-ribbon-'+i;assert.notEqual(a.get(id)!.opacity,b.get(id)!.opacity);assert.notEqual(a.get(id)!.scaleY,b.get(id)!.scaleY);}}
});
test('Santa keeps his voice but has no long internal Ho-ho-ho pauses',()=>{
 const p=load(),wav=Buffer.from(p.audios['santa-laugh'].data.split(',')[1],'base64'),rate=wav.readUInt32LE(24),step=Math.round(rate*.01),rms:number[]=[];
 for(let i=44;i+step*2<=wav.length;i+=step*2){let sum=0;for(let k=0;k<step;k++){const v=wav.readInt16LE(i+k*2);sum+=v*v;}rms.push(Math.sqrt(sum/step));}
 const first=rms.findIndex(v=>v>130),last=rms.findLastIndex(v=>v>130);assert.ok(first>=0&&last>first);let run=0,longest=0;for(const v of rms.slice(first,last+1)){run=v<130?run+1:0;longest=Math.max(longest,run);}assert.ok(longest*.01<.16,'internal pauses must stay below 160 ms, not the former 770 ms');
});

test('bat approaches the lens, reveals textured face, keeps flapping and flies fully out before Santa',()=>{
 const p=load(),bat=p.objects2d.bat.model!,scene=p.scenes[1],a=scene.stage2d!.actors.find(a=>a.object==='bat')!;
 assert.equal(a.layer,'foreground');assert.ok(a.actions.some(a=>a.type==='play'&&a.clip==='approach'&&a.duration===5));assert.equal(bat.animations.approach.loop,false);
 const idle=poseModel2D(bat,'idle',3.6);assert.equal(idle.get('flight')!.scaleX,1);assert.equal(idle.get('close-face')!.opacity,0);
 let previous=0;for(const t of [0,1.8,2.5,3.1,3.6,4.05]){const pose=poseModel2D(bat,'approach',t);assert.ok(pose.get('flight')!.scaleX>=previous);previous=pose.get('flight')!.scaleX;assert.equal(pose.get('flight')!.scaleX,pose.get('flight')!.scaleY);}assert.equal(previous,10);
 const near=poseClipsModel2D(bat,[{clip:'idle',time:3.6},{clip:'approach',time:3.6}]);assert.equal(near.get('close-face')!.opacity,1);assert.equal(near.get('body')!.opacity,0);assert.ok(near.get('left-wing')!.scaleY<1);assert.ok(bat.parts.some(p=>p.id==='close-face-art'&&p.shape==='sprite'));assert.ok(bat.images!.art.data!.startsWith('data:image/webp;base64,'));
 assert.ok(Math.abs(actorFrame2D(a,4.05).x-270)<1);assert.ok(actorFrame2D(a,5).y+90*a.scale*10<0);assert.equal(p.scenes[0].stage2d!.actors.find(a=>a.object==='bat')!.actions.some(a=>a.clip==='approach'),false);assert.match(p.storyboard!.shots[1].action,/auf die Kamera|zur Kamera/);
});

test('seasonal greetings remain editable with distinct locally bundled display fonts and effects',()=>{
 const p=load(),s=p.scenes.at(-1)!,h=s.elements.find(e=>e.id==='happy')!,c=s.elements.find(e=>e.id==='christmas')!;
 assert.equal(h.type,'text');assert.equal(c.type,'text');assert.equal(h.font,'Creepster');assert.equal(h.color,'#ffa947');assert.equal(h.textEffects.glow.enabled,true);assert.equal(c.font,'Mountains of Christmas');assert.equal(c.bold,true);assert.equal(c.color,'#fff1c1');assert.equal(c.textEffects.outline.enabled,true);assert.notEqual(h.font,c.font);assert.ok(c.y+c.height<=40);assert.match(p.storyboard!.shots.at(-1)!.action,/Typografie:/);
 for(const file of ['Creepster-Regular.ttf','MountainsofChristmas-Regular.ttf','MountainsofChristmas-Bold.ttf']){const bytes=readFileSync('public/fonts/'+file);assert.ok(bytes.length>10000);assert.equal(bytes.readUInt32BE(0),0x00010000);}
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
 const base=poseModel2D(m,'idle',1);assert.equal(base.get('moon-flight-root')!.scaleX,1);assert.equal(base.get('moon-flight-root')!.opacity,1);assert.equal(p.objects2d.santa.model!.animations['moon-flight'],undefined);assert.match(p.storyboard!.shots[1].action,/von links ins Bild/);assert.match(p.storyboard!.shots[1].action,/proportional immer kleiner/);
});
