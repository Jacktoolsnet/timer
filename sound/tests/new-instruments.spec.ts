import {test,expect} from '@playwright/test';
import {instrumentIds,instrumentNames} from '../src/lib/instruments';
import {presets} from '../src/lib/presets';
import {melodicSemitones} from '../src/lib/harmony';
import {jazzSemitones} from '../src/lib/jazz-harmony';
import {stereoPosition} from '../src/lib/space';
import {dialogueInstrument} from '../src/lib/expression';
test('new instruments are translated and belong to suitable style palettes',()=>{
 for(const names of Object.values(instrumentNames)){
  expect(names).toHaveLength(instrumentIds.length);
  expect(new Set(names).size).toBe(instrumentIds.length);
 }
 expect(presets.jazz.parts.some(p=>p.instrument==='saxophone')).toBe(true);
 expect(presets.classical.parts.some(p=>p.instrument==='harp')).toBe(true);
 expect(presets.coffeehouse.parts.some(p=>p.instrument==='epiano')).toBe(true);
 expect(presets.jazz.parts.some(p=>p.instrument==='doublebass')).toBe(true);
});
test('double bass retains bass harmony and central foundation role',()=>{
 const motif=[0,1,2,1,0,2,1,0];
 for(let beat=0;beat<16;beat++){
  expect(melodicSemitones('coffeehouse',2,beat,'doublebass',2,motif)).toBe(melodicSemitones('coffeehouse',2,beat,'bass',2,motif));
  expect(jazzSemitones(2,beat,'doublebass',2,motif)).toBe(jazzSemitones(2,beat,'bass',2,motif));
 }
 expect(dialogueInstrument('doublebass')).toBe(false);
 expect(stereoPosition('doublebass',2,4,1)).toBe(0);
});
