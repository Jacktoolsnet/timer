import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseModel3D} from '../src/lib/model3d.ts';import {parseTexture3D,removeTextureAsset3D} from '../src/lib/texture3d.ts';
import {validateProject,demoProject} from '../src/lib/model.ts';
import {parseCharacter3D,parseStage3D,export3DResource,parse3DResource,import3DResource,MAX_3D_RESOURCE_BYTES} from '../src/lib/stage3d.ts';
import {parseGroup3D} from '../src/lib/group3d.ts';import {resource3DPreview} from '../src/lib/stage3d-resource-preview.ts';
const image={name:'pixel.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='};
const textured=()=>parseCharacter3D({name:'Texture box',model:{parts:[{id:'box',color:'#ffffff',texture:{asset:'photo',faces:{front:'detail',back:''}}}]}});
const source=()=>{const p=demoProject();p.assets={photo:{...image},detail:{...image,data:'data:image/png;base64,AAAA'},unused:image};p.characters.box=textured();p.stages.room=parseStage3D({model:{parts:[{id:'wall',texture:{asset:'photo'}}]}});p.groups3d.crowd=parseGroup3D({characters:['box']},p.characters);return p;};
test('texture syntax has strict bounded UVs, safe IDs and box-only face overrides',()=>{
 assert.deepEqual(parseTexture3D({asset:'image'},'sphere','t'),{asset:'image',repeat:{x:1,y:1},offset:{x:0,y:0},rotation:0,faces:{}});assert.equal(parseTexture3D(null,'box','t'),undefined);
 for(const raw of ['img',{},[],{asset:'https://bad'},{asset:'x',unknown:1},{asset:null},{asset:'x',rotation:null},{asset:'x',rotation:Infinity},{asset:'x',repeat:{x:0}},{asset:'x',repeat:{y:101}},{asset:'x',repeat:{x:null}},{asset:'x',offset:{x:-101}},{asset:'x',offset:{z:1}},{asset:'x',faces:{up:'y'}},{asset:'x',faces:{top:null}}])assert.throws(()=>parseTexture3D(raw,'box','t'));
 assert.throws(()=>parseTexture3D({asset:'x'},'group','t'),/geometry/);assert.throws(()=>parseTexture3D({asset:'x',faces:{front:'y'}},'sphere','t'),/box/);
 const p=source();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),validateProject(p));delete p.assets.photo;assert.throws(()=>validateProject(p),/missing asset photo/);
 const svg=source();svg.assets.photo.data='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>').toString('base64');assert.throws(()=>validateProject(svg),/PNG, JPEG or WebP/);
 assert.ok(!Object.hasOwn(parseModel3D({parts:[{id:'legacy'}]})!.parts[0],'texture'));
});
test('character, stage and group bundles carry only required images and remap collisions transactionally',()=>{
 const p=source();for(const [kind,id]of [['character','box'],['stage','room'],['group','crowd']] as const){const bundle=export3DResource(kind,id,p);assert.equal(Object.hasOwn(bundle.assets!,'unused'),false);assert.deepEqual(parse3DResource(JSON.stringify(bundle)),bundle);assert.ok(JSON.stringify(bundle).length<MAX_3D_RESOURCE_BYTES);
  const destination=demoProject();destination.assets.photo={...image,data:'data:image/png;base64,BBBB'};const before=JSON.stringify(destination);const result=import3DResource(bundle,destination,'copy');assert.equal(result.assets.photo.data,destination.assets.photo.data);assert.equal(result.assets.photo_2.data,image.data);assert.equal(JSON.stringify(destination),before);
  const model=kind==='group'?result.characters.box.model:kind==='stage'?result.stages.room.model:result.characters.box.model;assert.equal(model!.parts[0].texture!.asset,'photo_2');if(kind!=='stage')assert.equal(model!.parts[0].texture!.faces.front,'detail');
  const again=import3DResource(bundle,result,'copy');assert.equal(Object.keys(again.assets).length,Object.keys(result.assets).length);assert.ok(again.id.endsWith('_2'));
  const preview=resource3DPreview(kind,id,bundle.definition,'',p.characters,p.assets);assert.ok(validateProject(preview.project));
 }
 const bundle=export3DResource('character','box',p);assert.throws(()=>parse3DResource(JSON.stringify({...bundle,assets:{}})),/missing asset/);assert.throws(()=>parse3DResource(JSON.stringify({...bundle,assets:{...bundle.assets,unused:image}})),/unreferenced/);
 const full=demoProject();for(let i=0;i<100;i++)full.assets['a'+i]={...image,data:'data:image/png;base64,BBBB'};const before=JSON.stringify(full);assert.throws(()=>import3DResource(bundle,full,'copy'),/maximum 100/);assert.equal(JSON.stringify(full),before);
});
test('deleting an image clears only its maps and keeps remaining face textures valid',()=>{
 const p=source(),model=p.characters.box.model!;removeTextureAsset3D(model,'photo');assert.equal(model.parts[0].texture!.asset,'');assert.equal(model.parts[0].texture!.faces.front,'detail');removeTextureAsset3D(model,'detail');assert.equal(model.parts[0].texture,undefined);
});
