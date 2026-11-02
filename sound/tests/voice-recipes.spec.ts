import {test,expect} from '@playwright/test';
import {voiceRecipe} from '../src/lib/voice-recipes';
import {sustainedInstruments} from '../src/lib/phrasing';
import {instrumentIds} from '../src/lib/instruments';
import {acousticInstruments} from '../src/lib/acoustic';
test('every remaining instrument has bounded envelopes and a distinct recipe',()=>{
 const signatures=new Set<string>();
 for(const id of instrumentIds.filter(id=>!acousticInstruments.includes(id)&&!(sustainedInstruments as readonly string[]).includes(id))){
  const recipe=voiceRecipe(id,true,.85);expect(recipe.tones.length+recipe.noise.length).toBeGreaterThan(0);
  signatures.add(JSON.stringify(recipe));
  for(const spec of [...recipe.tones,...recipe.noise]){
   expect(spec.level).toBeGreaterThan(0);expect(spec.level).toBeLessThanOrEqual(.3);
   expect(spec.attack!).toBeGreaterThan(0);expect(spec.attack!).toBeLessThan(spec.duration);
  }
  for(const spec of recipe.tones)if(spec.sustain!==undefined){
   expect(spec.sustain).toBeLessThanOrEqual(1);expect(spec.duration-spec.attack!).toBeGreaterThan(id==='pad'?.45:.07);
  }
 }
 expect(signatures.size).toBe(instrumentIds.filter(id=>!acousticInstruments.includes(id)&&!(sustainedInstruments as readonly string[]).includes(id)).length);
});
test('drum attacks, kick pitch drop and shaker onset keep their own character',()=>{
 expect(voiceRecipe('kick',false,1).tones[0].glide).toBeLessThan(.06);
 expect(voiceRecipe('clap',false,1).noise.map(n=>n.offset)).toEqual([0,.012,.026]);
 expect(voiceRecipe('shaker',true,1).noise[0].attack).toBeGreaterThan(voiceRecipe('hat',true,1).noise[0].attack!);
 expect(sustainedInstruments as readonly string[]).toContain('organ');
});


test('kick has a fuller bass body and audible punch without raising its main peak',()=>{
 const kick=voiceRecipe('kick',false,1);
 expect(kick.tones[0].level).toBe(.29);expect(kick.tones[0].endHz).toBe(48);
 expect(kick.tones[1].hz).toBe(65);expect(kick.tones[1].level).toBe(.08);
 expect(kick.tones[1].duration).toBe(.24);
 expect(kick.tones[2].type).toBe('triangle');expect(kick.tones[2].endHz).toBe(110);
 expect(kick.tones.every(t=>t.duration<=.36)).toBe(true);
});
