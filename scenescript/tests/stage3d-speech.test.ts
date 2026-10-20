import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyseSpeechEnvelope,speechEnvelopeAt} from '../src/lib/speech-envelope.ts';
import {actor3DMouth,speech3DClip} from '../src/lib/stage3d-speech.ts';
import {defaultNarration} from '../src/lib/audio.ts';
import {validateProject,parseProject} from '../src/lib/model.ts';
import {stage3DExample} from '../src/lib/stage3d-example.ts';
import {facePixel3D} from '../src/lib/stage3d-face.ts';
import {actor3DFace} from '../src/lib/stage3d.ts';
function pcm(antiPhase=false){
 const a=Float32Array.from({length:4000},(_,i)=>i>=500&&i<2000?.25*Math.sin(i*.3):0),b=Float32Array.from(a,v=>antiPhase?-v:v);
 return {length:a.length,sampleRate:1000,numberOfChannels:2,getChannelData:(channel:number)=>channel?b:a};
}
function project(){
 const p=validateProject(stage3DExample);p.audios.voice={name:'voice.wav',data:'data:audio/wav;base64,AAAA',duration:20};
 p.scenes[0].narration={...defaultNarration(),asset:'voice',at:1,start:2,end:5};
 p.scenes[0].stage3d!.actors[0].speech={source:'scene',strength:1};
 return p;
}
test('speech analysis gates silence, preserves antiphase stereo and creates a compact envelope',()=>{
 const envelope=analyseSpeechEnvelope(pcm()),opposite=analyseSpeechEnvelope(pcm(true));
 assert.equal(envelope.levels.length,200);assert.equal(envelope.levels.byteLength,800);
 assert.equal(speechEnvelopeAt(envelope,.2),0);assert.ok(speechEnvelopeAt(envelope,1)>.9);
 assert.equal(speechEnvelopeAt(envelope,3.5),0);assert.deepEqual(opposite,envelope);
 for(const t of [-1,4,Infinity,NaN])assert.equal(speechEnvelopeAt(envelope,t),0);
 assert.ok(speechEnvelopeAt(envelope,.51)<speechEnvelopeAt(envelope,.7));
 assert.ok(speechEnvelopeAt(envelope,2.01)>speechEnvelopeAt(envelope,2.1));
 const noise=pcm();noise.getChannelData=()=>new Float32Array(4000).fill(.004);
 assert.ok(analyseSpeechEnvelope(noise).levels.every(v=>v===0));
});
test('speech binding validates strictly, defaults off, and roundtrips without an audio file',()=>{
 const p:any=project(),a=p.scenes[0].stage3d.actors[0];delete a.speech;
 assert.equal(validateProject(p).scenes[0].stage3d!.actors[0].speech,null);
 a.speech={};assert.deepEqual(validateProject(p).scenes[0].stage3d!.actors[0].speech,{source:'scene',strength:1});
 a.speech={source:'project',strength:3};assert.deepEqual(parseProject(JSON.stringify(p)),validateProject(p));
 for(const speech of [false,[],42,{source:null},{source:'voice'},{strength:null},{strength:-1},{strength:3.01},{strength:NaN},{asset:'voice'}]){
  a.speech=speech;assert.throws(()=>validateProject(p),/speech/);
 }
 const waiting=validateProject(stage3DExample);assert.equal(waiting.scenes[0].stage3d!.actors[0].speech!.source,'scene');assert.equal(waiting.scenes[0].narration!.asset,'');
});
test('mouth sampling respects scene narration trim, timing, gain, fades and mute independently of actions',()=>{
 const p=project(),shot=p.scenes[0].stage3d!,actor=shot.actors[0],levels=new Map([['voice',{rate:50,duration:20,levels:new Float32Array(1000).fill(.8)}]]);
 assert.equal(actor3DMouth(p,shot,actor,.99,levels),0);assert.ok(actor3DMouth(p,shot,actor,1.5,levels)>.79);assert.equal(actor3DMouth(p,shot,actor,4,levels),0);
 p.scenes[0].narration!.volume=.5;assert.ok(Math.abs(actor3DMouth(p,shot,actor,1.5,levels)-.4)<1e-6);
 p.scenes[0].narration!.fadeIn=1;p.scenes[0].narration!.fadeOut=1;assert.ok(Math.abs(actor3DMouth(p,shot,actor,1.5,levels)-.2)<1e-6);assert.ok(Math.abs(actor3DMouth(p,shot,actor,3.5,levels)-.2)<1e-6);
 p.scenes[0].narration!.muted=true;assert.equal(actor3DMouth(p,shot,actor,2,levels),0);p.scenes[0].narration!.muted=false;
 actor.speech!.strength=0;assert.equal(actor3DMouth(p,shot,actor,2,levels),0);actor.speech!.strength=3;assert.ok(actor3DMouth(p,shot,actor,2,levels)>.99);
 assert.equal(actor3DMouth(p,shot,actor,2,new Map()),0);
 p.scenes[0].narration={...defaultNarration(),asset:'voice',end:10};actor.speech!.strength=1;
 assert.ok(actor3DMouth(p,shot,actor,6,levels)>.79);assert.equal(actor3DMouth(p,shot,actor,7,levels),0);
 p.scenes[0].narration!.asset='';assert.equal(speech3DClip(p,shot,actor),null);
});
test('project narration follows global time across scenes, including trim, pauses and boundaries',()=>{
 const p=project();p.narration={...defaultNarration(),asset:'voice',at:6,start:1,end:5};
 const shot=p.scenes[1].stage3d!,actor=shot.actors[1];actor.speech={source:'project',strength:1};
 const envelope={rate:50,duration:20,levels:new Float32Array(1000)};envelope.levels.fill(1,100,150);const levels=new Map([['voice',envelope]]);
 // Second scene starts at project time 7; local .5 samples file 2.5.
 assert.equal(actor3DMouth(p,shot,actor,.5,levels),1);assert.equal(actor3DMouth(p,shot,actor,2,levels),0);assert.equal(actor3DMouth(p,shot,actor,3,levels),0);
 assert.equal(actor3DMouth(p,shot,actor,-.1,levels),0);assert.equal(actor3DMouth(p,shot,actor,6,levels),0);
 const sample=actor3DMouth(p,shot,actor,.5,levels);for(const t of [5,0,3])actor3DMouth(p,shot,actor,t,levels);assert.equal(actor3DMouth(p,shot,actor,.5,levels),sample);
 p.narration.volume=0;assert.equal(actor3DMouth(p,shot,actor,.5,levels),0);
});
test('speech changes only pixel mouth cells, retaining emotional eyes and blinking',()=>{
 const p=project(),actor=p.scenes[0].stage3d!.actors[0];actor.expressions=[];
 const face=actor3DFace(actor,0,'angry');for(let row=0;row<4;row++)for(let col=0;col<12;col++)assert.equal(facePixel3D(face,row,col,1),facePixel3D(face,row,col,0));
 let changed=false;for(let row=4;row<8;row++)for(let col=0;col<12;col++)changed ||=facePixel3D(face,row,col,1)!==facePixel3D(face,row,col,0);assert.ok(changed);
});
