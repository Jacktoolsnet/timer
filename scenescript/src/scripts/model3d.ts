import {createModelEffects3D} from './effects3d';
import type {Effect3D} from '../lib/effects3d';
import {createExtrusionGeometry3D} from './extrusion3d';
import {createProfileGeometry3D} from './profile3d';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {textureFaces3D,type Texture3D} from '../lib/texture3d';
import {modelPose3D,type Model3D,type ModelMotion3D,type jointControls3D} from '../lib/model3d';
type Storage={textures?:Map<string,THREE.Texture>;images?:Map<string,HTMLImageElement>;textureSources?:WeakMap<HTMLImageElement,THREE.Texture>;geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
const sharedGeometries=new WeakMap<Storage,Map<string,THREE.BufferGeometry>>();
/** Transform chain: position → pivot → XYZ rotation → -pivot → geometry/children. */
export function createModel3D(model:Model3D,storage:Storage,palette:object={},events:readonly Effect3D[]=[],ownerAt?:(time:number)=>THREE.Matrix4){
 const root=new THREE.Group(),nodes=new Map<string,{anchor:THREE.Group;pivot:THREE.Group;content:THREE.Group;mesh?:THREE.Mesh;profile?:ReturnType<typeof createProfileGeometry3D>}>();
 let geometries=sharedGeometries.get(storage);if(!geometries){geometries=new Map();sharedGeometries.set(storage,geometries);}
 for(const part of model.parts){
  const anchor=new THREE.Group(),pivot=new THREE.Group(),content=new THREE.Group();anchor.name=part.id;pivot.position.set(part.pivot.x,part.pivot.y,part.pivot.z);content.position.set(-part.pivot.x,-part.pivot.y,-part.pivot.z);anchor.add(pivot);pivot.add(content);nodes.set(part.id,{anchor,pivot,content});
  if(part.shape==='group')continue;
  const rounded=part.shape==='box'&&part.finish&&part.finish!=='standard',geometryKey=part.shape+(rounded?'-rounded':'')+(part.extrusion?JSON.stringify(part.extrusion):'');
  const profile=part.profile?createProfileGeometry3D(part.profile):undefined;if(profile){nodes.get(part.id)!.profile=profile;storage.geometries.add(profile.geometry);}
  let geometry=profile?.geometry??geometries.get(geometryKey);
  if(!geometry){geometry=part.extrusion?createExtrusionGeometry3D(part.extrusion):part.shape==='box'?(rounded?new RoundedBoxGeometry(1,1,1,2,.035):new THREE.BoxGeometry(1,1,1)):part.shape==='sphere'?new THREE.SphereGeometry(.5,16,12):part.shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,16):part.shape==='cone'?new THREE.ConeGeometry(.5,1,16):new THREE.PlaneGeometry(1,1);geometries.set(geometryKey,geometry);storage.geometries.add(geometry);}
  const paletteColor=Object.hasOwn(palette,part.palette)?(palette as Record<string,unknown>)[part.palette]:undefined,color=typeof paletteColor==='string'&&/^#[a-f\d]{6}$/i.test(paletteColor)?paletteColor:part.color;
  const texture=(id:string,settings:Texture3D)=>{
   if(!id)return null;const images=storage.images,image=images?.get(id);if(!image)throw new Error('3D texture not prepared: '+id);
   const cache=storage.textures??=new Map(),key=JSON.stringify([id,settings.repeat,settings.offset,settings.rotation]);let map=cache.get(key);
   if(!map){if(cache.size-[...cache.keys()].filter(k=>k.startsWith('source:')).length>=128)throw new Error('3D textures: maximum 128 UV variants per scene');const sources=storage.textureSources??=new WeakMap();let source=sources.get(image);if(!source){source=new THREE.Texture(image);sources.set(image,source);cache.set('source:'+id,source);}map=source.clone();map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(settings.repeat.x,settings.repeat.y);map.offset.set(settings.offset.x,settings.offset.y);map.center.set(.5,.5);map.rotation=settings.rotation*Math.PI/180;map.anisotropy=4;map.needsUpdate=true;cache.set(key,map);}return map;
  };
  const makeMaterial=(id='',tint=color)=>{
   const map=part.texture&&id?texture(id,part.texture):null,key=JSON.stringify(['model',tint,part.roughness,part.metalness,part.opacity,part.finish??'standard',map?.uuid]);let material=storage.materials.get(key);
   if(!material){
    const base={color:tint,map,roughness:part.roughness,metalness:part.metalness,opacity:part.opacity,transparent:part.opacity<1,alphaTest:map?.01:0,depthWrite:part.opacity===1,side:THREE.DoubleSide};
    material=part.finish==='glass'?new THREE.MeshPhysicalMaterial({...base,metalness:0,roughness:Math.min(part.roughness,.12),transmission:.94,thickness:.6,ior:1.45,clearcoat:1,clearcoatRoughness:.05}):part.finish==='polished'?new THREE.MeshPhysicalMaterial({...base,clearcoat:1,clearcoatRoughness:.08}):new THREE.MeshStandardMaterial(base);storage.materials.set(key,material);
   }return material;
  };
  const material=part.extrusion?[makeMaterial(part.texture?.asset),makeMaterial(part.texture?.asset,part.extrusion.sideColor||color)]:part.texture&&Object.keys(part.texture.faces).length?textureFaces3D.map(face=>makeMaterial(part.texture!.faces[face]??part.texture!.asset)):makeMaterial(part.texture?.asset);
  const mesh=part.instances.length?new THREE.InstancedMesh(geometry,material,part.instances.length):new THREE.Mesh(geometry,material);mesh.name=part.id+'-geometry';
  if(mesh instanceof THREE.InstancedMesh){const dummy=new THREE.Object3D();part.instances.forEach((position,i)=>{dummy.position.set(position.x,position.y,position.z);dummy.scale.set(part.size.x,part.size.y,part.size.z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});}else mesh.scale.set(part.size.x,part.size.y,part.size.z);
  nodes.get(part.id)!.mesh=mesh;content.add(mesh);
 }
 for(const part of model.parts)(part.parent?nodes.get(part.parent)!.content:root).add(nodes.get(part.id)!.anchor);
 let effects:ReturnType<typeof createModelEffects3D>|undefined;
 const updateBase=(overrides:Record<string,number>,motions:readonly ModelMotion3D[],time:number,controls:Partial<Record<typeof jointControls3D[number],number>>={})=>{
  effects?.reset();
  const values=modelPose3D(model,overrides,motions,time,controls);
  for(const part of model.parts){const {anchor,pivot,mesh,profile}=nodes.get(part.id)!;if(mesh&&!(mesh instanceof THREE.InstancedMesh))mesh.scale.set(part.size.x,part.size.y,part.size.z);anchor.position.set(part.position.x,part.position.y,part.position.z);pivot.rotation.set(part.rotation.x*Math.PI/180,part.rotation.y*Math.PI/180,part.rotation.z*Math.PI/180);
   for(const joint of part.joints){const value=values.get(joint.id)!;if(joint.motion==='translation')anchor.position[joint.axis]+=value;else if(joint.motion==='rotation')pivot.rotation[joint.axis]+=value*Math.PI/180;else if(joint.motion==='morph')profile?.update(value);else if(mesh)mesh.scale[joint.axis]*=value;}
   if(profile&&!part.joints.some(j=>j.motion==='morph'))profile.update(0);
   if(mesh)mesh.visible=mesh.scale.x>1e-5&&mesh.scale.y>1e-5&&mesh.scale.z>1e-5;
  }
 };
 updateBase({},[],0);
 if(events.length)effects=createModelEffects3D(model,root,nodes,storage,events,ownerAt);
 const update=(overrides:Record<string,number>,motions:readonly ModelMotion3D[],time:number,controls:Partial<Record<typeof jointControls3D[number],number>>={})=>{
  if(effects)effects.update(time,(at,historical)=>updateBase(overrides,motions,at,historical?{}:controls));else updateBase(overrides,motions,time,controls);
 };
 return {root,update};
}
