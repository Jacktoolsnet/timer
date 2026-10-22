import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseProfile3D,profileSample3D} from '../src/lib/profile3d.ts';
import {parseModel3D,modelPose3D,modelRadius3D} from '../src/lib/model3d.ts';
import {parseCharacter3D,export3DResource,parse3DResource,import3DResource} from '../src/lib/stage3d.ts';import {demoProject} from '../src/lib/model.ts';
const shape=()=>({parts:[{id:'area',shape:'profile',size:{x:10,y:8,z:1},profile:{heights:[.8,.9,.7,.8,.6],target:[.2,.4,.1,.3,.1]},joints:[{id:'bend',motion:'morph',axis:'y',min:0,max:1}]}],animations:{bend:{duration:3,tracks:[{joint:'bend',keys:[{at:0,value:0},{at:3,value:1}]}]}}});
test('height profiles and morph joints are strictly bounded, portable and optional for legacy models',()=>{
 const m=parseModel3D(shape())!;assert.deepEqual(parseModel3D(JSON.parse(JSON.stringify(m))),m);assert.equal(m.parts[0].joints[0].value,0);assert.ok(modelRadius3D(m)>=8);
 const mutations=[(s:any)=>delete s.parts[0].profile,(s:any)=>s.parts[0].profile=null,(s:any)=>s.parts[0].profile.heights=[1],(s:any)=>s.parts[0].profile.heights=Array(33).fill(1),(s:any)=>s.parts[0].profile.target=[1,0],(s:any)=>s.parts[0].profile.heights[0]=1.01,(s:any)=>s.parts[0].profile.target[0]=-1,(s:any)=>s.parts[0].profile.heights[0]=NaN,(s:any)=>s.parts[0].profile.code='bad',(s:any)=>s.parts[0].joints[0].axis='x',(s:any)=>s.parts[0].joints[0].min=-1,(s:any)=>s.parts[0].joints[0].max=2,(s:any)=>s.parts[0].shape='box',(s:any)=>s.parts[0].instances=[{}]];
 for(const mutate of mutations){const s:any=shape();mutate(s);assert.throws(()=>parseModel3D(s));}
 const flat=parseProfile3D({heights:[0,1]},'profile','profile')!;assert.deepEqual(flat.target,[0,1]);assert.notEqual(flat.heights,flat.target);assert.ok(!Object.hasOwn(parseModel3D({parts:[{id:'legacy'}]})!.parts[0],'profile'));
 const p=demoProject();p.characters.area=parseCharacter3D({model:m});const bundle=export3DResource('character','area',p);assert.deepEqual(parse3DResource(JSON.stringify(bundle)),bundle);assert.deepEqual(import3DResource(bundle,demoProject(),'copy').characters.area,p.characters.area);
});
test('smooth profiles interpolate endpoints, preserve bounds and C1 tangents without overshoot',()=>{
 const p=parseProfile3D({heights:[.8,.9,.7,.8,.6],target:[.2,.4,.1,.3,.1]},'profile','profile')!;
 for(const q of [0,.1,.5,.9,1]){const controls=p.heights.map((v,i)=>v+(p.target[i]-v)*q);for(let i=0;i<controls.length;i++)assert.ok(Math.abs(profileSample3D(p,i/(controls.length-1),q).height-controls[i])<1e-12);
  for(let i=0;i<1000;i++){const x=i/1000,k=Math.min(controls.length-2,Math.floor(x*(controls.length-1))),s=profileSample3D(p,x,q);assert.ok(s.height>=Math.min(controls[k],controls[k+1])-1e-12&&s.height<=Math.max(controls[k],controls[k+1])+1e-12);assert.ok(Number.isFinite(s.derivative));}
  for(let i=1;i<controls.length-1;i++){const x=i/(controls.length-1),left=profileSample3D(p,x-1e-8,q),right=profileSample3D(p,x+1e-8,q);assert.ok(Math.abs(left.height-right.height)<1e-6);assert.ok(Math.abs(left.derivative-right.derivative)<1e-5);}
 }
 const model=parseModel3D(shape())!,motions=[{animation:'bend',at:0,duration:3,speed:1,blend:0,loop:false}];const frame=modelPose3D(model,{},motions,1);for(const t of [2,0,3,1.7])modelPose3D(model,{},motions,t);assert.deepEqual(modelPose3D(model,{},motions,1),frame);
});
