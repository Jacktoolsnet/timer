import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSimulation,simulationParticles,simulationTypes} from '../src/lib/simulation.ts';
for(const type of simulationTypes)test(type+' trajectories are deterministic, continuous and bounded',()=>{
 const s=defaultSimulation(type),a=simulationParticles(s,1920,1080,5);
 assert.deepEqual(a,simulationParticles(s,1920,1080,5));assert.notDeepEqual(a,simulationParticles(s,1920,1080,6));
 assert.notDeepEqual(a,simulationParticles({...s,seed:2},1920,1080,5));
 const before=simulationParticles(s,1920,1080,4.999),after=simulationParticles(s,1920,1080,5.001);
 for(let i=0;i<a.length;i++){
  const p=a[i];assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.radius)&&Number.isFinite(p.alpha));assert.ok(p.alpha>=0&&p.alpha<=s.opacity);assert.ok(p.y>=0&&p.y<=1080);
  if(before[i].alpha>.1&&after[i].alpha>.1)assert.ok(Math.abs(before[i].y-after[i].y)<1);
 }
 assert.deepEqual(simulationParticles(s,1920,1080,-1),simulationParticles(s,1920,1080,0));
});

test('effect switching uses matching size presets and preserves custom settings',async()=>{
 const {switchSimulationType,parseSimulation}=await import('../src/lib/simulation.ts');
 assert.equal(switchSimulationType(defaultSimulation(), 'bubbles').size,18);
 assert.equal(switchSimulationType(defaultSimulation('bubbles'), 'snow').size,6);
 assert.equal(switchSimulationType({...defaultSimulation(),size:25,color:'#a81f1f',seed:99}, 'bubbles').size,25);
 assert.equal(switchSimulationType({...defaultSimulation(),color:'#a81f1f',seed:99}, 'bubbles').seed,99);
 assert.equal(parseSimulation({type:'bubbles'},'test')!.size,18);
});
