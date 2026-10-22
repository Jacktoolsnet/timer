import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseMorph,morphMesh,morphProgress} from '../src/lib/morph.ts';
import {parseProject,sceneTransitions} from '../src/lib/model.ts';
const config={points:[{from:{x:25,y:25},to:{x:31,y:28}},{from:{x:75,y:75},to:{x:70,y:72}}]};
test('morph landmarks are bounded, strictly declarative and round trip with legacy defaults',()=>{
 assert.ok(sceneTransitions.includes('morph'));assert.equal(parseMorph(undefined),null);assert.deepEqual(parseMorph(config),config);
 const p=parseProject(JSON.stringify({version:'1.0',title:'Morph',format:'square',scenes:[{id:'one',elements:[]},{id:'two',transition:'morph',morph:config,elements:[]}]}));assert.equal(p.scenes[0].morph,null);assert.deepEqual(p.scenes[1].morph,config);assert.deepEqual(parseProject(JSON.stringify(p)),p);
 for(const value of [1,[],{code:'alert()'},{points:Array(33).fill(config.points[0])},{points:[config.points[0],config.points[0]]},{points:[{from:{x:-1,y:4},to:{x:4,y:5}}]},{points:[{from:{x:4,y:4,z:0},to:{x:4,y:5}}]},{points:[{from:{x:4,y:4},to:{x:NaN,y:5}}]},{points:[{...config.points[0],script:'x'}]}])assert.throws(()=>parseMorph(value),/morph/);
});
test('mesh pins boundaries, deforms its interior and never folds even for conflicting landmarks',()=>{
 for(const morph of [config,null,{points:[]},{points:[{from:{x:10,y:10},to:{x:95,y:95}},{from:{x:90,y:90},to:{x:5,y:5}}]}]){
  const mesh=morphMesh(morph);assert.deepEqual(morphMesh(morph),mesh);assert.equal(mesh.from.length,425);assert.equal(mesh.triangles.length,768);
  mesh.from.forEach((p,i)=>{if(p.x===0||p.x===100||p.y===0||p.y===100)assert.deepEqual(mesh.to[i],p);});
  for(let t=0;t<=1;t+=.05){const vertices=mesh.from.map((p,i)=>({x:p.x+(mesh.to[i].x-p.x)*t,y:p.y+(mesh.to[i].y-p.y)*t}));for(const [a,b,c]of mesh.triangles){const [p,q,r]=[vertices[a],vertices[b],vertices[c]];assert.ok((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)>0);}}
 }
 assert.ok(morphMesh(null).from.some((p,i)=>p.x!==morphMesh(null).to[i].x));assert.deepEqual(morphMesh({points:[]}).from,morphMesh({points:[]}).to);
 assert.equal(morphProgress(-1),0);assert.equal(morphProgress(2),1);assert.equal(morphProgress(.5),.5);
});
