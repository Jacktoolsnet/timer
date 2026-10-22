import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {demoProject} from '../src/lib/model.ts';import {parseCharacter3D,export3DResource,parse3DResource,import3DResource} from '../src/lib/stage3d.ts';
import {parseExtrusion3D} from '../src/lib/extrusion3d.ts';import {parseModel3D} from '../src/lib/model3d.ts';
import {createExtrusionGeometry3D} from '../src/scripts/extrusion3d.ts';import {inflationLetters} from '../src/lib/inflation-lettering.ts';
const ring=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],hole=[{x:.3,y:.3},{x:.7,y:.3},{x:.7,y:.7},{x:.3,y:.7}];
test('extrusion contours are bounded, simple, hole-safe and round trip without changing legacy parts',()=>{
 const input={contour:ring,holes:[hole],bevel:.01,sideColor:'#aabbcc'},p=parseExtrusion3D(input,'extrusion','test')!;assert.deepEqual(parseExtrusion3D(p,'extrusion','test'),p);assert.equal(parseExtrusion3D(undefined,'box','test'),undefined);
 for(const value of [null,{contour:ring,code:'x'},{contour:ring,bevel:.04},{contour:ring,bevel:null},{contour:ring,holes:null},{contour:ring,sideColor:'red'},{contour:ring.slice(0,2)},{contour:[ring[0],ring[2],ring[1],ring[3]]},{contour:ring,holes:[[{x:.9,y:.9},{x:1,y:.9},{x:1,y:1}]]},{contour:ring,holes:[hole,hole]},{contour:[...ring,ring[0]]}])assert.throws(()=>parseExtrusion3D(value,'extrusion','test'));
 assert.throws(()=>parseExtrusion3D(input,'box','test'));const m=parseModel3D({parts:[{id:'letter',shape:'extrusion',extrusion:input}]})!;assert.deepEqual(parseModel3D(JSON.parse(JSON.stringify(m))),m);const project=demoProject();project.characters.letter=parseCharacter3D({model:m});const bundle=export3DResource('character','letter',project);assert.deepEqual(parse3DResource(JSON.stringify(bundle)),bundle);assert.deepEqual(import3DResource(bundle,demoProject(),'copy').characters.letter,project.characters.letter);assert.ok(!Object.hasOwn(parseModel3D({parts:[{id:'legacy'}]})!.parts[0],'extrusion'));
});
test('solid beveled A has genuine through-hole, finite buffers, cap/edge groups and no overlapping strokes',()=>{
 const part=inflationLetters('headline','A',0,1,1,'#ffcc55','#885511')[0],config=parseExtrusion3D(part.extrusion,'extrusion','A')!,geometry=createExtrusionGeometry3D(config),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld(true);
 try{for(const name of ['position','normal','uv'])assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite));assert.ok(geometry.groups.some(g=>g.materialIndex===0));assert.ok(geometry.groups.some(g=>g.materialIndex===1));assert.ok(geometry.boundingBox!.max.z>.5);
  const hit=(x:number,y:number)=>new THREE.Raycaster(new THREE.Vector3(x-.5,y-.5,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length;
  assert.equal(hit(.5,.6),0,'counter must remain empty through the entire depth');assert.ok(hit(.5,.32)>0,'crossbar is solid');assert.ok(hit(.2,.1)>0,'leg is solid');
 }finally{geometry.dispose();material.dispose();}
});
