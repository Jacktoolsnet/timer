import * as THREE from 'three';
import {modelPose3D,type Model3D,type ModelMotion3D,type jointControls3D} from '../lib/model3d';
type Storage={geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
/** Transform chain: position → pivot → XYZ rotation → -pivot → geometry/children. */
export function createModel3D(model:Model3D,storage:Storage){
 const root=new THREE.Group(),nodes=new Map<string,{anchor:THREE.Group;pivot:THREE.Group;content:THREE.Group}>();
 const geometries=new Map<string,THREE.BufferGeometry>();
 for(const part of model.parts){
  const anchor=new THREE.Group(),pivot=new THREE.Group(),content=new THREE.Group();anchor.name=part.id;pivot.position.set(part.pivot.x,part.pivot.y,part.pivot.z);content.position.set(-part.pivot.x,-part.pivot.y,-part.pivot.z);anchor.add(pivot);pivot.add(content);nodes.set(part.id,{anchor,pivot,content});
  if(part.shape==='group')continue;
  let geometry=geometries.get(part.shape);
  if(!geometry){geometry=part.shape==='box'?new THREE.BoxGeometry(1,1,1):part.shape==='sphere'?new THREE.SphereGeometry(.5,16,12):part.shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,16):part.shape==='cone'?new THREE.ConeGeometry(.5,1,16):new THREE.PlaneGeometry(1,1);geometries.set(part.shape,geometry);storage.geometries.add(geometry);}
  const key=JSON.stringify(['model',part.color,part.roughness,part.metalness,part.opacity]);let material=storage.materials.get(key);
  if(!material){material=new THREE.MeshStandardMaterial({color:part.color,roughness:part.roughness,metalness:part.metalness,opacity:part.opacity,transparent:part.opacity<1,depthWrite:part.opacity===1,side:THREE.DoubleSide});storage.materials.set(key,material);}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=part.id+'-geometry';mesh.scale.set(part.size.x,part.size.y,part.size.z);content.add(mesh);
 }
 for(const part of model.parts)(part.parent?nodes.get(part.parent)!.content:root).add(nodes.get(part.id)!.anchor);
 const update=(overrides:Record<string,number>,motions:readonly ModelMotion3D[],time:number,controls:Partial<Record<typeof jointControls3D[number],number>>={})=>{
  const values=modelPose3D(model,overrides,motions,time,controls);
  for(const part of model.parts){const {anchor,pivot}=nodes.get(part.id)!;anchor.position.set(part.position.x,part.position.y,part.position.z);pivot.rotation.set(part.rotation.x*Math.PI/180,part.rotation.y*Math.PI/180,part.rotation.z*Math.PI/180);
   for(const joint of part.joints){const value=values.get(joint.id)!;if(joint.motion==='translation')anchor.position[joint.axis]+=value;else pivot.rotation[joint.axis]+=value*Math.PI/180;}
  }
 };
 update({},[],0);return {root,update};
}
