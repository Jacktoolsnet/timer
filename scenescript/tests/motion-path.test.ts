import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {defaultMotionPath,parseMotionPath,motionPathState,pathPoint,pathTemplate} from '../src/lib/motion-path.ts';
import {demoProject,parseProject,animationState} from '../src/lib/model.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
test('path defaults, null, strict fields and scene bounds',()=>{
 assert.equal(parseMotionPath(null,5),null);assert.equal(parseMotionPath(undefined,5),null);assert.deepEqual(parseMotionPath({},5),defaultMotionPath());for(const key of Object.keys(defaultMotionPath()))assert.throws(()=>parseMotionPath({[key]:null},5));
 for(const v of [{start:6},{duration:0},{orient:null},{type:'custom'},{from:{x:0}},{to:{x:201,y:0}},{radiusX:0},{easing:null},{extra:1}])assert.throws(()=>parseMotionPath(v,5));
 const p=demoProject();p.scenes[0].elements[0].motionPath=defaultMotionPath('bezier');assert.deepEqual(JSON.parse(JSON.stringify(parseProject(JSON.stringify(p)))),p);
});
test('line timing, hold/reset and repetition are deterministic',()=>{
 const m=defaultMotionPath();m.start=1;m.duration=2;near(motionPathState(m,0,1920,1080).x,0);near(motionPathState(m,2,1920,1080).x,15);near(motionPathState(m,8,1920,1080).x,30);
 m.after='reset';near(motionPathState(m,3,1920,1080).x,0);m.repeat='loop';near(motionPathState(m,4,1920,1080).x,15);m.repeat='ping-pong';m.orient=true;near(motionPathState(m,4,1920,1080).x,15);near(Math.abs(motionPathState(m,4,1920,1080).angle),180);
 assert.deepEqual(motionPathState(m,4,1080,1920),motionPathState(m,4,1080,1920));
});
test('curves, circles and orientation account for stage aspect ratio',()=>{
 const m=defaultMotionPath('bezier');assert.deepEqual(pathPoint(m,0),m.from);assert.deepEqual(pathPoint(m,1),m.to);near(motionPathState(m,3,1920,1080).x,30);
 m.type='ellipse';m.orient=true;near(motionPathState(m,0,1920,1080).x,15);near(motionPathState(m,0,1920,1080).angle,90);m.clockwise=false;near(motionPathState(m,0,1920,1080).angle,-90);
 m.type='line';m.to={x:10,y:10};near(motionPathState(m,1,100,100).angle,45);assert.ok(motionPathState(m,1,100,200).angle>45);
 m.to=m.from;assert.ok(Number.isFinite(motionPathState(m,1,100,200).angle));
});
test('path combines with entrances and uses scene-local time',()=>{
 const e=demoProject().scenes[0].elements[0];e.animation='none';e.motionPath=defaultMotionPath();e.motionPath.duration=2;e.rotation=10;
 assert.match(animationState(e,1,1080,1920).transform,/translate\(162px, 0px\) rotate\(10deg\)/);
 e.motionPath=null;assert.ok(!animationState(e,1).transform.startsWith('translate'));
});
test('connected routes move, pause, loop and reflect the complete timeline',()=>{
 const m=defaultMotionPath('segments');m.segments=[{type:'line',to:{x:20,y:0},control1:{x:0,y:0},control2:{x:10,y:0},duration:2,pause:1,easing:'linear'},{type:'line',to:{x:20,y:20},control1:{x:20,y:0},control2:{x:20,y:10},duration:2,pause:0,easing:'linear'}];m.orient=true;
 near(motionPathState(m,1,100,100).x,10);near(motionPathState(m,2.5,100,100).x,20);near(motionPathState(m,2.5,100,100).y,0);near(motionPathState(m,4,100,100).y,10);near(motionPathState(m,4,100,100).angle,90);near(motionPathState(m,8,100,100).y,20);
 m.repeat='ping-pong';near(motionPathState(m,6,100,100).y,10);near(motionPathState(m,6,100,100).angle,-90);near(motionPathState(m,7.5,100,100).x,20);near(motionPathState(m,7.5,100,100).y,0);
 m.repeat='loop';near(motionPathState(m,6,100,100).x,10);m.repeat='once';m.after='reset';near(motionPathState(m,5,100,100).x,0);near(motionPathState(m,5,100,100).y,0);
});
test('segment parsing rejects invalid routes and preserves old simple paths',()=>{
 for(const value of [{segments:[]},{segments:null},{segments:Array(33).fill({})},{segments:[{duration:0}]},{segments:[{pause:-1}]},{segments:[{to:{x:0}}]},{segments:[{type:'ellipse'}]},{segments:[{foo:0}]},{segments:[null]}])assert.throws(()=>parseMotionPath(value,5));
 const m=parseMotionPath({type:'segments',segments:[{}, {type:'bezier',to:{x:35,y:15},pause:1}]},5)!;near(motionPathState(m,5,100,100).x,35);near(motionPathState(m,5,100,100).y,15);
 const p=demoProject();p.scenes[0].elements[0].motionPath=m;assert.deepEqual(JSON.parse(JSON.stringify(parseProject(JSON.stringify(p)))),p);
});

test('templates and schema defaults agree with the runtime',()=>{
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));const properties=schema.$defs.motionPath.properties,d=defaultMotionPath();assert.deepEqual(Object.keys(properties).sort(),Object.keys(d).sort());for(const [key,value] of Object.entries(d))assert.deepEqual(properties[key].default,value);
 for(const name of ['wave','zigzag','spiral','flight'] as const){const m=pathTemplate(name);assert.deepEqual(parseMotionPath(m,5),m);assert.ok(m.segments.length<=32);assert.deepEqual(pathPoint(m,0),m.from);assert.deepEqual(pathPoint(m,1),m.segments.at(-1)!.to);}
 const m=defaultMotionPath('segments');m.orient=true;m.repeat='ping-pong';m.segments[0].to={x:0,y:0};near(motionPathState(m,3,100,100).angle,0);
});
