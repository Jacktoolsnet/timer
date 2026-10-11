import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newElement,newScene,demoProject,parseProject,animationState} from '../src/lib/model.ts';
import {defaultMotionPath} from '../src/lib/motion-path.ts';
import {defaultBubble,bubbleGeometry,bubbleTarget,elementMatrix,applyMatrix,inversePoint,detachAnchor,renameAnchor} from '../src/lib/comic.ts';
import {comicProject} from '../src/lib/comic-example.ts';
const parsed=(p:unknown)=>parseProject(JSON.stringify(p));
test('legacy projects preserve appearance and new defaults and null rules are strict',()=>{
 const raw=JSON.parse(JSON.stringify(demoProject()));for(const scene of raw.scenes)for(const e of scene.elements)for(const key of ['bubble','anchors','until','exitAnimation','exitDuration'])delete e[key];
 const p=parsed(raw),old=p.scenes[0].elements[0];
 assert.equal(old.bubble,null);assert.deepEqual(old.anchors,{});assert.equal(old.until,null);assert.equal(old.exitAnimation,'none');assert.equal(old.exitDuration,.5);
 assert.equal(animationState(old,5,1920,1080,5).visible,true);
 const b=parsed({version:'1.0',title:'Comic',format:'landscape',scenes:[{id:'one',elements:[{id:'b',type:'bubble'}]}]}).scenes[0].elements[0];
 assert.deepEqual(b.bubble,defaultBubble());assert.equal(b.fillColor,'#ffffff');assert.equal(b.color,'#222222');assert.equal(b.fontSize,48);
 for(const [key,value] of [['bubble',null],['anchors',null],['exitAnimation',null],['exitDuration',0],['until',5.1],['until',0],['unknown',true]]){
  const q=structuredClone(p);q.scenes[0].elements.push({...newElement('bubble','b'),[key as string]:value});assert.throws(()=>parsed(q));
 }
 const q=structuredClone(p);q.scenes[0].elements.push({...newElement('bubble','b'),until:4});assert.equal(parsed(q).scenes[0].elements.at(-1)!.until,4);
});
test('bubble subfields, anchor references and namespaces validate strictly',()=>{
 const p=comicProject();assert.deepEqual(JSON.parse(JSON.stringify(parsed(p))),p);
 for(const change of [b=>b.bubble!.tail.element='nova-missing',b=>b.bubble!.tail.anchor='missing',b=>b.bubble!.padding=-1,b=>b.bubble!.lineHeight=0,b=>b.bubble!.tail.width=0,b=>b.bubble!.tail.curve=2] as ((b:ReturnType<typeof newElement>)=>void)[]){
  const q=structuredClone(p);change(q.scenes[0].elements[2]);assert.throws(()=>parsed(q));
 }
 for(const anchors of [{mouth:{x:-1,y:50}},{mouth:{x:50,y:50,code:'unsafe'}},{'bad name':{x:50,y:50}},Object.fromEntries(Array.from({length:17},(_,i)=>['a'+i,{x:50,y:50}]))]){
  const q=structuredClone(p);q.scenes[0].elements[0].anchors=anchors as any;assert.throws(()=>parsed(q));
 }
 const q=structuredClone(p);q.scenes[0].elements[2].bubble!.tail.element='constructor';assert.throws(()=>parsed(q));
});
test('speech and thought geometry handle all directions, inner targets and tiny bodies',()=>{
 const b=defaultBubble();
 for(const kind of ['speech','thought'] as const)for(const target of [{x:200,y:-100},{x:200,y:350},{x:-100,y:100},{x:800,y:100},{x:200,y:100}])for(const size of [[400,200],[2,1]]){
  b.kind=kind;const g=bubbleGeometry(b,size[0],size[1],target);assert(!/NaN|Infinity/.test(g.path));assert(g.path.endsWith(' Z'));assert(g.bounds.width>0&&g.bounds.height>0);
 }
 b.kind='speech';assert.equal(bubbleGeometry(b,400,200,{x:200,y:100}).tailVisible,false);
 b.tail.mode='none';assert.equal(bubbleGeometry(b,400,200,{x:200,y:400}).tailVisible,false);
 b.tail.mode='manual';b.kind='thought';const g=bubbleGeometry(b,400,200,{x:200,y:400});assert.equal(g.dots.length,3);assert(g.dots[0].r>g.dots[1].r&&g.dots[1].r>g.dots[2].r);
});
test('anchors follow paths and rotation through inverse bubble transforms even for hidden speakers',()=>{
 const s=newScene('s');s.duration=6;const speaker=newElement('image','speaker'),bubble=newElement('bubble','b');
 Object.assign(speaker,{x:30,y:40,width:20,height:30,rotation:35,animation:'zoom',anchors:{mouth:{x:70,y:20}},at:1,until:2,motionPath:{...defaultMotionPath(),orient:true}});
 bubble.rotation=-25;bubble.animation='pan';bubble.bubble!.tail={...bubble.bubble!.tail,mode:'anchor',element:speaker.id,anchor:'mouth'};s.elements=[speaker,bubble];
 for(const time of [0,1,1.5,2,4,5]){
  const target=bubbleTarget(bubble,s,time,1920,1080),actual=applyMatrix(elementMatrix(bubble,time,1920,1080,6),target);
  const expected=applyMatrix(elementMatrix(speaker,time,1920,1080,6),{x:.7*speaker.width*19.2,y:.2*speaker.height*10.8});
  assert(Math.abs(actual.x-expected.x)<1e-8);assert(Math.abs(actual.y-expected.y)<1e-8);
  const inverse=inversePoint(elementMatrix(speaker,time,1920,1080,6),expected);assert(Math.abs(inverse.x-.7*speaker.width*19.2)<1e-8);
 }
 const before=bubbleTarget(bubble,s,4,1920,1080);assert.equal(animationState(speaker,4).visible,false);
 renameAnchor(s,'speaker','mouth','voice');assert.equal(bubble.bubble!.tail.anchor,'voice');
 detachAnchor(s,'speaker','voice',4,1920,1080);delete speaker.anchors.voice;assert.equal(bubble.bubble!.tail.mode,'manual');assert.deepEqual(bubbleTarget(bubble,s,4,1920,1080),before);
});
test('exclusive ends and overlapping entry/exit animations are finite and deterministic',()=>{
 const e=newElement('text','t');e.at=1;e.until=1.1;e.animationDuration=3;e.exitDuration=4;
 for(const exit of ['none','fade','slide-left','slide-right','slide-up','slide-down','zoom-out'] as const){e.exitAnimation=exit;
  for(const time of [0,1,1.01,1.05,1.099,1.1,2]){const state=animationState(e,time,1920,1080,5);assert(Number.isFinite(state.opacity));assert(!/NaN|Infinity/.test(state.transform));assert.deepEqual(state,animationState(e,time,1920,1080,5));assert.equal(state.visible,time>=1&&time<1.1);}
 }
 e.exitAnimation='fade';assert.equal(animationState(e,1.1).opacity,0);
 e.at=0;e.until=1e-9;e.animation='none';assert.equal(animationState(e,1e-9,1920,1080,5).opacity,0);assert.equal(animationState(e,5e-10,1920,1080,5).opacity,.5);
 e.until=null;e.at=0;e.animation='none';e.exitDuration=1;assert.equal(animationState(e,4.5,1920,1080,5).opacity,.5);
});
test('comic example and schema expose the supported first-stage fields',()=>{
 const p=comicProject();assert.deepEqual(JSON.parse(JSON.stringify(parsed(p))),p);assert.equal(p.scenes[0].elements.filter(e=>e.type==='bubble').length,3);
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));
 const props=schema.properties.scenes.items.properties.elements.items.properties;assert(props.type.enum.includes('bubble'));
 for(const key of ['bubble','anchors','until','exitAnimation','exitDuration'])assert(Object.hasOwn(props,key));
 assert.equal(schema.$defs.bubble.properties.padding.default,defaultBubble().padding);
});
