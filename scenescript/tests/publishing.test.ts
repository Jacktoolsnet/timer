import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoProject,validateProject,parseProject,projectJsonBytes} from '../src/lib/model.ts';
import {publishingFor,parsePublishing,acceptPublishing,acceptPlatformPublishing,platformPublishingInstructions} from '../src/lib/publishing.ts';
import {projectManifest} from '../src/lib/ai-workflow.ts';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
test('legacy hashtags migrate into descriptions, not YouTube tags, without modifying old files',()=>{
 const p=demoProject();p.description='A film';p.hashtags='#Film #Animation';const before=JSON.stringify(p),profiles=publishingFor(p);
 assert.equal(profiles.youtube.description,'A film\n\n#Film #Animation');assert.equal(profiles.youtube.tags,'');assert.equal(JSON.stringify(p),before);assert.equal(parseProject(before).publishing,undefined);
 p.description+='\n\n'+p.hashtags;assert.equal(publishingFor(p).youtube.description,p.description);
});
test('publication profiles validate, round-trip and reject malformed fields',()=>{
 const p=demoProject();p.publishing=publishingFor(p);p.publishing.youtube.tags='Film, Animation';p.publishing.tiktok.description='A different hook! #Film';
 const parsed=validateProject(p);assert.deepEqual(parsed.publishing,p.publishing);assert.deepEqual(parseProject(JSON.stringify(p)),parsed);assert.equal(projectJsonBytes(parsed),Buffer.byteLength(JSON.stringify(parsed)));
 for(const bad of [null,[],{...p.publishing,extra:true},{...p.publishing,youtube:{...p.publishing.youtube,tags:'#Film'}},{...p.publishing,tiktok:{...p.publishing.tiktok,cover:{name:'bad.svg',data:'data:image/svg+xml;base64,PHN2Zy8+'}}},{...p.publishing,tiktok:{...p.publishing.tiktok,description:'a'.repeat(5001)}}])assert.throws(()=>parsePublishing(bad));
});
test('demo has distinct copy, true comma-separated YouTube tags, and downloadable wide and portrait covers',()=>{
 const p=validateProject(lightCollectorProject()),profiles=p.publishing!;
 assert.notEqual(profiles.youtube.description,profiles.tiktok.description);assert.ok(profiles.youtube.description.includes('#2DAnimation'));assert.ok(profiles.tiktok.description.includes('#2DAnimation'));assert.ok(!profiles.youtube.tags.includes('#'));
 for(const [cover,w,h]of [[p.thumbnail!,1280,720],[profiles.tiktok.cover!,1080,1920]] as const){const bytes=Buffer.from(cover.data.split(',')[1],'base64');assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);assert.deepEqual(bytes,readFileSync(new URL('../public/examples/'+cover.name,import.meta.url)));}
 const manifest=JSON.stringify(projectManifest(p));assert.ok(!manifest.includes('data:image/'));assert.ok(manifest.includes(profiles.tiktok.cover!.name));
});
test('AI publication changes only text and cannot replace covers or the film',()=>{
 const p=lightCollectorProject(),before=JSON.stringify(p),text={youtube:{title:'New title',description:'Longer film description #Animation',firstComment:'Your favourite?',tags:'Film, Animation'},tiktok:{description:'A little spark! #Film',firstComment:'✨ or 🦋?'}};
 const next=acceptPublishing(JSON.stringify(text),p);assert.equal(JSON.stringify(p),before);assert.strictEqual(next.scenes,p.scenes);assert.strictEqual(next.storyboard,p.storyboard);assert.strictEqual(next.thumbnail,p.thumbnail);assert.deepEqual(next.publishing!.tiktok.cover,p.publishing!.tiktok.cover);assert.equal(next.publishing!.youtube.title,'New title');validateProject(next);
 for(const bad of [{...text,scenes:[]},{...text,tiktok:{...text.tiktok,cover:null}},{...text,youtube:{...text.youtube,tags:'#Wrong'}},{...text,youtube:{...text.youtube,extra:'bad'}}])assert.throws(()=>acceptPublishing(JSON.stringify(bad),p));
});

test('platform-specific generation preserves the other profile and rejects cross-platform changes',()=>{
 const p=lightCollectorProject(),before=JSON.stringify(p);
 for(const platform of ['youtube','tiktok'] as const){
  const other=platform==='youtube'?'tiktok':'youtube',profile=platform==='youtube'?{title:'New YouTube title',description:'New description',firstComment:'New comment',tags:'Film, Animation'}:{description:'New TikTok caption',firstComment:'New comment'};
  const next=acceptPlatformPublishing(JSON.stringify({[platform]:profile}),p,platform);
  assert.deepEqual(next.publishing![other],p.publishing![other]);assert.equal(next.publishing![platform].description,profile.description);assert.strictEqual(next.scenes,p.scenes);assert.deepEqual(next.publishing!.tiktok.cover,p.publishing!.tiktok.cover);
  assert.throws(()=>acceptPlatformPublishing(JSON.stringify({[other]:profile}),p,platform));
  assert.throws(()=>acceptPlatformPublishing(JSON.stringify({[platform]:profile,[other]:profile}),p,platform));
  assert.ok(platformPublishingInstructions(platform).includes('Only return the '+platform+' profile'));
 }
 assert.equal(JSON.stringify(p),before);
});


test('preserved romantic Halloween example has distinct English YouTube and TikTok copy without translating its German storyboard',async()=>{
 const {halloweenHeartProject}=await import('../src/lib/halloween-heart-example.ts');
 const p=validateProject(halloweenHeartProject()),profiles=publishingFor(p);assert.equal(p.title,'Halloween mit Herz');assert.equal(p.storyboard!.language,'English');assert.ok(p.storyboard!.story.includes('Arbeitsbeschreibungen im Storyboard bleiben auf Deutsch'));
 assert.match(profiles.youtube.title,/Did You Know Halloween/);assert.match(profiles.youtube.description,/Irish tradition/);assert.match(profiles.youtube.firstComment,/What is your favourite/);assert.match(profiles.tiktok.description,/make it romantic/);assert.match(profiles.tiktok.firstComment,/First time hearing/);assert.notEqual(profiles.youtube.description,profiles.tiktok.description);assert.ok(profiles.youtube.tags.includes(', '));assert.ok(!profiles.youtube.tags.includes('#'));assert.ok(profiles.youtube.description.includes('#Halloween'));assert.ok(profiles.tiktok.description.includes('#Halloween'));assert.equal(profiles.tiktok.cover,null);
 const bundled=parseProject(readFileSync(new URL('../public/examples/halloween-heart.scenescript.json',import.meta.url),'utf8'));assert.deepEqual(bundled.publishing,p.publishing);assert.equal(bundled.narration,null);
});
