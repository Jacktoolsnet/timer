import * as THREE from 'three';
import {modelPose3D,type Model3D,type ModelMotion3D,type jointControls3D} from '../lib/model3d';
type Storage={geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
const sharedGeometries=new WeakMap<Storage,Map<string,THREE.BufferGeometry>>();
/** Transform chain: position → pivot → XYZ rotation → -pivot → geometry/children. */
export function createModel3D(model:Model3D,storage:Storage,palette:object={}){
 const root=new THREE.Group(),nodes=new Map<string,{anchor:THREE.Group;pivot:THREE.Group;content:THREE.Group;mesh?:THREE.Mesh}>();
 let geometries=sharedGeometries.get(storage);if(!geometries){geometries=new Map();sharedGeometries.set(storage,geometries);}
 for(const part of model.parts){
  const anchor=new THREE.Group(),pivot=new THREE.Group(),content=new THREE.Group();anchor.name=part.id;pivot.position.set(part.pivot.x,part.pivot.y,part.pivot.z);content.position.set(-part.pivot.x,-part.pivot.y,-part.pivot.z);anchor.add(pivot);pivot.add(content);nodes.set(part.id,{anchor,pivot,content});
  if(part.shape==='group')continue;
  let geometry=geometries.get(part.shape);
  if(!geometry){geometry=part.shape==='box'?new THREE.BoxGeometry(1,1,1):part.shape==='sphere'?new THREE.SphereGeometry(.5,16,12):part.shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,16):part.shape==='cone'?new THREE.ConeGeometry(.5,1,16):new THREE.PlaneGeometry(1,1);geometries.set(part.shape,geometry);storage.geometries.add(geometry);}
  const paletteColor=Object.hasOwn(palette,part.palette)?(palette as Record<string,unknown>)[part.palette]:undefined,color=typeof paletteColor==='string'&&/^#[a-f\d]{6}$/i.test(paletteColor)?paletteColor:part.color;
  const key=JSON.stringify(['model',color,part.roughness,part.metalness,part.opacity]);let material=storage.materials.get(key);
  if(!material){material=new THREE.MeshStandardMaterial({color,roughness:part.roughness,metalness:part.metalness,opacity:part.opacity,transparent:part.opacity<1,depthWrite:part.opacity===1,side:THREE.DoubleSide});storage.materials.set(key,material);}
  const mesh=part.instances.length?new THREE.InstancedMesh(geometry,material,part.instances.length):new THREE.Mesh(geometry,material);mesh.name=part.id+'-geometry';
  if(mesh instanceof THREE.InstancedMesh){const dummy=new THREE.Object3D();part.instances.forEach((position,i)=>{dummy.position.set(position.x,position.y,position.z);dummy.scale.set(part.size.x,part.size.y,part.size.z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});}else mesh.scale.set(part.size.x,part.size.y,part.size.z);
  nodes.get(part.id)!.mesh=mesh;content.add(mesh);
 }
 for(const part of model.parts)(part.parent?nodes.get(part.parent)!.content:root).add(nodes.get(part.id)!.anchor);
 const update=(overrides:Record<string,number>,motions:readonly ModelMotion3D[],time:number,controls:Partial<Record<typeof jointControls3D[number],number>>={})=>{
  const values=modelPose3D(model,overrides,motions,time,controls);
  for(const part of model.parts){const {anchor,pivot,mesh}=nodes.get(part.id)!;if(mesh&&!(mesh instanceof THREE.InstancedMesh))mesh.scale.set(part.size.x,part.size.y,part.size.z);anchor.position.set(part.position.x,part.position.y,part.position.z);pivot.rotation.set(part.rotation.x*Math.PI/180,part.rotation.y*Math.PI/180,part.rotation.z*Math.PI/180);
   for(const joint of part.joints){const value=values.get(joint.id)!;if(joint.motion==='translation')anchor.position[joint.axis]+=value;else if(joint.motion==='rotation')pivot.rotation[joint.axis]+=value*Math.PI/180;else if(mesh)mesh.scale[joint.axis]*=value;}
   if(mesh)mesh.visible=mesh.scale.x>1e-5&&mesh.scale.y>1e-5&&mesh.scale.z>1e-5;
  }
 };
 update({},[],0);return {root,update};
}
