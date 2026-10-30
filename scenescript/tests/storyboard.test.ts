import {importStoryboardResource,MAX_RESOURCE_IMPORT_BYTES} from '../src/lib/storyboard-resource-import.ts';
import {birdModel2D,cityModel2D} from '../src/lib/free2d-example.ts';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseStoryboard,newStoryboard,importStoryboard,exportStoryboard,canApproveStoryboard,invalidateStoryboardApprovals,storyboardGuide} from '../src/lib/storyboard.ts';
import {inflationStoryboard} from '../src/lib/inflation-storyboard.ts';
import {demoProject,parseProject,validateProject,projectJsonBytes} from '../src/lib/model.ts';
const example=()=>parseStoryboard(inflationStoryboard());
const comment=()=>({id:'comment1',text:'Make the gold warmer.',resolved:false,reply:''});
test('legacy projects default to no plan; storyboard persists without affecting video or resources',()=>{
 const p=validateProject(demoProject()),scenes=structuredClone(p.scenes);assert.equal(p.storyboard,null);p.storyboard=example();const next=parseProject(JSON.stringify(p));assert.deepEqual(next.storyboard,p.storyboard);assert.deepEqual(next.scenes,scenes);assert.deepEqual(Object.keys(next.assets),[]);assert.equal(projectJsonBytes(next),Buffer.byteLength(JSON.stringify(next)));assert.deepEqual(validateProject(next),next);
 const legacy=JSON.parse(JSON.stringify(p));delete legacy.storyboard;assert.equal(validateProject(legacy).storyboard,null);
});
test('feedback is compact, restores images by ID and never mutates its input',()=>{
 const old=example(),before=JSON.stringify(old),feedback=exportStoryboard(old);assert.ok(!feedback.includes('data:image'));assert.ok(feedback.length<15000);const incoming=JSON.parse(feedback);incoming.board.story+=' Stronger hook.';const next=importStoryboard(JSON.stringify(incoming),old);assert.equal(next.revision,1);assert.deepEqual(next.images,old.images);assert.equal(next.approved,false);assert.equal(JSON.stringify(old),before);assert.deepEqual(importStoryboard(exportStoryboard(old,true),null).images,old.images);
});
test('AI revisions cannot silently rewrite, resolve or delete user feedback',()=>{
 const old=example();old.comments.push(comment());old.shots[0].comments.push({...comment(),id:'shotComment'});const incoming=JSON.parse(exportStoryboard(old));incoming.board.comments[0]={id:'comment1',text:'Changed by AI',resolved:true,reply:'Warmer gold is planned.'};incoming.board.shots[0].comments=[];const next=importStoryboard(JSON.stringify(incoming),old);assert.equal(next.comments[0].text,comment().text);assert.equal(next.comments[0].resolved,false);assert.equal(next.comments[0].reply,'Warmer gold is planned.');assert.deepEqual(next.shots[0].comments,old.shots[0].comments);
 incoming.board.shots.shift();assert.throws(()=>importStoryboard(JSON.stringify(incoming),old),/cannot remove commented/);
});
test('stale revisions and wrong plans fail; approvals belong to users and reset on content change',()=>{
 const old=example();for(const s of [...old.characters,...old.settings,...old.shots])s.status='approved';old.approved=true;assert.equal(canApproveStoryboard(old),true);const json=JSON.parse(exportStoryboard(old));json.board.revision++;assert.throws(()=>importStoryboard(JSON.stringify(json),old),/outdated/);json.board.revision=0;json.board.id='other';assert.throws(()=>importStoryboard(JSON.stringify(json),old),/different storyboard/);json.board.id=old.id;json.board.approved=false;json.board.shots[0].action+=' More glow.';const next=importStoryboard(JSON.stringify(json),old);assert.ok(next.shots.every(s=>s.status==='draft'));assert.equal(next.approved,false);
 old.comments.push(comment());assert.equal(canApproveStoryboard(old),false);assert.throws(()=>parseStoryboard(old),/all characters/);old.comments[0].resolved=true;assert.equal(canApproveStoryboard(old),true);
});
test('strict structure, references, bounded counts, safe images and finite durations',()=>{
 for(const mutate of [(b:any)=>b.extra=1,(b:any)=>b.shots[0].extra=1,(b:any)=>b.revision=.5,(b:any)=>b.duration=NaN,(b:any)=>b.shots[0].duration=0,(b:any)=>b.shots[0].characters=['missing'],(b:any)=>b.shots[0].settings=['constructor'],(b:any)=>b.shots[0].image='missing',(b:any)=>b.characters.push(b.characters[0]),(b:any)=>b.shots[0].comments=Array(101).fill(comment()),(b:any)=>b.images.start.data='https://example.com/image.png',(b:any)=>delete b.images.start.data]){const b=inflationStoryboard();mutate(b);assert.throws(()=>parseStoryboard(b));}
 const b=JSON.parse(exportStoryboard(example()));b.board.images.newImage={name:'missing.png'};assert.throws(()=>importStoryboard(JSON.stringify(b),example()),/new image needs data/);
 assert.throws(()=>importStoryboard('{',null));assert.throws(()=>importStoryboard('{"kind":"project","version":"1.0"}',null));assert.throws(()=>importStoryboard(' '.repeat(25*1024*1024+1),null),/maximum 25 MiB/);
});
test('a fresh planning-only board exports a usable template and independent instructions',()=>{
 const b=newStoryboard('New film');assert.equal(b.shots.length,0);assert.equal(canApproveStoryboard(b),false);b.comments.push(comment());assert.deepEqual(importStoryboard(exportStoryboard(b),b).comments,b.comments);assert.ok(storyboardGuide.includes('NOT generating executable SceneScript'));assert.ok(storyboardGuide.includes('all fields required')||storyboardGuide.includes('All fields required'));assert.ok(storyboardGuide.length<4000);
});
test('planning format is portable, validated and independent from the video; old plans inherit project format',()=>{
 assert.equal(newStoryboard('New').format,'landscape');assert.equal(newStoryboard('New','square').format,'square');
 const p=demoProject();p.format='portrait';p.storyboard=example();p.storyboard.format='square';assert.equal(validateProject(p).format,'portrait');assert.equal(parseProject(JSON.stringify(p)).storyboard!.format,'square');
 const legacy:any=JSON.parse(JSON.stringify(p));delete legacy.storyboard.format;assert.equal(parseProject(JSON.stringify(legacy)).storyboard!.format,'portrait');assert.equal(parseStoryboard(legacy.storyboard).format,'landscape');
 const old=example();old.format='square';const feedback=JSON.parse(exportStoryboard(old));delete feedback.board.format;assert.equal(importStoryboard(JSON.stringify(feedback),old).format,'square');
 for(const bad of [null,'wide',16,{},'','landscape 16:9','portrait 9:16','square 1:1'])assert.throws(()=>parseStoryboard({...old,format:bad}),/format/);
});
test('all subject and shot approvals are required; old plans load safely with fresh subject reviews',()=>{
 const board=example();for(const shot of board.shots)shot.status='approved';assert.equal(canApproveStoryboard(board),false);for(const subject of board.characters)subject.status='approved';assert.equal(canApproveStoryboard(board),false);for(const setting of board.settings)setting.status='approved';assert.equal(canApproveStoryboard(board),true);board.approved=true;assert.equal(parseStoryboard(board).approved,true);
 const legacy:any=JSON.parse(JSON.stringify(board));for(const subject of [...legacy.characters,...legacy.settings])delete subject.status;const migrated=parseStoryboard(legacy);assert.equal(migrated.approved,false);assert.ok([...migrated.characters,...migrated.settings].every(s=>s.status==='draft'));assert.ok(migrated.shots.every(s=>s.status==='approved'));assert.equal(canApproveStoryboard(migrated),false);
 for(const value of [null,true,'invalid',1]){const invalid:any=structuredClone(board);invalid.characters[0].status=value;assert.throws(()=>parseStoryboard(invalid),/status/);}
});
test('AI cannot approve subjects; unchanged user approvals survive a roundtrip and changed content resets them',()=>{
 const board=example(),forged=JSON.parse(exportStoryboard(board));for(const item of [...forged.board.characters,...forged.board.settings,...forged.board.shots])item.status='approved';const imported=importStoryboard(JSON.stringify(forged),board);assert.ok([...imported.characters,...imported.settings,...imported.shots].every(s=>s.status==='draft'));
 for(const item of [...board.characters,...board.settings,...board.shots])item.status='approved';const unchanged=importStoryboard(exportStoryboard(board),board);assert.ok([...unchanged.characters,...unchanged.settings,...unchanged.shots].every(s=>s.status==='approved'));
 const changed=JSON.parse(exportStoryboard(board));changed.board.characters[0].description+=' New colour.';const revised=importStoryboard(JSON.stringify(changed),board);assert.ok([...revised.characters,...revised.settings,...revised.shots].every(s=>s.status==='draft'));
});
test('local content edits revoke the subject and dependent shots, but preserve unrelated reviews',()=>{
 const board=example();for(const item of [...board.characters,...board.settings,...board.shots])item.status='approved';board.approved=true;board.shots[2].characters=['gold'];invalidateStoryboardApprovals(board,{kind:'characters',id:'chocolate'});assert.equal(board.approved,false);assert.equal(board.characters[0].status,'draft');assert.equal(board.characters[1].status,'approved');assert.equal(board.settings[0].status,'approved');assert.equal(board.shots[0].status,'draft');assert.equal(board.shots[2].status,'approved');
 invalidateStoryboardApprovals(board,{kind:'settings',id:'chart'});assert.equal(board.settings[0].status,'draft');assert.ok(board.shots.every(s=>s.status==='draft'));invalidateStoryboardApprovals(board);assert.ok([...board.characters,...board.settings,...board.shots].every(s=>s.status==='draft'));
});
test('character/object categories are strict and portable; legacy entries retain IDs and default to characters',()=>{
 const board=example();assert.ok(board.characters.every(c=>c.kind==='object'));const old:any=JSON.parse(JSON.stringify(board));for(const character of old.characters)delete character.kind;const migrated=parseStoryboard(old);assert.ok(migrated.characters.every(c=>c.kind==='character'));assert.deepEqual(migrated.shots.map(s=>s.characters),board.shots.map(s=>s.characters));assert.equal(migrated.characters[0].id,board.characters[0].id);
 assert.ok(importStoryboard(exportStoryboard(board),board).characters.every(c=>c.kind==='object'));
 for(const value of [null,true,'prop',{},1]){const invalid:any=structuredClone(board);invalid.characters[0].kind=value;assert.throws(()=>parseStoryboard(invalid),/kind/);}
 const invalid:any=structuredClone(board);invalid.settings[0].kind='object';assert.throws(()=>parseStoryboard(invalid),/unknown field/);
});

test('space adventure example separates people and objects with explicit pending reviews and intact sketches',()=>{
 const root=new URL('../public/examples/space-adventure-storyboard/',import.meta.url);
 const raw=readFileSync(new URL('space-adventure.storyboard.json',root),'utf8');
 const board=parseStoryboard(JSON.parse(raw).board);
 const source=parseStoryboard(JSON.parse(readFileSync(new URL('space-adventure.plan.json',root),'utf8')).board);
 assert.equal(board.id,source.id);assert.equal(board.revision,7);
 assert.deepEqual(board.characters.filter(c=>c.kind==='character').map(c=>c.id),['pilot']);
 assert.deepEqual(board.characters.filter(c=>c.kind==='object').map(c=>c.id),['hero-fighter','sector-targets','enemy-fleet']);
 assert.equal(board.settings.length,3);assert.equal(board.shots.length,8);
 assert.equal(board.shots.reduce((sum,s)=>sum+s.duration,0),30);
 assert.ok([...board.characters,...board.settings,...board.shots].every(item=>item.status==='draft'));
 assert.equal(board.approved,false);assert.equal(board.comments[0].resolved,false);
 assert.equal(Object.keys(board.images).length,8);
 for(const image of Object.values(board.images)){
  assert.equal(image.data,'data:image/jpeg;base64,'+readFileSync(new URL(image.name,root)).toString('base64'));
 }
 const textOnly=structuredClone(board);textOnly.images={};
 for(const item of [...textOnly.characters,...textOnly.settings,...textOnly.shots])item.image=null;
 assert.deepEqual(parseStoryboard(textOnly),source);
 for(const current of [null,source,board]){
  const imported=importStoryboard(raw,current);
  assert.equal(imported.revision,8);assert.equal(imported.characters.length,4);
  assert.equal(imported.comments[0].resolved,false);assert.equal(Object.keys(imported.images).length,8);
 }
});

test('optional ElevenLabs subject voices roundtrip, validate and survive AI feedback',()=>{
 const b=example();b.characters[0].voice={provider:'elevenlabs',id:'HeroVoice',name:'Hero voice'};b.settings[0].voice={provider:'elevenlabs',id:'PlaceVoice',name:'Place voice'};
 const parsed=parseStoryboard(b);assert.deepEqual(parsed.characters[0].voice,b.characters[0].voice);assert.deepEqual(importStoryboard(exportStoryboard(b,true),null).settings[0].voice,b.settings[0].voice);
 const feedback=JSON.parse(exportStoryboard(b));delete feedback.board.characters[0].voice;feedback.board.settings[0].voice={provider:'elevenlabs',id:'ModelInvented',name:'No'};const imported=importStoryboard(JSON.stringify(feedback),b);assert.deepEqual(imported.characters[0].voice,b.characters[0].voice);assert.deepEqual(imported.settings[0].voice,b.settings[0].voice);
 for(const voice of [{provider:'other',id:'Good',name:'No'},{provider:'elevenlabs',id:'../bad',name:'No'},{provider:'elevenlabs',id:'Good',name:'No',key:'secret'}]){const bad=structuredClone(b);(bad.characters[0] as any).voice=voice;assert.throws(()=>parseStoryboard(bad),/voice/);}
 const p=demoProject();p.storyboard=b;assert.deepEqual(parseProject(JSON.stringify(p)).storyboard!.characters[0].voice,b.characters[0].voice);
});

test('removing a unique storyboard image deletes only its asset and invalidates scene approval',async()=>{
 const {removeStoryboardImage}=await import('../src/lib/storyboard-images.ts');
 const board=example();for(const item of [...board.characters,...board.settings,...board.shots])item.status='approved';board.approved=true;
 const before=JSON.stringify(board),shot=board.shots.at(-1)!;
 const result=removeStoryboardImage(board,{kind:'shots',id:shot.id});
 assert.equal(result.shots.at(-1)!.image,null);assert.equal(result.shots.at(-1)!.status,'draft');assert.equal(result.approved,false);
 assert.equal(result.revision,board.revision+1);assert.ok(!Object.hasOwn(result.images,shot.image!));assert.deepEqual(result.images.start,board.images.start);
 assert.equal(result.shots[0].status,'approved');assert.equal(JSON.stringify(board),before);
});
test('shared storyboard images survive removal from a subject and dependent scenes require review',async()=>{
 const {removeStoryboardImage}=await import('../src/lib/storyboard-images.ts');
 const board=example();for(const item of [...board.characters,...board.settings,...board.shots])item.status='approved';board.approved=true;
 const result=removeStoryboardImage(board,{kind:'characters',id:board.characters[0].id});
 assert.equal(result.characters[0].image,null);assert.equal(result.characters[0].status,'draft');assert.equal(result.characters[1].status,'approved');
 assert.deepEqual(result.images.start,board.images.start);assert.equal(result.settings[0].image,'start');
 for(const shot of result.shots)assert.equal(shot.status,'draft');
 assert.equal(removeStoryboardImage(result,{kind:'characters',id:board.characters[0].id}),result);
 assert.throws(()=>removeStoryboardImage(board,{kind:'shots',id:'missing'}));
});

test('settings equipment is optional, roundtrips, and only references actual object IDs',()=>{
 const board=example();assert.equal(board.settings[0].objects,undefined);
 board.settings[0].objects=[board.characters[0].id];const parsed=parseStoryboard(board);assert.deepEqual(parsed.settings[0].objects,board.settings[0].objects);
 const feedback=JSON.parse(exportStoryboard(parsed));delete feedback.board.settings[0].objects;
 assert.deepEqual(importStoryboard(JSON.stringify(feedback),parsed).settings[0].objects,board.settings[0].objects);
 for(const objects of [null,['missing'],[board.characters[0].id,board.characters[0].id]]){
  const bad=structuredClone(board);(bad.settings[0] as any).objects=objects;assert.throws(()=>parseStoryboard(bad),/objects/);
 }
 const bad=structuredClone(board);bad.characters[0].kind='character';assert.throws(()=>parseStoryboard(bad),/objects.*missing reference/);
});
test('changing fixed equipment invalidates dependent settings and their shots even without a direct shot reference',()=>{
 const b=example();b.settings[0].objects=[b.characters[0].id];
 for(const item of [...b.characters,...b.settings,...b.shots])item.status='approved';b.approved=true;
 b.shots[0].characters=[];invalidateStoryboardApprovals(b,{kind:'characters',id:b.characters[0].id});
 assert.equal(b.settings[0].status,'draft');assert.equal(b.shots[0].status,'draft');assert.equal(b.characters[1].status,'approved');assert.equal(b.approved,false);
});

test('production choices and concrete SFX tasks validate, persist and remain authoritative during AI revisions',()=>{
 const b=example();assert.equal(b.production,undefined);
 b.production={renderMode:'3d',dialogue:true,music:true,sfx:true};b.shots[0].soundEffects=['A gentle confirmation beep at the machine.'];
 const parsed=parseStoryboard(b);assert.deepEqual(parsed.production,b.production);assert.deepEqual(parsed.shots[0].soundEffects,b.shots[0].soundEffects);
 const feedback=JSON.parse(exportStoryboard(parsed));feedback.board.production={renderMode:'2d',dialogue:false,music:false,sfx:false};delete feedback.board.shots[0].soundEffects;
 const result=importStoryboard(JSON.stringify(feedback),parsed);assert.deepEqual(result.production,b.production);assert.deepEqual(result.shots[0].soundEffects,b.shots[0].soundEffects);
 for(const production of [null,{renderMode:'4d',dialogue:true,music:true,sfx:true},{renderMode:'3d',dialogue:'yes',music:true,sfx:true}]){const bad=structuredClone(b);(bad as any).production=production;assert.throws(()=>parseStoryboard(bad),/production/);}
 for(const effects of [[''],Array(31).fill('beep'),['x'.repeat(1001)]]){const bad=structuredClone(b);bad.shots[0].soundEffects=effects;assert.throws(()=>parseStoryboard(bad),/soundEffects/);}
});

import {roundedHumanModel} from '../src/lib/rounded-human.ts';
import {defaultBoardDesign} from '../src/lib/storyboard-design.ts';
import {acceptBoardModel,modelRequestData} from '../src/lib/storyboard-resources.ts';
import {removeStoryboardImage} from '../src/lib/storyboard-images.ts';
test('subject design and rounded models are portable, bounded and survive general AI revisions unchanged',()=>{
 const b=example(),s=b.characters[0];s.design={...defaultBoardDesign(),mode:'3d'};s.model3d=roundedHumanModel();
 assert.ok(s.model3d.parts.length>70);assert.ok(s.model3d.parts.filter(p=>p.shape==='sphere').length>60);for(const id of ['noseTip','mouth','earL','eyeWhiteR','kneeL','elbowR'])assert.ok(s.model3d.parts.some(p=>p.id===id));
 assert.deepEqual(parseStoryboard(JSON.parse(JSON.stringify(b))),b);
 const feedback=JSON.parse(exportStoryboard(b));delete feedback.board.characters[0].design;feedback.board.characters[0].model3d.parts[0].color='#ffffff';
 const revised=importStoryboard(JSON.stringify(feedback),b);assert.deepEqual(revised.characters[0].design,s.design);assert.deepEqual(revised.characters[0].model3d,s.model3d);
 for(const bad of [null,{}, {...s.design,mode:'mixed'}, {...s.design,style:'photoreal'}, {...s.design,details:'a'.repeat(10001)}])assert.throws(()=>parseStoryboard({...b,characters:[{...s,design:bad}]}));
 assert.throws(()=>parseStoryboard({...b,characters:[{...s,model3d:null}]}),/geometry/);
});
test('targeted model changes only replace the selected geometry and reset dependent approvals',()=>{
 const p=demoProject();p.storyboard=example();const b=p.storyboard;for(const s of [...b.characters,...b.settings,...b.shots])s.status='approved';b.approved=true;
 const original=JSON.stringify(p),target={kind:'characters' as const,id:b.characters[0].id},model=roundedHumanModel();const next=acceptBoardModel(JSON.stringify({model}),p,target);
 assert.equal(JSON.stringify(p),original);assert.deepEqual(next.scenes,p.scenes);assert.equal(next.storyboard!.approved,false);assert.equal(next.storyboard!.characters[0].status,'draft');assert.equal(next.storyboard!.characters[1].status,'approved');assert.deepEqual(next.storyboard!.characters[0].model3d,model);
 const request=modelRequestData(next.storyboard!,target,'Narrower shoulders');assert.equal(request.request,'Narrower shoulders');assert.equal(request.target.id,target.id);assert.ok(!('shots'in request));
 for(const text of ['{}','{"model":null}','{"model":{"parts":[]}}','{"model":{},"project":{}}'])assert.throws(()=>acceptBoardModel(text,p,target));
 assert.throws(()=>acceptBoardModel(JSON.stringify({model:{parts:[{id:'part',texture:{asset:'missing'}}]}}),p,target),/missing asset/);
});
test('deleting a preview retains image data still used by a reviewed model texture',()=>{
 const b=example(),s=b.characters[0];const image='texture';b.images[image]={name:'texture.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII='};s.image=image;s.model3d=roundedHumanModel();s.model3d.parts[1].texture={asset:image,faces:{},repeat:{x:1,y:1},offset:{x:0,y:0},rotation:0};
 const next=removeStoryboardImage(b,{kind:'characters',id:s.id});assert.equal(next.characters[0].image,null);assert.deepEqual(next.images[image],b.images[image]);
});
test('model conversations are bounded, persisted and protected from general planning edits',()=>{
 const p=demoProject();p.storyboard=example();const target={kind:'characters' as const,id:p.storyboard.characters[0].id};
 const next=acceptBoardModel(JSON.stringify({model:roundedHumanModel(),reply:'Die Schultern sind jetzt schmaler.'}),p,target,'Schultern schmaler');
 const subject=next.storyboard!.characters[0];assert.deepEqual(subject.modelChat,[{request:'Schultern schmaler',reply:'Die Schultern sind jetzt schmaler.'}]);
 const feedback=JSON.parse(exportStoryboard(next.storyboard!));feedback.board.characters[0].modelChat=[];assert.deepEqual(importStoryboard(JSON.stringify(feedback),next.storyboard).characters[0].modelChat,subject.modelChat);
 const invalid=structuredClone(next.storyboard!);invalid.characters[0].modelChat=Array(11).fill({request:'x',reply:'y'});assert.throws(()=>parseStoryboard(invalid),/maximum|expected array/);
 subject.design={...defaultBoardDesign(),surface:'colors'};const model=roundedHumanModel();model.parts[1].texture={asset:'missing',faces:{},repeat:{x:1,y:1},offset:{x:0,y:0},rotation:0};assert.throws(()=>acceptBoardModel(JSON.stringify({model}),next,target),/colors-only/);
});

import {storyboardModelGuide} from '../src/lib/storyboard-model-guide.ts';
test('targeted model instructions reuse canonical geometry definitions without the full film guide',()=>{
 const guide=storyboardModelGuide();assert.ok(guide.length<15000);for(const marker of ['Part3D','Joint3D','Texture3D','Model3D','Extrusion3D','FREE CONSTRUCTION:','4096 keys total','NOT JSON syntax'])assert.ok(guide.includes(marker),marker);assert.ok(!guide.includes('YouTube publication package'));assert.ok(!guide.includes('Project.scenes plays'));
});
test('rounded movement-study project bundles the same freely editable model and three actual 3D clips',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/rounded-character/rounded-character.scenescript',import.meta.url),'utf8'));
 assert.equal(p.scenes.length,3);assert.deepEqual(p.characters.rounded_human.model,roundedHumanModel());assert.deepEqual(p.storyboard!.characters[0].model3d,roundedHumanModel());assert.equal(p.storyboard!.approved,false);assert.deepEqual(p.scenes.map(s=>s.stage3d!.actors[0].motions[0].animation),['walk','wave','face']);
});

import {repairTinyBoardModelSizes,boardModelInstructions} from '../src/lib/storyboard-resources.ts';
test('explicit local size repair only raises tiny positive dimensions, never guesses other geometry changes',()=>{
 const raw={reply:'Small facial details',model:{parts:[{id:'detail',size:{x:.005,y:.001,z:.01}},{id:'invalid',size:{x:0,y:-.01,z:51}},{id:'string',size:{x:'0.005'}}]}};
 const original=JSON.stringify(raw),fixed=repairTinyBoardModelSizes(original),next=JSON.parse(fixed.text);assert.equal(JSON.stringify(raw),original);assert.equal(fixed.changes.length,2);assert.deepEqual(next.model.parts[0].size,{x:.01,y:.01,z:.01});assert.deepEqual(next.model.parts[1],raw.model.parts[1]);assert.deepEqual(next.model.parts[2],raw.model.parts[2]);assert.equal(repairTinyBoardModelSizes(fixed.text).text,fixed.text);
 assert.match(boardModelInstructions,/0.01 to 50 inclusive/);assert.match(boardModelInstructions,/For group nodes omit size/);
 const p=demoProject();p.storyboard=example();const target={kind:'characters' as const,id:p.storyboard.characters[0].id};const tiny=JSON.stringify({model:{parts:[{id:'detail',size:{x:.005}}]}});
 assert.throws(()=>acceptBoardModel(tiny,p,target),/size.x: expected number 0.01–50; received 0.005/);assert.equal(acceptBoardModel(repairTinyBoardModelSizes(tiny).text,p,target).storyboard!.characters[0].model3d!.parts[0].size.x,.01);
 assert.throws(()=>repairTinyBoardModelSizes('{'));assert.throws(()=>repairTinyBoardModelSizes('{"model":{"parts":[]}}'));
});

import {repairBoardJointTargets} from '../src/lib/storyboard-resources.ts';
test('explicit joint repair preserves valid action gains, limits and animation keys',()=>{
 const joint={id:'hinge',min:-55,max:55,value:0,target:180};
 const raw={model:{parts:[{id:'arm',joints:[{...joint,control:'leftArm'},{...joint,id:'other',axis:'y',control:'none'},{...joint,id:'lower',axis:'z',control:'mouth',target:-180}]}],animations:{}}};
 const original=JSON.stringify(raw),fixed=repairBoardJointTargets(original),next=JSON.parse(fixed.text);assert.equal(JSON.stringify(raw),original);assert.equal(fixed.changes.length,2);assert.equal(next.model.parts[0].joints[0].target,180);assert.equal(next.model.parts[0].joints[1].target,55);assert.equal(next.model.parts[0].joints[2].target,-55);assert.equal(repairBoardJointTargets(fixed.text).text,fixed.text);
 const p=demoProject();p.storyboard=example();assert.doesNotThrow(()=>acceptBoardModel(fixed.text,p,{kind:'characters',id:p.storyboard!.characters[0].id}));
 const invalid={model:{parts:[{id:'bad',joints:[{...joint,min:100,max:0},{...joint,min:-4000},{...joint,target:'180'}]}]}};const untouched=JSON.stringify(invalid);assert.equal(repairBoardJointTargets(untouched).text,untouched);
});

import {modelNeedsRestyle} from '../src/lib/storyboard-resources.ts';
test('selected styles explicitly trigger redesign rather than preserving old rounded geometry and conversation',()=>{
 const b=example(),s=b.characters[0];s.design={...defaultBoardDesign(),mode:'3d'};s.modelDesign={...s.design};s.model3d=roundedHumanModel();s.modelChat=[{request:'Keep it rounded',reply:'Rounded model'}];
 const target={kind:'characters' as const,id:s.id};assert.equal(modelRequestData(b,target,'Smaller nose').operation,'refine');
 for(const style of ['block','cartoon','natural'] as const){s.design.style=style;const request=modelRequestData(b,target,'');assert.equal(request.operation,'restyle');assert.equal(request.target.design.style,style);assert.deepEqual(request.target.conversation,[]);assert.ok(request.styleBrief.startsWith(style==='block'?'BLOCK':style==='cartoon'?'CARTOON':'NATURAL'));assert.ok(request.target.model);assert.equal(modelNeedsRestyle(s),true);}
 const p=demoProject();p.storyboard=b;s.design.style='block';
 const unchanged=acceptBoardModel(JSON.stringify({model:s.model3d,reply:'Now block style'}),p,target);assert.equal(unchanged.storyboard!.characters[0].modelDesign!.style,'rounded');assert.equal(modelNeedsRestyle(unchanged.storyboard!.characters[0]),true);
 const recolored=structuredClone(s.model3d);recolored.parts[1].color='#ff0000';assert.equal(modelNeedsRestyle(acceptBoardModel(JSON.stringify({model:recolored}),p,target).storyboard!.characters[0]),true);
 const changed=acceptBoardModel(JSON.stringify({model:{parts:[{id:'block_body',shape:'box'}]}}),p,target);assert.equal(changed.storyboard!.characters[0].modelDesign!.style,'block');assert.equal(modelNeedsRestyle(changed.storyboard!.characters[0]),false);
 const feedback=JSON.parse(exportStoryboard(changed.storyboard!));feedback.board.characters[0].modelDesign.style='natural';assert.equal(importStoryboard(JSON.stringify(feedback),changed.storyboard).characters[0].modelDesign!.style,'block');
 const legacy=structuredClone(s);delete legacy.modelDesign;assert.equal(modelNeedsRestyle(legacy),true);delete legacy.model3d;assert.equal(modelNeedsRestyle(legacy),false);
});

import {modelSurfaceStatus} from '../src/lib/storyboard-resources.ts';
import {suggestedModel} from '../src/lib/ai-models.ts';
test('natural models recommend high reasoning, anatomical smoothness and explicit material texture use',()=>{
 assert.equal(suggestedModel('model').effort,'high');assert.equal(suggestedModel('board').effort,'medium');
 const b=example(),s=b.characters[0];s.design={...defaultBoardDesign(),style:'natural',surface:'mixed'};s.model3d=roundedHumanModel();
 assert.equal(modelSurfaceStatus(s).missing,true);assert.equal(modelSurfaceStatus(s).parts,0);
 const request=modelRequestData(b,{kind:'characters',id:s.id},'');for(const word of ['smooth:true','capsules','roundness','pockets','clearance','clip extremes'])assert.ok(request.styleBrief.includes(word),word);
 s.model3d.parts[1].texture={asset:'fabric',faces:{},repeat:{x:3,y:3},offset:{x:0,y:0},rotation:0};assert.deepEqual(modelSurfaceStatus(s),{missing:false,parts:1,images:1});
 s.design.surface='colors';delete s.model3d.parts[1].texture;assert.equal(modelSurfaceStatus(s).missing,false);
});

import {boardResource2D,boardResourceModes} from '../src/lib/storyboard-resource-preview.ts';
import {resourcePreview2D} from '../src/lib/stage2d-resource-preview.ts';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
test('2D storyboard resource associations persist, validate and survive AI revisions',()=>{
 const p=lightCollectorProject(),b=p.storyboard!,subject=b.characters[0];
 subject.resource2d='spark';
 const parsed=parseProject(JSON.stringify(p));assert.equal(parsed.storyboard!.characters[0].resource2d,'spark');
 const incoming=JSON.parse(exportStoryboard(b));delete incoming.board.characters[0].resource2d;
 assert.equal(importStoryboard(JSON.stringify(incoming),b).characters[0].resource2d,'spark');
 subject.resource2d=null;assert.equal(parseStoryboard(b).characters[0].resource2d,null);
 incoming.board.characters[0].resource2d='collector';assert.equal(importStoryboard(JSON.stringify(incoming),b).characters[0].resource2d,null);
 subject.resource2d='bad reference';assert.throws(()=>parseStoryboard(b),/resource2d/);
});
test('storyboard previews resolve actual typed resources and honor explicit and inherited modes',()=>{
 const p=lightCollectorProject(),b=p.storyboard!,subject=b.characters[0],setting=b.settings[0];
 assert.equal(boardResource2D(p,subject,false).resource,p.objects2d.collector);
 assert.equal(boardResource2D(p,setting,true).resource,p.stages2d.forest);
 assert.equal(boardResource2D(p,setting,false).resource,null);
 assert.deepEqual(boardResourceModes(p,b,subject,false),['2d']);
 subject.design={...defaultBoardDesign(),mode:'inherit'};b.production!.renderMode='3d';
 assert.deepEqual(boardResourceModes(p,b,subject,false),['3d']);
 subject.design.mode='2d';assert.deepEqual(boardResourceModes(p,b,subject,false),['2d']);
 subject.resource2d=null;assert.equal(boardResource2D(p,subject,false).resource,null);
 subject.resource2d='deleted-resource';assert.equal(boardResource2D(p,subject,false).resource,null);
 delete subject.resource2d;subject.id='not-a-resource';subject.name=p.objects2d.collector.name;assert.equal(boardResource2D(p,subject,false).resource,null);
 subject.design.mode='inherit';subject.id='collector';subject.model3d=roundedHumanModel();b.production!.renderMode='mixed';
 assert.deepEqual(boardResourceModes(p,b,subject,false),['2d','3d']);
});
test('isolated 2D resource previews do not mutate libraries or inherit scene animation',()=>{
 const p=lightCollectorProject(),before=JSON.stringify(p),sample=resourcePreview2D(p,'objects2d','collector')!;assert.equal(sample.isolated,true);
 assert.equal(sample.shot.actors.length,1);assert.deepEqual(sample.shot.actors[0].actions,[]);assert.deepEqual(sample.shot.camera,[]);
 assert.equal(sample.shot.transition,null);assert.equal(sample.shot.ending,null);
 sample.resources.objects2d.preview.color='#123456';assert.equal(JSON.stringify(p),before);
 const stage=resourcePreview2D(p,'stages2d','night-garden')!;assert.equal(stage.isolated,false);assert.equal(stage.shot.actors.length,0);assert.equal(stage.resources.stages2d.preview.preset,'night-garden');
 assert.equal(resourcePreview2D(p,'objects2d','missing'),null);
});

test('storyboard guide documents exact format enum values separately from aspect ratios',()=>{
 assert.ok(storyboardGuide.includes('JSON enum: "landscape"|"portrait"|"square"'));
 assert.ok(storyboardGuide.includes('never part of the value'));
 for(const format of ['landscape','portrait','square'] as const)assert.equal(parseStoryboard({...example(),format}).format,format);
});

test('resource JSON import accepts raw models and AI envelopes, scoped to a single draft subject',()=>{
 for(const dimension of ['2d','3d'] as const)for(const kind of ['characters','settings'] as const){
  const p=demoProject();p.storyboard=example();const b=p.storyboard;b.format='landscape';
  for(const s of [...b.characters,...b.settings,...b.shots])s.status='approved';b.approved=true;
  const subject=b[kind][0];subject.design={...defaultBoardDesign(),mode:dimension};
  const target={kind,id:subject.id},model=dimension==='3d'?roundedHumanModel():kind==='settings'?cityModel2D():birdModel2D(),before=JSON.stringify(p);
  for(const envelope of [false,true]){
   const text=JSON.stringify(envelope?{model,reply:'Imported Mila'}:model),next=importStoryboardResource('\uFEFF'+text,p,target,dimension),changed=next.storyboard![kind][0];
   assert.deepEqual(dimension==='2d'?changed.model2d:changed.model3d,model);assert.equal(changed.status,'draft');assert.equal(next.storyboard!.approved,false);assert.deepEqual(next.scenes,p.scenes);assert.deepEqual(next.objects2d,p.objects2d);assert.deepEqual(next.characters,p.characters);assert.equal(JSON.stringify(p),before);
   assert.equal(changed.name,subject.name);assert.deepEqual(changed.comments,subject.comments);
  }
 }
});
test('invalid resource imports leave the source intact and never repair malformed curves silently',()=>{
 const p=demoProject();p.storyboard=example();const target={kind:'characters' as const,id:p.storyboard.characters[0].id},before=JSON.stringify(p);
 const bad=birdModel2D();bad.parts[2].path[2]={op:'Q',values:[1,2,3,4,5,6]};
 for(const text of ['null','[]','not JSON',JSON.stringify({model:bad}),JSON.stringify({...birdModel2D(),unexpected:true}),' '.repeat(MAX_RESOURCE_IMPORT_BYTES+1)])assert.throws(()=>importStoryboardResource(text,p,target,'2d'));
 assert.throws(()=>importStoryboardResource(JSON.stringify(birdModel2D()),p,{kind:'settings',id:p.storyboard!.settings[0].id},'2d'),/960/);
 assert.throws(()=>importStoryboardResource(JSON.stringify(birdModel2D()),p,target,'3d'));
 assert.equal(JSON.stringify(p),before);
});
