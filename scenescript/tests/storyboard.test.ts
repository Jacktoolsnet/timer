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
 for(const bad of [null,'wide',16,{},''])assert.throws(()=>parseStoryboard({...old,format:bad}),/format/);
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
