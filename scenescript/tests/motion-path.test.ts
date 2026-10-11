import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultMotionPath,parseMotionPath,motionPathState,pathPoint} from '../src/lib/motion-path.ts';
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
