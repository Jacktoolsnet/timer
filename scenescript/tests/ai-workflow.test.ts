import {publishingFor} from '../src/lib/publishing.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {demoProject} from '../src/lib/model.ts';
import {newStoryboard,exportStoryboard} from '../src/lib/storyboard.ts';
import {boardManifest,projectManifest,inputJson,acceptPlanning,acceptScript,acceptImage,boardReferences,requireApprovedBoard,imagePrompt,planningBoard} from '../src/lib/ai-workflow.ts';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
function project(){const p=demoProject(),b=newStoryboard('Test');b.comments=[{id:'comment',text:'Keep this',resolved:true,reply:'Done'}];b.images.ref={name:'ref.png',data:pixel};b.characters=[{id:'hero',kind:'character',name:'Hero',description:'Robot',image:'ref',status:'approved',comments:[]}];b.shots=[{id:'shot',title:'Shot',duration:3,action:'Move',camera:'Wide',audio:'',image:'ref',characters:['hero'],settings:[],status:'approved',comments:[]}];b.approved=true;p.storyboard=b;return p;}
test('manifest export strips media data without mutating source',()=>{
 const p=project();p.thumbnail={name:'cover.png',data:pixel};const m=projectManifest(p);assert.equal(JSON.stringify(m).includes('base64'),false);assert.equal(p.thumbnail.data,pixel);assert.equal(p.storyboard!.images.ref.data,pixel);assert.equal(boardManifest(p.storyboard!).images.ref.name,'ref.png');
 assert.throws(()=>inputJson({text:'x'.repeat(3*1024*1024)}),/maximum/);
});
test('planning preserves user comments/resolutions, rejects stale responses and cannot approve',()=>{
 const p=project(),b=p.storyboard!,next=structuredClone(b);next.title='Changed';next.comments=[];next.approved=false;
 const r=acceptPlanning(exportStoryboard(next),p,b);assert.equal(r.storyboard!.comments[0].text,'Keep this');assert.equal(r.storyboard!.comments[0].resolved,true);assert.equal(r.storyboard!.approved,false);assert.equal(r.storyboard!.characters[0].status,'draft');assert.equal(r.storyboard!.images.ref.data,pixel);assert.equal(r.scenes,p.scenes);assert.equal(b.title,'Test');next.revision++;assert.throws(()=>acceptPlanning(exportStoryboard(next),p,b),/outdated/);
});
test('script requires approval and restores source board and known media manifests',()=>{
 const p=project();p.assets.pic={name:'pic.png',data:pixel};const raw=projectManifest(p);raw.title='Generated';raw.storyboard=null;const result=acceptScript(JSON.stringify(raw),p);assert.equal(result.storyboard!.id,p.storyboard!.id);assert.equal(result.storyboard!.approved,true);assert.equal(result.assets.pic.data,pixel);assert.equal(result.title,'Generated');
 const bad=projectManifest(p);bad.assets={new:{name:'not embedded'}};assert.throws(()=>acceptScript(JSON.stringify(bad),p),/unknown media/);
 p.storyboard!.approved=false;assert.throws(()=>requireApprovedBoard(p),/approve/);assert.throws(()=>acceptScript(JSON.stringify(raw),p),/approve/);
});
test('cover changes do not affect approval; sketches invalidate targeted subjects and dependent shots',()=>{
 const p=project(),cover=acceptImage(p,pixel,null);assert.equal(cover.storyboard!.approved,true);assert.equal(cover.thumbnail!.data,pixel);
 const sketch=acceptImage(p,pixel,{kind:'characters',id:'hero'});assert.equal(sketch.storyboard!.approved,false);assert.equal(sketch.storyboard!.characters[0].status,'draft');assert.equal(sketch.storyboard!.shots[0].status,'draft');assert.equal(sketch.storyboard!.revision,p.storyboard!.revision+1);assert.equal(p.storyboard!.approved,true);assert.deepEqual(sketch.storyboard!.comments,p.storyboard!.comments);
});
test('raster references keep IDs and are bounded',()=>{
 const p=project();assert.deepEqual(boardReferences(p.storyboard),[{id:'ref',data:pixel}]);for(let i=0;i<8;i++)p.storyboard!.images['i'+i]={name:'x',data:pixel};assert.throws(()=>boardReferences(p.storyboard),/maximum/);
});

test('AI reply language is fixed by the UI locale, with independent video language and unchanged JSON syntax',async()=>{
 const {aiLanguageInstruction}=await import('../src/lib/ai-language.ts');
 for(const [code,name]of [['en','English'],['de','German'],['es','Spanish'],['fr','French']]){const instruction=aiLanguageInstruction(code);assert.ok(instruction.startsWith(`App reply language: ${name} (${code}).`));assert.match(instruction,/comment.reply/);assert.match(instruction,/video\/content language separate/);assert.match(instruction,/Never translate JSON property names/);assert.match(instruction,/Do not translate existing user-written/);}
 assert.equal(aiLanguageInstruction('de-DE'),aiLanguageInstruction('de'));assert.equal(aiLanguageInstruction('unknown'),aiLanguageInstruction('en'));
});


test('cover and sketch generation retain the explicitly chosen video language',()=>{
 const p=project();p.storyboard!.language='English';
 for(const target of [null,{kind:'characters' as const,id:'hero'}])assert.match(imagePrompt(p,target,''),/"language":"English"/);
});


test('new planning boards inherit app language without changing existing storyboard language',async()=>{
 const {videoLanguageForLocale,videoLanguageOptions}=await import('../src/lib/video-languages.ts');
 for(const [locale,language]of [['en','English'],['de','German'],['es','Spanish'],['fr','French']]){const p=project();p.storyboard=null;assert.equal(planningBoard(p,locale).language,language);assert.equal(videoLanguageForLocale(locale),language);}
 const p=project();p.storyboard!.language='Japanese';assert.equal(planningBoard(p,'de').language,'Japanese');
 const options=videoLanguageOptions('de','Deutsch');assert.equal(options.find(([,label])=>label==='Deutsch')?.[0],'Deutsch');assert.equal(options.filter(([,label])=>label==='Deutsch').length,1);assert.ok(videoLanguageOptions('fr','Portuguese (Brazil)').some(([value])=>value==='Portuguese (Brazil)'));assert.ok(videoLanguageOptions('en','').some(([value])=>value===''));assert.equal(videoLanguageForLocale('de-DE'),'German');
});

test('speaker voices resolve stable subject IDs or unique names, with explicit fallback',async()=>{
 const {speechVoice,voiceGender}=await import('../src/lib/voices.ts'),p=project();p.storyboard!.characters[0].voice={provider:'elevenlabs',id:'HeroVoice',name:'Hero'};p.storyboard!.settings=[{id:'set',name:'Narrator',description:'',image:null,comments:[],status:'draft',voice:{provider:'elevenlabs',id:'StageVoice',name:'Stage'}}];
 assert.equal(speechVoice(p.storyboard,'hero','Fallback'),'HeroVoice');assert.equal(speechVoice(p.storyboard,'Hero','Fallback'),'HeroVoice');assert.equal(speechVoice(p.storyboard,'set',''),'StageVoice');assert.equal(speechVoice(p.storyboard,'Other','Fallback'),'Fallback');assert.throws(()=>speechVoice(p.storyboard,'Other',''),/assign/);
 p.storyboard!.settings[0].name='Hero';assert.throws(()=>speechVoice(p.storyboard,'Hero','Fallback'),/ambiguous/);assert.equal(speechVoice(p.storyboard,'hero','Fallback'),'HeroVoice');p.storyboard!.settings[0].id='hero';assert.throws(()=>speechVoice(p.storyboard,'hero','Fallback'),/ambiguous/);assert.equal(speechVoice(p.storyboard,'characters:hero',''),'HeroVoice');assert.equal(speechVoice(p.storyboard,'settings:hero',''),'StageVoice');assert.equal(voiceGender('neutral'),'neutral');assert.equal(voiceGender('not set'),'unknown');
});

test('reference prompts isolate a character, object or setting instead of requesting a full storyboard',()=>{
 const p=project(),b=p.storyboard!;b.story='UNRELATED_WHOLE_PLOT';b.title='UNRELATED_PROJECT_HEADING';
 b.characters.push({id:'prop',kind:'object',name:'PROP_NAME',description:'PROP_VISUAL',comments:[],image:null,status:'draft'});
 b.settings=[{id:'place',name:'PLACE_NAME',description:'PLACE_VISUAL',comments:[],image:null,status:'draft'}];
 b.shots[0].action='UNRELATED_SCENE_ACTION';b.shots[0].audio='AUDIO_NOT_FOR_IMAGE';
 b.characters[0].comments=[{id:'detail',text:'Copper eyes',reply:'Keep both eyes visible',resolved:true}];
 const hero=imagePrompt(p,{kind:'characters',id:'hero'},'Use soft light');
 for(const text of ['ONLY the selected character','One character, one pose, one view','Robot','Copper eyes','Keep both eyes visible','Use soft light','No panels','no captions'])assert.ok(hero.toLowerCase().includes(text.toLowerCase()),text);
 for(const text of ['UNRELATED_WHOLE_PLOT','UNRELATED_PROJECT_HEADING','UNRELATED_SCENE_ACTION','AUDIO_NOT_FOR_IMAGE','PROP_VISUAL','PLACE_VISUAL','base64','approved','voice'])assert.ok(!hero.includes(text),text);
 const object=imagePrompt(p,{kind:'characters',id:'prop'},'');assert.match(object,/ONLY the selected object/);assert.match(object,/PROP_VISUAL/);assert.doesNotMatch(object,/Robot|PLACE_VISUAL/);
 const setting=imagePrompt(p,{kind:'settings',id:'place'},'');assert.match(setting,/ONLY the selected setting/);assert.match(setting,/PLACE_VISUAL/);assert.doesNotMatch(setting,/Robot|PROP_VISUAL|UNRELATED_SCENE_ACTION/);
});
test('scene reference includes just the selected moment and its linked subjects, without audio or other scenes',()=>{
 const p=project(),b=p.storyboard!;b.story='WHOLE_PLOT_NOT_NEEDED';b.characters.push({id:'other',kind:'character',name:'OTHER_CHARACTER',description:'Not present',image:null,status:'draft',comments:[]});
 b.settings=[{id:'linked',name:'Hangar',description:'HANGAR_VISUAL',image:null,status:'draft',comments:[]},{id:'unrelated',name:'UNRELATED_PLACE',description:'Not here',image:null,status:'draft',comments:[]}];
 b.shots[0].settings=['linked'];b.shots[0].audio='UNRELATED_AUDIO';b.shots.push({...b.shots[0],id:'other-shot',action:'OTHER_SCENE_ACTION'});
 const prompt=imagePrompt(p,{kind:'shots',id:'shot'},'');
 for(const text of ['ONE single-frame','Robot','HANGAR_VISUAL','Move','Wide'])assert.ok(prompt.includes(text),text);
 for(const text of ['OTHER_CHARACTER','OTHER_SCENE_ACTION','UNRELATED_AUDIO','UNRELATED_PLACE','WHOLE_PLOT_NOT_NEEDED','base64'])assert.ok(!prompt.includes(text),text);
 assert.throws(()=>imagePrompt(p,{kind:'characters',id:'missing'},''),/missing image target/);
});
test('image language guidance does not request planning text or JSON replies',async()=>{
 const {aiImageLanguageInstruction}=await import('../src/lib/ai-language.ts');
 for(const [locale,name]of [['de','German'],['en','English'],['es','Spanish'],['fr','French']]){
  const text=aiImageLanguageInstruction(locale);assert.ok(text.includes(name));assert.match(text,/Produce an image, not a written reply/);assert.match(text,/specified video\/content language/);assert.doesNotMatch(text,/comment.reply|Always write AI-authored replies/);
 }
});

test('AI elapsed time uses whole seconds, includes hours and clamps negative durations',async()=>{
 const {elapsedTime}=await import('../src/scripts/ai-progress.ts');
 for(const [ms,expected]of [[0,'00:00'],[999,'00:00'],[1000,'00:01'],[65000,'01:05'],[3599999,'59:59'],[3600000,'01:00:00'],[3661000,'01:01:01'],[-1000,'00:00']] as const)assert.equal(elapsedTime(ms),expected);
});

test('setting prompts include only fixed equipment and explicitly prohibit actors, while scene prompts retain equipment',()=>{
 const p=project(),b=p.storyboard!;
 b.characters.push({id:'machine',kind:'object',name:'Return machine',description:'Grey front with a turquoise frame',image:'ref',status:'approved',comments:[]});
 b.settings=[{id:'market',name:'Return area',description:'Customer in front of the machine',objects:['machine'],image:null,status:'draft',comments:[]}];b.shots[0].settings=['market'];
 const setting=imagePrompt(p,{kind:'settings',id:'market'},'');
 assert.match(setting,/Grey front with a turquoise frame/);assert.match(setting,/NO people, customers, actors/);assert.doesNotMatch(setting,/"name":"Hero"/);
 assert.match(imagePrompt(p,{kind:'shots',id:'shot'},''),/Grey front with a turquoise frame/);
});
test('image references select related identities/equipment only, deduplicate images and bound uploads',async()=>{
 const {imageGenerationReferences}=await import('../src/lib/storyboard-image-references.ts');
 const p=project(),b=p.storyboard!;b.images.machine={name:'Machine.png',data:pixel};b.images.place={name:'Place.png',data:pixel};b.images.other={name:'Other.png',data:pixel};
 b.characters.push({id:'machine',kind:'object',name:'Return machine',description:'Grey',image:'machine',status:'approved',comments:[]},{id:'other',kind:'character',name:'Unrelated',description:'Not in shot',image:'other',status:'draft',comments:[]});
 b.settings=[{id:'market',name:'Market',description:'Bright',objects:['machine'],image:'place',status:'draft',comments:[]}];b.shots[0].settings=['market'];
 assert.deepEqual(imageGenerationReferences(p,{kind:'settings',id:'market'}).map(r=>r.imageId),['machine']);
 assert.deepEqual(imageGenerationReferences(p,{kind:'characters',id:'hero'}).map(r=>r.imageId),['ref']);
 const scene=imageGenerationReferences(p,{kind:'shots',id:'shot'});assert.deepEqual(scene.map(r=>r.imageId),['ref','place','machine']);assert.ok(!JSON.stringify(scene).includes('Unrelated'));
 b.characters[1].image='ref';assert.deepEqual(imageGenerationReferences(p,{kind:'shots',id:'shot'}).find(r=>r.imageId==='ref')!.subjects.map(s=>s.id),['hero','machine']);
 assert.deepEqual(imageGenerationReferences(p,null),[]);
 b.images.ref.data='data:image/png;base64,'+'A'.repeat(7*1024*1024);assert.equal(imageGenerationReferences(p,{kind:'characters',id:'hero'})[0].data,b.images.ref.data);
});

test('reference count limit remains explicit instead of silently dropping identities',async()=>{
 const {imageGenerationReferences}=await import('../src/lib/storyboard-image-references.ts');const p=project(),b=p.storyboard!;
 for(let i=0;i<9;i++){b.images['extra'+i]={name:'Extra.png',data:pixel};b.characters.push({id:'extra'+i,kind:'character',name:'Extra '+i,description:'Test',image:'extra'+i,status:'draft',comments:[]});b.shots[0].characters.push('extra'+i);}
 assert.throws(()=>imageGenerationReferences(p,{kind:'shots',id:'shot'}),/maximum 8 images/);
});

test('script results can promote explicitly declared storyboard image manifests into render assets',()=>{
 const p=project(),original=JSON.stringify(p),raw=structuredClone(projectManifest(p));
 raw.assets={ref:{name:'ref.png'}};raw.scenes[0].backgroundAsset='ref';raw.thumbnail={name:'ref.png'};
 const result=acceptScript(JSON.stringify(raw),p);
 assert.equal(result.assets.ref.data,pixel);assert.equal(result.scenes[0].backgroundAsset,'ref');assert.equal(result.thumbnail!.data,pixel);
 assert.deepEqual(JSON.parse(JSON.stringify(result.storyboard)),JSON.parse(JSON.stringify(p.storyboard)));assert.equal(JSON.stringify(p),original);
 const audio=projectManifest(p);audio.audios={ref:{name:'ref.png'}};assert.throws(()=>acceptScript(JSON.stringify(audio),p),/audios: unknown media manifest/);
 const unknown=projectManifest(p);unknown.assets={unknown:{name:'ref.png'}};assert.throws(()=>acceptScript(JSON.stringify(unknown),p),/assets: unknown media manifest unknown/);
});
test('project assets and cover take priority over colliding storyboard image manifests',()=>{
 const p=project();p.storyboard!.images.ref.data='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');p.assets.ref={name:'Canonical.png',data:pixel};p.thumbnail={name:'Cover.png',data:pixel};
 const raw=projectManifest(p);raw.assets={ref:{name:'Wrong name.png'}};raw.thumbnail={name:'ref.png'};
 const result=acceptScript(JSON.stringify(raw),p);assert.equal(result.assets.ref.name,'Canonical.png');assert.equal(result.thumbnail!.name,'Cover.png');
});
test('thumbnail manifests reject unknown or ambiguous names instead of choosing an arbitrary image',()=>{
 const p=project();p.storyboard!.images.second={name:'ref.png',data:pixel};
 const raw=projectManifest(p);raw.thumbnail={name:'ref.png'};assert.throws(()=>acceptScript(JSON.stringify(raw),p),/ambiguous media manifest name/);
 raw.thumbnail={name:'Missing.png'};assert.throws(()=>acceptScript(JSON.stringify(raw),p),/unknown manifest/);
});

test('production review flags slides in place of 3D, omitted sound and separately pending audio work',async()=>{
 const {reviewProduction,productionInstructions}=await import('../src/lib/production-review.ts');
 const p=project(),b=p.storyboard!;b.production={renderMode:'3d',dialogue:true,music:true,sfx:true};
 let issues=reviewProduction(p);for(const code of ['missing3d','missingDialogue','missingMusic','sfxPlanMissing'])assert.ok(issues.some(i=>i.code===code),code);
 b.shots[0].soundEffects=['Short warning beep','Coffee pouring'];
 const {defaultNarration}=await import('../src/lib/audio.ts');p.scenes[0].narration={...defaultNarration(),text:'Break time?',speaker:'hero'};
 issues=reviewProduction(p);assert.ok(issues.some(i=>i.code==='speechPending'&&i.pending));assert.equal(issues.filter(i=>i.code==='sfxPending').length,2);assert.ok(!issues.some(i=>i.code==='missingDialogue'));
 const instructions=productionInstructions(b);for(const text of ['real 3D','NOT flat scene replacements','Scene.narration.text','enabled Project.music','no automatic SFX'])assert.ok(instructions.includes(text),text);
});
test('native animated 3D with camera movement and music satisfies structural checks',async()=>{
 const {reviewProduction}=await import('../src/lib/production-review.ts');
 const {defaultCharacter3D,defaultStage3D,defaultActor3D,defaultStageCamera3D}=await import('../src/lib/stage3d.ts');
 const {defaultMusic}=await import('../src/lib/music.ts');const {validateProject}=await import('../src/lib/model.ts');
 const p=project();p.storyboard!.production={renderMode:'3d',dialogue:false,music:true,sfx:false};
 p.characters.hero=defaultCharacter3D();p.stages.room=defaultStage3D();const actor=defaultActor3D('hero');actor.toX=2;actor.action='walk';
 p.scenes[0].stage3d={stage:'room',actors:[actor],camera:{...defaultStageCamera3D(),orbit:10}};p.music=defaultMusic();
 assert.deepEqual(reviewProduction(validateProject(p)),[]);
 p.scenes[0].stage3d!.actors[0].action='idle';p.scenes[0].stage3d!.actors[0].toX=0;p.scenes[0].stage3d!.camera.orbit=0;
 const codes=reviewProduction(validateProject(p)).map(i=>i.code);assert.ok(codes.includes('missingMotion'));assert.ok(codes.includes('missingCamera'));
 p.music!.instruments.forEach(i=>i.volume=0);assert.ok(reviewProduction(validateProject(p)).some(i=>i.code==='missingMusic'));
 p.storyboard!.production!.renderMode='2d';assert.ok(reviewProduction(validateProject(p)).some(i=>i.code==='unexpected3d'));

});

import {roundedHumanModel} from '../src/lib/rounded-human.ts';
import {defaultBoardDesign} from '../src/lib/storyboard-design.ts';
test('approved storyboard models replace AI redesigns under stable render resource IDs',()=>{
 const p=project();for(const s of [...p.storyboard!.characters,...p.storyboard!.settings,...p.storyboard!.shots])s.status='approved';p.storyboard!.approved=true;
 const subject=p.storyboard!.characters[0];subject.design={...defaultBoardDesign(),mode:'3d'};subject.model3d=roundedHumanModel();
 const raw=JSON.parse(JSON.stringify(p));raw.characters={[subject.id]:{name:'AI replacement',model:{parts:[{id:'block'}]}}};
 const next=acceptScript(JSON.stringify(raw),p);assert.equal(next.characters[subject.id].name,subject.name);assert.deepEqual(next.characters[subject.id].model,subject.model3d);assert.deepEqual(JSON.parse(JSON.stringify(next.storyboard)),JSON.parse(JSON.stringify(p.storyboard)));
});

test('script generation restores publication profiles and both covers from local data',()=>{
 const p=project();p.thumbnail={name:'youtube.png',data:pixel};p.publishing=publishingFor(p);p.publishing.youtube.title='Prepared publication title';p.publishing.tiktok.cover={name:'tiktok.png',data:pixel};
 const manifest=projectManifest(p);assert.equal(JSON.stringify(manifest).includes('base64'),false);
 const incoming={...manifest,publishing:undefined},result=acceptScript(JSON.stringify(incoming),p);assert.deepEqual(result.publishing,p.publishing);assert.deepEqual(result.thumbnail,p.thumbnail);
});
