import {speechJobs,matchSpeechFiles,speechJobText,attachSpeechFiles,fitSpeechDurations,sceneSpeechMinimum} from '../src/lib/speech-jobs.ts';
import {textZip,crc32} from '../src/lib/text-zip.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultNarration,parseNarration,validateAudioData,narrationClips,narrationGain,duckGain} from '../src/lib/audio.ts';
import {demoProject,parseProject} from '../src/lib/model.ts';
const asset={name:'voice.wav',data:'data:audio/wav;base64,AAAA',duration:2};
test('audio namespaces, legacy defaults and settings round trip',()=>{const p=demoProject();p.audios={voice:asset};p.narration={...defaultNarration(),asset:'voice',at:1,start:.25,end:1.5,text:'Hello'};p.scenes[0].narration={...defaultNarration(),asset:'voice'};const q=parseProject(JSON.stringify(p));assert.deepEqual(q.narration,p.narration);assert.deepEqual(q.audios.voice,asset);const old=JSON.parse(JSON.stringify(demoProject()));delete old.audios;delete old.narration;delete old.audioDucking;old.scenes.forEach((s:any)=>delete s.narration);const n=parseProject(JSON.stringify(old));assert.equal(n.narration,null);assert.equal(n.scenes[0].narration,null);assert.equal(n.audioDucking,false);});
test('strict audio validation and null rules',()=>{assert.equal(parseNarration(null,{},5),null);assert.deepEqual(parseNarration({}, {},5),defaultNarration());for(const raw of [{asset:'missing'},{at:6},{start:2},{start:-1},{end:0},{end:3},{volume:2},{volume:'1'},{muted:null},{at:null},{text:null},{fadeIn:-1},{loop:true}])assert.throws(()=>parseNarration({asset:'voice',...raw},{voice:asset},5));for(const data of ['https://example.com/a.mp3','data:audio/wav;base64,','data:audio/wav;base64,AAA','data:audio/mpegurl;base64,AAAA'])assert.throws(()=>validateAudioData(data));const p=demoProject();assert.throws(()=>parseProject(JSON.stringify({...p,audioDucking:null})));assert.throws(()=>parseProject(JSON.stringify({...p,audios:{x:{...asset,extra:1}}})));});
test('scope clips narration and fades without extending scenes',()=>{const p=demoProject();p.audios={voice:asset};p.scenes[0].duration=1;p.narration={...defaultNarration(),asset:'voice'};p.scenes[0].narration={...defaultNarration(),asset:'voice',at:.5,fadeIn:.2,fadeOut:.2};const clips=narrationClips(p);assert.equal(clips[1].duration,.5);assert.equal(narrationGain(clips[1].settings,.1,.5),.5);assert.ok(Math.abs(narrationGain(clips[1].settings,.4,.5)-.5)<1e-8);assert.equal(narrationGain(clips[1].settings,.5,.5),0);});
test('ducking only affects audible assignments and recovers smoothly',()=>{const p=demoProject();p.audios={voice:asset};p.narration={...defaultNarration(),asset:'voice',at:1};p.audioDucking=true;assert.equal(duckGain(p,0),1);assert.ok(Math.abs(duckGain(p,1.5)-.3)<1e-8);assert.ok(duckGain(p,3.15)>.3&&duckGain(p,3.15)<1);assert.equal(duckGain(p,4),1);p.narration.muted=true;assert.equal(duckGain(p,2),1);});

test('speech drafts round trip without audio and validate direction/speaker metadata',()=>{
 const p=demoProject();p.scenes[0].narration={...defaultNarration(),text:'Hello',instructions:'Calm, then pause.',speaker:'Narrator'};const q=parseProject(JSON.stringify(p));assert.deepEqual(q.scenes[0].narration,p.scenes[0].narration);assert.equal(narrationClips(q).length,0);
 for(const v of [{instructions:null},{instructions:1},{instructions:'x'.repeat(5001)},{speaker:null},{speaker:1},{speaker:'x'.repeat(201)}])assert.throws(()=>parseNarration(v,{},5));
});
test('speech filenames are stable across reorder/rename/timing and change with content or voice',async()=>{
 const p=demoProject();for(const s of p.scenes)s.narration={...defaultNarration(),text:'Same text',instructions:'Soft',speaker:'A'};p.narration={...defaultNarration(),text:'Same text',instructions:'Soft',speaker:'A'};
 const a=await speechJobs(p);assert.equal(a.length,3);assert.equal(new Set(a.map(j=>j.stem)).size,3);assert.ok(a.every(j=>/^[a-zA-Z0-9_-]+$/.test(j.stem)&&j.stem.length<200));
 p.title='Renamed';p.scenes.reverse();p.scenes.forEach(s=>{s.name='Renamed';s.duration=10;s.narration!.at=2;});const b=await speechJobs(p);assert.deepEqual(b.map(j=>j.stem).sort(),a.map(j=>j.stem).sort());
 p.scenes[0].narration!.text+='!';assert.notEqual((await speechJobs(p))[1].stem,b[1].stem);p.scenes[0].narration!.text='Same text';p.scenes[0].narration!.instructions='Loud';assert.notEqual((await speechJobs(p))[1].stem,b[1].stem);
 p.scenes[0].narration!.instructions='Soft';p.scenes[0].narration!.speaker='B';assert.notEqual((await speechJobs(p))[1].stem,b[1].stem);p.scenes[0].narration!.text=' \n';assert.equal((await speechJobs(p)).length,2);
});
test('speech matching is exact, extension/case tolerant, rejects duplicates and obsolete files',async()=>{
 const p=demoProject();p.scenes[0].narration={...defaultNarration(),text:'Hello'};const jobs=await speechJobs(p),j=jobs[0];assert.equal(matchSpeechFiles(jobs,[j.audioName])[0],j);assert.equal(matchSpeechFiles(jobs,[j.stem.toUpperCase()+'.WAV'])[0],j);
 for(const names of [[j.stem+' (1).mp3'],['voice.mp3'],[j.textName],[j.audioName,j.stem+'.wav'],['old-'+j.audioName]])assert.throws(()=>matchSpeechFiles(jobs,names));
 p.scenes[0].narration!.text='Other text';assert.throws(()=>attachSpeechFiles(p,jobs,[{name:j.audioName,asset}]),/changed/);
});
test('speech assignment is transactional, grows scenes including offsets, and reimport reuses its asset',async()=>{
 const p=demoProject();p.scenes[0].duration=1;p.scenes[0].narration={...defaultNarration(),text:'Hello',at:.5};const e=p.scenes[0].elements[0];e.at=0;e.animation='none';e.until=.9;p.scenes[0].camera={stations:[{at:0,x:0,y:0,width:100,hold:1,easing:'linear'}]};const before=JSON.stringify(p),jobs=await speechJobs(p);
 const result=attachSpeechFiles(p,jobs,[{name:jobs[0].audioName,asset}]);assert.equal(JSON.stringify(p),before);assert.equal(result.project.scenes[0].duration,2.5);assert.equal(result.project.scenes[1].duration,5);assert.deepEqual(result.project.scenes[0].camera,p.scenes[0].camera);assert.equal(result.project.scenes[0].elements[0].until,.9);assert.deepEqual(result.extended,[p.scenes[0].id]);
 const q=parseProject(JSON.stringify(result.project)),id=q.scenes[0].narration!.asset;assert.equal(narrationClips(q)[0].duration,2);const again=attachSpeechFiles(q,await speechJobs(q),[{name:jobs[0].audioName,asset:{...asset,duration:1}}]);assert.equal(again.project.scenes[0].narration!.asset,id);assert.equal(Object.keys(again.project.audios).length,1);assert.equal(again.project.scenes[0].duration,2.5);
});
test('independent speech reimports do not overwrite shared audio and reset only their own trims',async()=>{
 const p=demoProject();p.audios.shared=asset;p.scenes.forEach(s=>s.narration={...defaultNarration(),asset:'shared',start:.5,end:1,text:s.id,volume:.6});const jobs=await speechJobs(p);
 const q=attachSpeechFiles(p,jobs,[{name:jobs[0].audioName,asset:{...asset,duration:3}}]).project;assert.deepEqual(q.audios.shared,asset);assert.equal(q.scenes[1].narration!.asset,'shared');assert.notEqual(q.scenes[0].narration!.asset,'shared');assert.equal(q.scenes[0].narration!.start,0);assert.equal(q.scenes[0].narration!.end,null);assert.equal(q.scenes[0].narration!.volume,.6);
});
test('duration fitting respects trims, muted tracks and total project scope, with atomic limits',()=>{
 const p=demoProject();p.audios.voice={...asset,duration:12};p.scenes[0].duration=1;p.scenes[0].narration={...defaultNarration(),asset:'voice',at:.5,start:1,end:3,muted:true};p.narration={...defaultNarration(),asset:'voice',at:1};assert.equal(sceneSpeechMinimum(p.scenes[0],p),2.5);assert.deepEqual(fitSpeechDurations(p),['intro','outro']);assert.equal(p.scenes[0].duration,2.5);assert.equal(p.scenes[1].duration,10.5);assert.deepEqual(fitSpeechDurations(p),[]);
 p.narration.at=4000;const before=JSON.stringify(p);assert.throws(()=>fitSpeechDurations(p),/3600/);assert.equal(JSON.stringify(p),before);
});
test('speech text package clearly separates metadata from the script and ZIP has valid UTF-8/CRC records',async()=>{
 const p=demoProject();p.scenes[0].narration={...defaultNarration(),text:'Hallo 😀',instructions:'Whisper',speaker:'A'};const job=(await speechJobs(p))[0];const text=speechJobText(job,{target:'TARGET',scope:'SCOPE',project:'PROJECT',scene:'SCENE',speaker:'VOICE',instructions:'DIRECTION',script:'SCRIPT',hint:'Do not read metadata'});assert.ok(text.includes(job.audioName));assert.ok(text.endsWith('=== SCRIPT ===\nHallo 😀'));
 const zip=textZip([{name:job.textName,text},{name:'ümlaut.txt',text:'äöü 😀'}]),v=new DataView(zip.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint16(6,true),0x800);assert.equal(v.getUint16(8,true),0);const nameLength=v.getUint16(26,true),length=v.getUint32(18,true),data=zip.slice(30+nameLength,30+nameLength+length);assert.equal(new TextDecoder().decode(data),text);assert.equal(v.getUint32(14,true),crc32(data));assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);assert.equal(v.getUint32(zip.length-22,true),0x06054b50);assert.equal(v.getUint16(zip.length-12,true),2);
 assert.throws(()=>textZip([{name:'../x',text:''}]));assert.throws(()=>textZip([{name:'A.txt',text:''},{name:'a.txt',text:''}]));
});

test('speech asset limits and duplicate imports never partially mutate the source project',async()=>{
 const p=demoProject();for(let i=0;i<30;i++)p.audios['a'+i]=asset;p.scenes[0].narration={...defaultNarration(),text:'Hello'};let jobs=await speechJobs(p);const before=JSON.stringify(p);assert.throws(()=>attachSpeechFiles(p,jobs,[{name:jobs[0].audioName,asset}]),/30 audio/);assert.equal(JSON.stringify(p),before);
 p.scenes[0].narration.asset='a0';jobs=await speechJobs(p);assert.equal(Object.keys(attachSpeechFiles(p,jobs,[{name:jobs[0].audioName,asset}]).project.audios).length,30);
 assert.throws(()=>attachSpeechFiles(p,jobs,[{name:jobs[0].audioName,asset},{name:jobs[0].audioName,asset}]),/multiple files/);
});
