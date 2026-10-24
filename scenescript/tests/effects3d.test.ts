import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseModel3D} from '../src/lib/model3d.ts';
import {parseProject,validateProject} from '../src/lib/model.ts';
import {effectState3D,effectDebrisState3D,effectRandom3D,defaultEffect3D} from '../src/lib/effects3d.ts';
import {export3DResource,parse3DResource} from '../src/lib/stage3d.ts';
const model=()=>({parts:[{id:'body',shape:'group'},{id:'cover',parent:'body'},{id:'other'}],effectSites:[{id:'engine',part:'body',radius:.4,debris:['cover']}]});
const raw=()=>({version:'1.0',title:'Generic damage',format:'landscape',characters:{thing:{model:model()}},stages:{room:{model:model()}},scenes:[{id:'s',duration:5,elements:[],stage3d:{stage:'room',actors:[{id:'one',character:'thing'}],effects:[{site:'engine',kind:'burn',at:1,duration:1,result:'char'},{actor:'one',site:'engine',kind:'explode',at:3,result:'break'}]}}]});
test('effect sites and scene events roundtrip, reference stage or actors and travel in resource bundles',()=>{
 const project=parseProject(JSON.stringify(raw()));assert.deepEqual(validateProject(project),project);
 assert.equal(project.scenes[0].stage3d!.effects![0].actor,'');assert.equal(project.characters.thing.model!.effectSites![0].direction.y,1);
 const bundle=parse3DResource(export3DResource(project,'character','thing'));assert.deepEqual(bundle.definition.model!.effectSites,project.characters.thing.model!.effectSites);
});
test('strict effect fields, references, finite limits and per-shot budgets reject invalid input',()=>{
 for(const change of [
  (p:any)=>p.characters.thing.model.effectSites[0].part='missing',
  (p:any)=>p.characters.thing.model.effectSites[0].debris=['other'],
  (p:any)=>p.characters.thing.model.effectSites[0].debris=['cover','cover'],
  (p:any)=>p.characters.thing.model.effectSites[0].direction={x:0,y:0,z:0},
  (p:any)=>p.characters.thing.model.effectSites[0].radius=Infinity,
  (p:any)=>p.characters.thing.model.effectSites[0].unknown=1,
  (p:any)=>p.characters.thing.model.effectSites.push({...p.characters.thing.model.effectSites[0]}),
  (p:any)=>p.scenes[0].stage3d.effects[0].actor='thing',
  (p:any)=>p.scenes[0].stage3d.effects[0].site='missing',
  (p:any)=>p.scenes[0].stage3d.effects[0].kind='script',
  (p:any)=>p.scenes[0].stage3d.effects[0].result='execute',
  (p:any)=>p.scenes[0].stage3d.effects[0].seed=1.5,
  (p:any)=>p.scenes[0].stage3d.effects[0].intensity=5,
  (p:any)=>p.scenes[0].stage3d.effects[0].duration=0,
  (p:any)=>p.scenes[0].stage3d.effects[0].at=5.1,
  (p:any)=>p.scenes[0].stage3d.effects[0].unknown=1,
  (p:any)=>p.scenes[0].stage3d.effects=Array.from({length:33},()=>({site:'engine'})),
 ]){const p=raw();change(p);assert.throws(()=>validateProject(p),/effect/i);}
 assert.throws(()=>parseModel3D({...model(),effectSites:Array.from({length:33},(_,i)=>({id:'s'+i,part:'body'}))}),/32/);
});
test('damage is absolute-time, persistent after effects, reversible and seeded without history',()=>{
 const event={...defaultEffect3D(),at:2,duration:1,result:'break' as const};
 assert.equal(effectState3D(event,1).result,'none');assert.equal(effectState3D(event,2).result,'break');assert.equal(effectState3D(event,20).result,'break');assert.equal(effectState3D(event,3).active,false);
 const burn={...event,kind:'burn' as const};assert.equal(effectState3D(burn,2.9).result,'none');assert.equal(effectState3D(burn,3).result,'break');
 assert.equal(effectDebrisState3D(burn,2.9).active,false);assert.equal(effectDebrisState3D(burn,3.2).active,true);assert.equal(effectDebrisState3D(burn,4.5).active,false);
 const before=Array.from({length:30},(_,i)=>effectRandom3D(7,i));for(let i=0;i<100;i++)effectRandom3D(999,i);
 assert.deepEqual(Array.from({length:30},(_,i)=>effectRandom3D(7,i)),before);assert.notDeepEqual(Array.from({length:30},(_,i)=>effectRandom3D(8,i)),before);
 const carried={...event,at:-3};assert.equal(effectState3D(carried,0).result,'break');assert.equal(effectState3D(carried,0).active,false);
});
