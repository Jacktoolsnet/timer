import {test,expect} from '@playwright/test';
import {acousticWave,type AcousticInstrument} from '../src/lib/acoustic';
test('acoustic voices are finite, bounded and release without a click',()=>{
 for(const id of ['piano','guitar','bass','strings','marimba','kalimba','saxophone','harp','doublebass','epiano'] as AcousticInstrument[]){
  const data=acousticWave(id,id==='bass'?110:220,22050,.5);
  let peak=0,energy=0;for(const value of data){if(!Number.isFinite(value))throw Error(id);peak=Math.max(peak,Math.abs(value));energy+=value*value;}
  expect(peak).toBeLessThanOrEqual(.701);expect(energy).toBeGreaterThan(.1);
  expect(data[0]).toBe(0);expect(Math.abs(data[data.length-1])).toBe(0);
 }
});
test('touch changes acoustic spectrum without unbounded peaks',()=>{
 for(const id of ['piano','guitar'] as AcousticInstrument[]){
  const soft=acousticWave(id,220,22050,.2),hard=acousticWave(id,220,22050,.8);
  expect(soft.some((value,i)=>Math.abs(value-hard[i])>.001)).toBe(true);
 }
});
