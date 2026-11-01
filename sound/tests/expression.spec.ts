import {test,expect} from '@playwright/test';
import {dialogueInstrument,answerMotif,dialogueGain,timbreMotion} from '../src/lib/expression';

test('conversation leaves percussion, bass and sustained harmony alone',()=>{
 for(const id of ['kick','hat','bass','synthbass','pad','strings','organ'])expect(dialogueInstrument(id)).toBe(false);
 for(const id of ['piano','guitar','marimba','bells'])expect(dialogueInstrument(id)).toBe(true);
});
test('answer preserves drawn phrases and follows a changed question gently',()=>{
 const own=[1,2,3,2,1,2,3,2],question=[0,1,0,1,0,1,0,4];
 const answer=answerMotif(own,question);
 expect(answer.slice(0,7)).toEqual(own.slice(0,7));
 expect(answer[7]).toBe(3);expect(own[7]).toBe(2);
 question[7]=0;expect(answerMotif(own,question)[7]).toBe(1);
 own[2]=4;expect(answerMotif(own,question)[2]).toBe(4);
});
test('conversation alternates gently without silence or amplification',()=>{
 expect(dialogueGain(0,0)).toBeGreaterThan(dialogueGain(0,1));
 expect(dialogueGain(2,1)).toBeGreaterThan(dialogueGain(2,0));
 for(let bar=0;bar<8;bar+=.125){
  for(const role of [0,1]){
   const gain=dialogueGain(bar,role);
   expect(gain).toBeGreaterThanOrEqual(.48);expect(gain).toBeLessThanOrEqual(1);
   expect(Math.abs(gain-dialogueGain(bar+.01,role))).toBeLessThan(.01);
  }
 }
});
test('timbre breathes smoothly within a restrained range for all tracks',()=>{
 for(let i=0;i<8;i++)for(let bar=0;bar<32;bar+=.5){
  const a=timbreMotion(bar,1.2,i),b=timbreMotion(bar+.01,1.2,i);
  expect(a.cutoff).toBeGreaterThan(.85);expect(a.cutoff).toBeLessThan(1.17);
  expect(a.attack).toBeGreaterThanOrEqual(.88);expect(a.attack).toBeLessThanOrEqual(1.12);
  expect(Math.abs(a.cutoff-b.cutoff)).toBeLessThan(.001);
 }
});
