import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoProject,parseProject,animationState,newElement,locateTime,validateImage,sceneTransitions,sceneTransitionState} from '../src/lib/model.ts';
const serialize=(value:unknown)=>JSON.stringify(value);
test('complete demo round trips and schema covers every exported field',()=>{
 const p=demoProject();assert.deepEqual(JSON.parse(serialize(parseProject(serialize(p)))),p);
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(p).sort(),Object.keys(schema.properties).sort());
 assert.deepEqual(Object.keys(p.scenes[0]).sort(),Object.keys(schema.properties.scenes.items.properties).sort());
 assert.deepEqual(Object.keys(p.scenes[0].elements[0]).sort(),Object.keys(schema.properties.scenes.items.properties.elements.items.properties).sort());
});
test('minimal AI project gets documented defaults',()=>{
 const p=parseProject(serialize({version:'1.0',title:'Minimal',format:'portrait',scenes:[{id:'one',elements:[{id:'text',type:'text'}]}]}));assert.equal(p.scenes[0].duration,5);assert.equal(p.scenes[0].elements[0].fontSize,90);assert.equal(p.scenes[0].background,'#263b42');
});
test('rejects malformed, unsupported and unsafe input',()=>{
 assert.throws(()=>parseProject('{'));const p=demoProject();
 for(const mutate of [(p:any)=>p.version='2.0',(p:any)=>p.html='<script>',(p:any)=>p.scenes=[],(p:any)=>p.scenes[0].duration=-1,(p:any)=>p.scenes[0].elements[0].x='50',(p:any)=>p.scenes[0].elements[0].font='Remote font',(p:any)=>p.scenes[0].elements[0].animation='eval',(p:any)=>p.scenes[0].elements[0].asset='missing',(p:any)=>p.scenes[1].id=p.scenes[0].id,(p:any)=>p.scenes[1].elements[0].id=p.scenes[0].elements[0].id,(p:any)=>p.scenes[0].elements[0].at=6,(p:any)=>p.scenes[0].background='red']){const changed=structuredClone(p);mutate(changed);assert.throws(()=>parseProject(serialize(changed)));}
 for(const value of ['https://example.com/a.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,','data:image/png;base64,invalid!'])assert.throws(()=>validateImage(value));
});
test('images are retained once and asset references checked using own keys',()=>{
 const p=demoProject();p.assets.pixel={name:'pixel.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='};p.scenes.forEach(s=>s.backgroundAsset='pixel');assert.equal(Object.keys(parseProject(serialize(p)).assets).length,1);
 p.scenes[0].backgroundAsset='constructor';assert.throws(()=>parseProject(serialize(p)),/missing asset/);
});
test('scene timing boundary and end are deterministic',()=>{
 const p=demoProject();assert.deepEqual(locateTime(p,0),{index:0,local:0,ended:false});assert.deepEqual(locateTime(p,5),{index:1,local:0,ended:false});assert.deepEqual(locateTime(p,10),{index:1,local:5,ended:true});
});
test('animation progress, opacity, motion and Unicode typewriter',()=>{
 const e=newElement('text');e.at=2;assert.equal(animationState(e,1).visible,false);assert.equal(animationState(e,2).opacity,0);assert.equal(animationState(e,2.5).opacity,.5);assert.equal(animationState(e,4).opacity,1);
 e.animation='typewriter';e.text='😀ab';assert.equal(animationState(e,2.5).text,'😀');assert.equal(animationState(e,3).text,'😀ab');e.animation='slide-up';assert.match(animationState(e,3).transform,/0px/);
});

test('rich text inherits defaults, rejects unsafe styles and preserves Unicode timing',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.runs=[{text:'😀 '},{text:'World',font:'Georgia',fontSize:120,color:'#ff8800',bold:true}];e.text='old';
 const parsed=parseProject(serialize(p)).scenes[0].elements[0];assert.equal(parsed.text,'😀 World');assert.deepEqual(parsed.runs,e.runs);
 parsed.animation='typewriter';parsed.at=0;parsed.animationDuration=1;assert.equal(animationState(parsed,.5).text,'😀 W');
 for(const run of [{text:'x',html:'<script>'},{text:'x',font:'Unknown'},{text:'x',fontSize:0},{text:'x',bold:'yes'}]){e.runs=[run as any];assert.throws(()=>parseProject(serialize(p)));}
});

test('scene transitions validate, clamp and resolve all directions deterministically',()=>{
 const p=demoProject(),scene=p.scenes[1];scene.transitionDuration=2;
 for(const kind of sceneTransitions){scene.transition=kind;assert.equal(parseProject(serialize(p)).scenes[1].transition,kind);const state=sceneTransitionState(scene,1);assert.equal(state.progress,.5);assert.equal(sceneTransitionState(scene,-1).progress,0);assert.equal(sceneTransitionState(scene,3).progress,1);}
 scene.transition='crossfade';assert.equal(sceneTransitionState(scene,1).opacity,.5);
 scene.transition='slide-left';assert.equal(sceneTransitionState(scene,1).incoming,'translate(50%, 0%)');assert.equal(sceneTransitionState(scene,1).outgoing,'translate(-50%, 0%)');
 scene.transition='slide-down';assert.equal(sceneTransitionState(scene,1).incoming,'translate(0%, -50%)');
 scene.transition='wipe-down';assert.equal(sceneTransitionState(scene,1).clip,'inset(0% 0% 50% 0%)');
 scene.transition='wipe-left';assert.equal(sceneTransitionState(scene,1).clip,'inset(0% 0% 0% 50%)');
 (scene as any).transition='unknown';assert.throws(()=>parseProject(serialize(p)));
});

test('zoom and through-black scene transitions include precise midpoint and endpoints',()=>{
 const scene=demoProject().scenes[1];scene.transitionDuration=2;
 scene.transition='zoom-in';assert.equal(sceneTransitionState(scene,0).incoming,'scale(0.7)');assert.equal(sceneTransitionState(scene,1).incoming,'scale(0.85)');assert.equal(sceneTransitionState(scene,2).incoming,'scale(1)');
 scene.transition='zoom-out';assert.equal(sceneTransitionState(scene,0).incoming,'scale(1.3)');assert.equal(sceneTransitionState(scene,2).incoming,'scale(1)');assert.equal(sceneTransitionState(scene,1).opacity,.5);
 scene.transition='through-black';for(const [time,outgoing,incoming] of [[0,1,0],[.5,.5,0],[1,0,0],[1.5,0,.5],[2,0,1]]){const state=sceneTransitionState(scene,time);assert.equal(state.outgoingOpacity,outgoing);assert.equal(state.opacity,incoming);}
});

test('shape fill and border validate independently and preserve legacy color',()=>{
 const p=demoProject();const shape=newElement('shape','rectangle');p.scenes[0].elements=[shape];
 shape.fillColor='none';shape.borderColor='#ff8800';shape.borderWidth=12;assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0],shape);
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].fillColor;delete legacy.scenes[0].elements[0].borderColor;delete legacy.scenes[0].elements[0].borderWidth;legacy.scenes[0].elements[0].color='#123456';const parsed=parseProject(serialize(legacy)).scenes[0].elements[0];assert.equal(parsed.fillColor,'#123456');assert.equal(parsed.borderColor,'none');
 for(const [key,value] of [['fillColor','red'],['borderColor','transparent'],['borderWidth',-1],['borderWidth',501]]){const invalid=structuredClone(p);(invalid.scenes[0].elements[0] as any)[key]=value;assert.throws(()=>parseProject(serialize(invalid)));}
});

test('border line styles round trip, default to solid and reject unknown values',()=>{
 const p=demoProject(),e=newElement('shape');p.scenes[0].elements=[e];
 for(const style of ['solid','dashed','dotted','double'] as const){e.borderStyle=style;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].borderStyle,style);}
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].borderStyle;assert.equal(parseProject(serialize(legacy)).scenes[0].elements[0].borderStyle,'solid');
 (e as any).borderStyle='unknown';assert.throws(()=>parseProject(serialize(p)));
});

test('built-in shape types round trip and legacy shapes stay rectangles',()=>{
 const p=demoProject(),e=newElement('shape');p.scenes[0].elements=[e];
 for(const kind of ['rectangle','ellipse','triangle','diamond','star','arrow'] as const){e.shapeType=kind;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].shapeType,kind);}
 const old=JSON.parse(serialize(p));delete old.scenes[0].elements[0].shapeType;assert.equal(parseProject(serialize(old)).scenes[0].elements[0].shapeType,'rectangle');
 (e as any).shapeType='external-svg';assert.throws(()=>parseProject(serialize(p)));
});
