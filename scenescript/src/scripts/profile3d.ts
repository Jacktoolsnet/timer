import * as THREE from 'three';
import {profileSample3D,type Profile3D} from '../lib/profile3d';
/** Fixed topology, reusable buffers and smooth top normals. No geometry/texture allocation per frame. */
export function createProfileGeometry3D(profile:Profile3D,segments=96){
 const pairs=segments+1,stripVertices=2*pairs,vertices=stripVertices*4+8,positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),uvs=new Float32Array(vertices*2),indices:number[]=[];
 for(let side=0;side<4;side++)for(let i=0;i<segments;i++){const a=side*stripVertices+2*i,b=a+1,c=a+2,d=a+3;if(side===0||side===2)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);}
 const end=stripVertices*4;indices.push(end,end+1,end+2,end+1,end+3,end+2,end+4,end+6,end+5,end+5,end+6,end+7);
 const geometry=new THREE.BufferGeometry();geometry.name='ProfileGeometry3D';geometry.setIndex(indices);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage));
 geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,1,.5));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.5,0),Math.sqrt(.75));let previous=NaN;
 const vertex=(i:number,x:number,y:number,z:number,nx:number,ny:number,nz:number,u:number,v:number)=>{const p=i*3,t=i*2;positions[p]=x;positions[p+1]=y;positions[p+2]=z;normals[p]=nx;normals[p+1]=ny;normals[p+2]=nz;uvs[t]=u;uvs[t+1]=v;};
 const update=(morph:number)=>{
  if(morph===previous)return;previous=morph;
  for(let i=0;i<=segments;i++){
   const u=i/segments,x=u-.5,{height:h,derivative:d}=profileSample3D(profile,u,morph),length=Math.hypot(d,1),a=i*2;
   vertex(a,x,0,.5,0,0,1,u,0);vertex(a+1,x,h,.5,0,0,1,u,h);
   vertex(stripVertices+a,x,0,-.5,0,0,-1,1-u,0);vertex(stripVertices+a+1,x,h,-.5,0,0,-1,1-u,h);
   vertex(stripVertices*2+a,x,h,.5,-d/length,1/length,0,u,1);vertex(stripVertices*2+a+1,x,h,-.5,-d/length,1/length,0,u,0);
   vertex(stripVertices*3+a,x,0,.5,0,-1,0,u,1);vertex(stripVertices*3+a+1,x,0,-.5,0,-1,0,u,0);
  }
  for(let side=0;side<2;side++){const x=side-.5,h=profileSample3D(profile,side,morph).height,n=side?1:-1,at=end+side*4;vertex(at,x,0,.5,n,0,0,1,0);vertex(at+1,x,h,.5,n,0,0,1,h);vertex(at+2,x,0,-.5,n,0,0,0,0);vertex(at+3,x,h,-.5,n,0,0,0,h);}
  for(const name of ['position','normal','uv'])geometry.getAttribute(name).needsUpdate=true;
 };update(0);return {geometry,update};
}
