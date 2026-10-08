import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoProject,parseProject,animationState,newElement,locateTime,validateImage} from '../src/lib/model.ts';
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
