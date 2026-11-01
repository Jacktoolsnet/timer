import {test,expect} from '@playwright/test';
import {instrumentFamily} from '../src/lib/articulation';
import {instrumentIds} from '../src/lib/instruments';
import {sustainedInstruments,phraseActive} from '../src/lib/phrasing';
import {sustainedProfile} from '../src/lib/sustained-voice';
test('all instruments have deliberate family-specific articulation',()=>{
 expect(Object.keys(instrumentFamily)).toHaveLength(instrumentIds.length);
 for(const id of instrumentIds)expect(instrumentFamily[id]).toBeTruthy();
 for(const id of ['saxophone','strings','organ','pad'])expect(sustainedInstruments as readonly string[]).toContain(id);
 for(const id of ['kick','piano','guitar','harp','kalimba','bells'])expect(sustainedInstruments as readonly string[]).not.toContain(id);
 expect(sustainedProfile('organ').glide).toBeLessThan(.01);
 expect(sustainedProfile('pad').attack).toBeGreaterThan(sustainedProfile('saxophone').attack);
 expect(sustainedProfile('organ').vibrato).toBe(0);
});
test('saxophone has breathing space without overriding user drawing',()=>{
 expect(phraseActive('saxophone',64,0,false,true,false)).toBe(false);
 expect(phraseActive('saxophone',64,0,false,true,true)).toBe(true);
 expect(phraseActive('saxophone',64,0,false,false,false)).toBe(true);
});
