import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseStoryboard,newStoryboard,importStoryboard,exportStoryboard,canApproveStoryboard,storyboardGuide} from '../src/lib/storyboard.ts';
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
 const old=example();for(const s of old.shots)s.status='approved';old.approved=true;assert.equal(canApproveStoryboard(old),true);const json=JSON.parse(exportStoryboard(old));json.board.revision++;assert.throws(()=>importStoryboard(JSON.stringify(json),old),/outdated/);json.board.revision=0;json.board.id='other';assert.throws(()=>importStoryboard(JSON.stringify(json),old),/different storyboard/);json.board.id=old.id;json.board.approved=false;json.board.shots[0].action+=' More glow.';const next=importStoryboard(JSON.stringify(json),old);assert.ok(next.shots.every(s=>s.status==='draft'));assert.equal(next.approved,false);
 old.comments.push(comment());assert.equal(canApproveStoryboard(old),false);assert.throws(()=>parseStoryboard(old),/all shots/);old.comments[0].resolved=true;assert.equal(canApproveStoryboard(old),true);
});
test('strict structure, references, bounded counts, safe images and finite durations',()=>{
 for(const mutate of [(b:any)=>b.extra=1,(b:any)=>b.shots[0].extra=1,(b:any)=>b.revision=.5,(b:any)=>b.duration=NaN,(b:any)=>b.shots[0].duration=0,(b:any)=>b.shots[0].characters=['missing'],(b:any)=>b.shots[0].settings=['constructor'],(b:any)=>b.shots[0].image='missing',(b:any)=>b.characters.push(b.characters[0]),(b:any)=>b.shots[0].comments=Array(101).fill(comment()),(b:any)=>b.images.start.data='https://example.com/image.png',(b:any)=>delete b.images.start.data]){const b=inflationStoryboard();mutate(b);assert.throws(()=>parseStoryboard(b));}
 const b=JSON.parse(exportStoryboard(example()));b.board.images.newImage={name:'missing.png'};assert.throws(()=>importStoryboard(JSON.stringify(b),example()),/new image needs data/);
 assert.throws(()=>importStoryboard('{',null));assert.throws(()=>importStoryboard('{"kind":"project","version":"1.0"}',null));assert.throws(()=>importStoryboard(' '.repeat(25*1024*1024+1),null),/maximum 25 MiB/);
});
test('a fresh planning-only board exports a usable template and independent instructions',()=>{
 const b=newStoryboard('New film');assert.equal(b.shots.length,0);assert.equal(canApproveStoryboard(b),false);b.comments.push(comment());assert.deepEqual(importStoryboard(exportStoryboard(b),b).comments,b.comments);assert.ok(storyboardGuide.includes('NOT generating executable SceneScript'));assert.ok(storyboardGuide.includes('all fields required')||storyboardGuide.includes('All fields required'));assert.ok(storyboardGuide.length<4000);
});
