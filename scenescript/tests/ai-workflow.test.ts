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
