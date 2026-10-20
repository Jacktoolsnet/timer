import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePaths3D,parsePathMotion3D,samplePath3D,pathMotionFrame3D,vec,dot,cross,sub,eulerFrame3D,type Path3D} from '../src/lib/path3d.ts';
import {cameraPose3D,parseCameraRig3D} from '../src/lib/camera3d.ts';
import {actor3DFrame,defaultActor3D,defaultStageCamera3D,parse3DResource} from '../src/lib/stage3d.ts';
import {validateProject,parseProject} from '../src/lib/model.ts';
import {path3DExample,demoPath3D} from '../src/lib/path3d-example.ts';
const close=(a:number,b:number,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const circle:Path3D={closed:true,interpolation:'smooth',points:Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return vec(3*Math.sin(a),3-3*Math.cos(a),0);})};
const straight:Path3D={closed:false,interpolation:'linear',points:[vec(0,0,0),vec(0,0,1),vec(0,0,10)]};
function project(){return validateProject(path3DExample);}
test('paths validate identifiers, bounds, topology and finite vectors without executing data',()=>{
 assert.equal(parsePaths3D({route:{points:[{}, {z:10}]}}).route.closed,false);
 for(const points of [[],[{}],[{},{y:0}],Array.from({length:129},(_,i)=>({z:i})),[{},{x:101}],[{},{x:null}],[{},{z:NaN}],[{},{wat:1}]])assert.throws(()=>parsePaths3D({route:{points}}));
 assert.throws(()=>parsePaths3D({route:{points:[{}, {z:1},{}],closed:true}}),/omit repeated endpoint/);
 assert.throws(()=>parsePaths3D({route:{points:[{}, {z:1}],closed:true}}));
 assert.throws(()=>parsePaths3D({'bad.id':straight}));assert.throws(()=>parsePaths3D({route:{...straight,script:'no'}}));
 const map=parsePaths3D(JSON.parse('{"__proto__":{"points":[{}, {"z":1}]}}'));assert.ok(Object.hasOwn(map,'__proto__'));assert.equal(Object.getPrototypeOf(map),Object.prototype);
});
test('arc length makes unequal segments traverse at constant speed; open ends clamp',()=>{
 for(const t of [0,.1,.25,.5,.99,1])close(samplePath3D(straight,t).position.z,t*10);
 close(samplePath3D(straight,-1).position.z,0);close(samplePath3D(straight,2).position.z,10);
 close(samplePath3D(straight,.5,2).position.x,2);
});
test('closed vertical-loop frames are orthonormal, continuous and upside-down at the top',()=>{
 close(samplePath3D(circle,.5).position.y,6,1e-4);assert.ok(samplePath3D(circle,.5).up.y<-.999);
 let previous=samplePath3D(circle,0);for(let i=1;i<=400;i++){
  const frame=samplePath3D(circle,i/400);for(const axis of [frame.right,frame.up,frame.forward])close(dot(axis,axis),1);
  close(dot(frame.up,frame.forward),0);close(dot(cross(frame.right,frame.up),frame.forward),1);
  assert.ok(dot(previous.up,frame.up)>.99);assert.ok(dot(previous.forward,frame.forward)>.99);previous=frame;
 }
 for(const t of [0,.17,.5,.99]){const a=samplePath3D(circle,t),b=samplePath3D(circle,t+4);close(distance(a.position,b.position),0);close(distance(a.up,b.up),0);}
});
test('non-planar closed transport corrects its seam without history or camera-dependent state',()=>{
 const route:Path3D={closed:true,interpolation:'smooth',points:[vec(-5,0,0),vec(0,4,4),vec(6,1,0),vec(0,-2,-6)]};
 const a=samplePath3D(route,1-1e-6),b=samplePath3D(route,1e-6);assert.ok(dot(a.up,b.up)>.999);assert.ok(distance(a.position,b.position)<.001);
 const first=samplePath3D(route,.34);samplePath3D(route,.9);assert.deepEqual(samplePath3D(route,.34),first);
});
test('motion has explicit start/laps and holds outside its interval; parallel lanes stay separated',()=>{
 const motion=parsePathMotion3D({path:'route',at:2,duration:4,laps:4},{route:circle},8)!;
 close(distance(pathMotionFrame3D({route:circle},motion,-1).position,pathMotionFrame3D({route:circle},motion,2).position),0);
 close(distance(pathMotionFrame3D({route:circle},motion,9).position,pathMotionFrame3D({route:circle},motion,6).position),0);
 for(const t of [2,2.13,2.5,3.9,6])close(distance(pathMotionFrame3D({route:circle},{...motion,offset:-1},t).position,pathMotionFrame3D({route:circle},{...motion,offset:1},t).position),2);
 for(const value of [{path:'missing',duration:1},{path:'route',duration:9},{path:'route',duration:1,orient:1},{path:'route',duration:1,laps:0},{path:'route',duration:1,start:2}])assert.throws(()=>parsePathMotion3D(value,{route:circle},8));
 assert.throws(()=>parsePathMotion3D({path:'route',duration:1,laps:2},{route:straight},8),/open path/);
});
test('full actor transform preserves legacy XYZ rotation and applies local corrections on paths',()=>{
 const actor={...defaultActor3D('truck'),x:1,y:2,z:3,pitch:35,rotation:48,roll:12};const frame=actor3DFrame(actor,0);assert.deepEqual(frame.position,vec(1,2,3));assert.deepEqual(frame.forward,eulerFrame3D(35*Math.PI/180,48*Math.PI/180,12*Math.PI/180).forward);
 const moving={...defaultActor3D('truck'),path:parsePathMotion3D({path:'loop',duration:4},{loop:circle},4)};
 const top=actor3DFrame(moving,2,[moving],{loop:circle});close(top.position.y,6,1e-4);assert.ok(top.up.y<-.999);
 const fixed=actor3DFrame({...moving,path:{...moving.path!,orient:false}},2,[moving],{loop:circle});assert.deepEqual(fixed.up,vec(0,1,0));close(fixed.position.y,6,1e-4);
});
test('attached cameras share complete actor frames through loops, track cameras stay fixed',()=>{
 const actor={...defaultActor3D('truck'),path:parsePathMotion3D({path:'loop',duration:4},{loop:circle},4)};
 for(const mode of ['chase','onboard','track']){
  const c={...defaultStageCamera3D(),...parseCameraRig3D({follow:{actor:'truck',mode}},4,'camera')},a=cameraPose3D(c,0,()=>actor3DFrame(actor,0,[actor],{loop:circle})),b=cameraPose3D(c,2,()=>actor3DFrame(actor,2,[actor],{loop:circle}));
  if(mode==='track'){assert.deepEqual(a.position,b.position);assert.notDeepEqual(a.target,b.target);}else{assert.ok(b.up.y<-.999);close(distance(sub(b.position,vec(0,6,0)),vec()),distance(a.position,vec()),1e-4);}
 }
});
test('camera keys interpolate positions/look-at/roll, hold ends, and legacy orbit remains identical',()=>{
 const c={...defaultStageCamera3D(),...parseCameraRig3D({keys:[{at:0,position:{z:10},target:{}},{at:4,position:{x:4,z:10},target:{x:4},roll:90}]},4,'camera')};
 close(cameraPose3D(c,2,()=>{throw 0;}).position.x,2);close(cameraPose3D(c,8,()=>{throw 0;}).position.x,4);close(cameraPose3D(c,2,()=>{throw 0;}).up.y,Math.SQRT1_2);
 const legacy={...defaultStageCamera3D(),yaw:0,pitch:30,distance:10,orbit:90};const pose=cameraPose3D(legacy,1,()=>{throw 0;});close(pose.position.x,Math.sqrt(75));close(pose.position.y,6.6);close(pose.position.z,0);
 for(const v of [{keys:[{at:1,position:{z:10},target:{}}]},{keys:[{at:0,position:{},target:{}}]},{keys:[{at:0,position:{z:1},target:{},unknown:1}]},{follow:{actor:'a'},keys:[{at:0,position:{z:1},target:{}}]},{follow:{actor:'a',mode:'bad'}}])assert.throws(()=>parseCameraRig3D(v,4,'camera'));
});
test('project references, conflicts and resource round trips preserve reusable paths',()=>{
 const p=project();assert.equal(p.scenes.length,4);assert.deepEqual(parseProject(JSON.stringify(p)),p);
 const r=parse3DResource(JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind:'stage',id:'track',definition:p.stages.track}));assert.deepEqual(r.definition,p.stages.track);
 const bad=structuredClone(p);bad.scenes[0].stage3d!.camera.follow!.actor='missing';assert.throws(()=>validateProject(bad),/missing actor/);
 const conflict=structuredClone(p);conflict.scenes[0].stage3d!.actors[0].actions=[{type:'walk',at:0,duration:1} as any];assert.throws(()=>validateProject(conflict),/path and actions/);
 const missing=structuredClone(p);missing.scenes[0].stage3d!.actors[0].path!.path='absent';assert.throws(()=>validateProject(missing),/missing stage path/);
});
test('four demo laps meet at identical poses and explicit fractional starts continue across cuts',()=>{
 const p=project(),a=p.scenes[0].stage3d!.actors[0],paths=p.stages.track.paths!;assert.deepEqual(actor3DFrame(a,12,[a],paths),actor3DFrame(a,0,[a],paths));
 const first={...a,path:{...a.path!,laps:.25}},next={...a,path:{...a.path!,laps:.25,start:.25}};assert.deepEqual(actor3DFrame(first,12,[first],paths),actor3DFrame(next,0,[next],paths));
 for(const t of [0,.1,.3,.5,.7,.9]){const frame=samplePath3D(demoPath3D,t);assert.ok(Object.values(frame.position).every(Number.isFinite));}
});

test('downloadable path project has a real cover and independently importable matching stage/vehicles',()=>{
 const p=parseProject(readFileSync(new URL('../public/examples/path-camera.scenescript.json',import.meta.url),'utf8'));
 assert.match(p.thumbnail!.data,/^data:image\/png;base64,/);assert.equal(p.scenes.length,4);
 for(const [id,kind]of [['track','stage'],['red','character'],['blue','character']] as const){const file='../public/examples/path-'+id+(kind==='stage'?'.scenestage.json':'.scenecharacter.json'),r=parse3DResource(readFileSync(new URL(file,import.meta.url),'utf8'));assert.equal(r.id,id);assert.deepEqual(r.definition,kind==='stage'?p.stages[id]:p.characters[id]);}
});
test('camera field of view is validated and preserved in saved projects',()=>{
 const p=project();assert.equal(p.scenes[3].stage3d!.camera.fov,85);assert.equal(p.scenes[0].stage3d!.camera.fov,38);
 for(const fov of [0,111,NaN,null]){const p=project();(p.scenes[0].stage3d!.camera as any).fov=fov;assert.throws(()=>validateProject(p),/camera.fov/);}
});
test('explicit up vectors control banking, validate unsafe inputs and round-trip without drift',()=>{
 const route={...straight,ups:[vec(0,2,0),vec(1,1,0),vec(1,1,0)]},parsed=parsePaths3D({route}).route;
 assert.ok(samplePath3D(parsed,.5).up.x>.7);assert.ok(samplePath3D(parsed,.5).right.y<-.7);
 assert.deepEqual(parsePaths3D(JSON.parse(JSON.stringify({route:parsed}))).route,parsed);
 assert.deepEqual(parsePaths3D({route:{...straight,ups:[]}}).route,straight);
 for(const ups of [[vec(0,1,0)],[vec(),vec(0,1,0),vec(0,1,0)],[vec(0,0,1),vec(0,1,0),vec(0,1,0)],[vec(0,1,0),vec(0,-1,0),vec(0,1,0)]])assert.throws(()=>parsePaths3D({route:{...straight,ups}}),/ups/);
 const closed={closed:true,interpolation:'smooth',points:[vec(),vec(2,0,0),vec(2,0,2)],ups:[vec(0,1,0),vec(1,1,0),vec(0,-1,0)]};assert.throws(()=>parsePaths3D({route:closed}),/half-turns/);
});
