import * as THREE from 'three';
import {effectRandom3D as random,effectState3D,effectDebrisState3D,type Effect3D} from '../lib/effects3d';
import type {Model3D} from '../lib/model3d';
type Node={content:THREE.Group;mesh?:THREE.Mesh};
type Storage={geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
/** Small instanced pools, sampled from absolute time. No integration or hidden RNG state. */
export function createModelEffects3D(model:Model3D,root:THREE.Group,nodes:Map<string,Node>,storage:Storage,events:readonly Effect3D[],ownerAt?:(time:number)=>THREE.Matrix4){
 const layer=new THREE.Group();layer.name='model-effects';root.add(layer);
 const original=new Map([...nodes].filter(([,n])=>n.mesh).map(([id,n])=>[id,n.mesh!.material]));
 const charred=new Map<string,THREE.MeshStandardMaterial>();
 const tint=(material:THREE.Material,intensity=1)=>{const key=material.uuid+':'+intensity;let copy=charred.get(key);if(!copy){copy=(material as THREE.MeshStandardMaterial).clone();copy.color.multiplyScalar(Math.max(.08,1-.78*Math.min(1.15,intensity)));copy.metalness*=1-.5*Math.min(1,intensity);charred.set(key,copy);storage.materials.set('effect-char-'+copy.uuid,copy);}return copy;};
 const inside=(id:string,parent:string)=>{let p=model.parts.find(p=>p.id===id);while(p){if(p.id===parent)return true;p=model.parts.find(q=>q.id===p!.parent);}return false;};
 const geometry=new THREE.SphereGeometry(.5,8,6);storage.geometries.add(geometry);
 const pool=(count:number,color:string,opacity:number,glow=false)=>{
  const material=new THREE.MeshStandardMaterial({color,emissive:glow?color:'#000000',emissiveIntensity:glow?2:0,roughness:1,metalness:0,opacity,transparent:true,depthWrite:false,blending:glow?THREE.AdditiveBlending:THREE.NormalBlending});storage.materials.set('effect-'+material.uuid,material);
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;return mesh;
 };
 const entries=events.map((event,index)=>{
  const site=model.effectSites!.find(s=>s.id===event.site)!;
  const group=new THREE.Group();group.name='effect-'+index;group.matrixAutoUpdate=false;layer.add(group);
  const flame=pool(18,site.fireColor,.7,true),smoke=pool(20,site.smokeColor,.24),sparks=pool(24,site.sparkColor,.9,true),flash=pool(1,site.sparkColor,.95,true);
  group.add(flame,smoke,sparks,flash);
  const selected=site.debris.length?site.debris:[site.part];
  const debris=event.result==='break'?model.parts.filter(p=>nodes.get(p.id)!.mesh&&selected.some(id=>inside(p.id,id))).slice(0,24).map(p=>{
   const mesh=nodes.get(p.id)!.mesh!.clone();mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>tint(m,.6)):tint(mesh.material,.6);mesh.name='debris-'+p.id;mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;layer.add(mesh);return {id:p.id,mesh};
  }):[];
  return {event,site,group,flame,smoke,sparks,flash,debris};
 });
 const dummy=new THREE.Object3D(),inverse=new THREE.Matrix4(),offset=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 const align=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 const reset=()=>{for(const [id,material]of original)nodes.get(id)!.mesh!.material=material;for(const n of nodes.values())n.content.visible=true;};
 const update=(time:number,pose:(at:number)=>void)=>{
  // Capture each explosion's original animated attachment and owner pose, then
  // restore the current pose. This also works when first seeking after impact.
  const frozen=entries.map(({event,site,debris})=>{
   const fragmentsState=effectDebrisState3D(event,time);
   if(!(event.kind==='explode'&&effectState3D(event,time).active)&&!fragmentsState.active)return null;
   const captureAt=Math.max(0,event.kind==='burn'?fragmentsState.at:event.at);
   pose(captureAt);root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
   const owner=ownerAt?.(captureAt)??root.matrixWorld;
   const anchor=new THREE.Matrix4().multiplyMatrices(owner,new THREE.Matrix4().multiplyMatrices(inverse,nodes.get(site.part)!.content.matrixWorld));
   const fragments=debris.map(d=>new THREE.Matrix4().multiplyMatrices(owner,new THREE.Matrix4().multiplyMatrices(inverse,nodes.get(d.id)!.mesh!.matrixWorld)));
   return {anchor,fragments};
  });
  pose(time);root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  for(const [index,entry]of entries.entries()){
   const {event:e,site,group,flame,smoke,sparks,flash,debris}=entry,state=effectState3D(e,time),r=site.radius*Math.sqrt(e.intensity),age=Math.max(0,state.age);
   group.visible=state.active&&e.kind!=='damage';
   const anchor=frozen[index]?.anchor??nodes.get(site.part)!.content.matrixWorld;
   align.setFromUnitVectors(up,new THREE.Vector3(site.direction.x,site.direction.y,site.direction.z));
   offset.compose(new THREE.Vector3(site.position.x,site.position.y,site.position.z),align,new THREE.Vector3(1,1,1));
   group.matrix.multiplyMatrices(inverse,new THREE.Matrix4().multiplyMatrices(anchor,offset));
   if(group.visible){
    const envelope=Math.min(1,age/.08,(e.duration-age)/Math.min(.4,e.duration*.3)),burst=e.kind==='explode';
    for(const [channel,mesh]of [flame,smoke,sparks,flash].entries()){
     for(let i=0;i<mesh.count;i++){
      const a=random(e.seed,i,0)*Math.PI*2,z=random(e.seed,i,1)*2-1,s=Math.sqrt(1-z*z),vx=Math.cos(a)*s,vz=Math.sin(a)*s;
      const phase=random(e.seed,i,2),life=channel===0?.65:channel===1?1.6:.8,clock=(age/life+phase)%1;
      let x=0,y=0,zz=0,size=0,stretch=1;
      if(channel===3){size=burst?r*5*Math.max(0,1-age/Math.min(.23,e.duration)):0;}
      else if(channel===0){
       if(burst){const travel=(.25+phase)*r*age*3;x=vx*travel;y=z*travel;zz=vz*travel;size=r*(.35+phase*.45)*Math.max(0,1-state.progress)*envelope;}
       else{x=vx*r*.45;y=clock*r*1.9;zz=vz*r*.45;size=r*(.22+phase*.22)*(1-clock)*envelope;stretch=2.5;}
      }else if(channel===1){
       const t=burst?state.progress:clock;x=vx*r*(.3+t*.8);y=r*(burst?z*t+age*.8:clock*3);zz=vz*r*(.3+t*.8);size=r*(.4+t*1.1)*envelope;
      }else{
       const travel=burst?age*5*r:clock*2*r;x=vx*travel;y=(burst?z:Math.abs(z))*travel;zz=vz*travel;size=r*.045*(burst?1-state.progress:1-clock)*envelope;stretch=burst?2:1.6;
      }
      dummy.position.set(x,y,zz);dummy.rotation.set(age*(phase+.5),a,0);dummy.scale.set(size,size*stretch,size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
     }mesh.instanceMatrix.needsUpdate=true;
    }
   }
   for(const [j,d]of debris.entries()){
    const fragment=effectDebrisState3D(e,time);d.mesh.visible=fragment.active;if(!d.mesh.visible)continue;
    const frozenMatrix=frozen[index]!.fragments[j],center=new THREE.Vector3().setFromMatrixPosition(frozen[index]!.anchor),delta=new THREE.Vector3().setFromMatrixPosition(frozenMatrix).sub(center);
    if(delta.length()<.01)delta.set(random(e.seed,j,8)-.5,random(e.seed,j,9)-.5,random(e.seed,j,10)-.5);delta.normalize();
    frozenMatrix.decompose(position,rotation,scale);position.addScaledVector(delta,fragment.age*r*(1.5+random(e.seed,j,11)*2));
    rotation.multiply(new THREE.Quaternion().setFromAxisAngle(delta,fragment.age*(1+random(e.seed,j,12)*4)));scale.multiplyScalar(Math.min(1,(fragment.duration-fragment.age)/.35));
    d.mesh.matrix.multiplyMatrices(inverse,new THREE.Matrix4().compose(position,rotation,scale));
   }
  }
  // Apply persistent damage LAST, never contaminate other event captures.
  for(const {event:e,site}of entries){const state=effectState3D(e,time);if(state.result==='none')continue;
   if(state.result==='hide'||state.result==='break')nodes.get(site.part)!.content.visible=false;
   else for(const p of model.parts.filter(p=>inside(p.id,site.part))){const mesh=nodes.get(p.id)!.mesh;if(mesh)mesh.material=Array.isArray(original.get(p.id))?(original.get(p.id) as THREE.Material[]).map(m=>tint(m,e.intensity)):tint(original.get(p.id) as THREE.Material,e.intensity);}
  }
 };
 return {reset,update};
}
