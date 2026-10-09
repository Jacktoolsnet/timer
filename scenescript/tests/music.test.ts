import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultMusic,parseMusic,musicEvents,envelopeAt,musicGainAt,presetInstrument,pitchFrequency} from '../src/lib/music.ts';
import {demoProject,parseProject} from '../src/lib/model.ts';
test('legacy projects remain silent; music round trips',()=>{const p=demoProject();delete (p as any).music;assert.equal(parseProject(JSON.stringify(p)).music,null);p.music=defaultMusic();assert.deepEqual(parseProject(JSON.stringify(p)).music,p.music);});
test('instrument parameters, notes and references validated',()=>{
 const m=defaultMusic();assert.equal(parseMusic(m,20)!.instruments.length,3);
 for(const change of [(x:any)=>x.volume=2,(x:any)=>x.instruments[0].wave='piano',(x:any)=>x.instruments[1].id=x.instruments[0].id,(x:any)=>x.instruments[0].partials=[{ratio:1,gain:0}],(x:any)=>x.instruments[0].echo.feedback=1,(x:any)=>x.notes=[{instrument:'missing',at:0,duration:1,pitch:60}],(x:any)=>x.notes=[{instrument:'pad',at:21,duration:1,pitch:60}],(x:any)=>x.notes=[{instrument:'pad',at:0,duration:1,pitch:60.5}],(x:any)=>x.html='evil']){const changed=structuredClone(m);change(changed);assert.throws(()=>parseMusic(changed,20));}
 m.notes=Array.from({length:33},()=>({instrument:'pad',at:0,duration:1,pitch:60,velocity:.5}));assert.throws(()=>parseMusic(m,20),/overlapping/);
});
test('generated query windows preserve deterministic music and effect tails',()=>{const m=defaultMusic();const all=musicEvents(m,60,0,60);assert.deepEqual(musicEvents(m,60,0,60),all);const later=musicEvents(m,60,10,12);assert(later.some(n=>n.at<10));assert(later.every(n=>all.some(a=>a.eventId===n.eventId&&a.pitch===n.pitch)));m.seed=42;assert.notDeepEqual(musicEvents(m,60,0,60),all);});
test('ADSR, fades and tuning',()=>{const i=presetInstrument();assert.equal(envelopeAt(i,2,0),0);assert.equal(envelopeAt(i,2,i.attack),1);assert.equal(envelopeAt(i,2,2+i.release),0);const m=defaultMusic();assert.equal(musicGainAt(m,0,20),0);assert.equal(musicGainAt(m,20,20),0);assert.equal(musicGainAt(m,10,20),m.volume);assert.equal(pitchFrequency(69),440);});
test('generated music enforces bounded polyphony for long releases',()=>{const m=defaultMusic('uplifting');m.tempo=180;for(const i of m.instruments){i.release=5;i.echo.mix=.5;i.echo.delay=1;}assert.throws(()=>parseMusic(m,120),/overlapping/);});
