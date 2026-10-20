import * as THREE from 'three';
import {actor3DPose,type Shot3D,type Actor3D,type Character3D,type Stage3D} from '../lib/stage3d';
import type {Project} from '../lib/model';
type Robot={actor:Actor3D;root:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group};
type World={scene:THREE.Scene;robots:Robot[];geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
/** A bounded cache and ONE GPU context per owner, never a new context per frame. */
export class Stage3DRenderer{
 private renderer:THREE.WebGLRenderer;private camera=new THREE.PerspectiveCamera(38,1,.1,160);private cache=new Map<string,World>();private disposed=false;private lost=false;private size=new THREE.Vector2();
 constructor(){
  try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch{throw new Error('3D: WebGL 2 is not available on this device.');}
  this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.renderer.domElement.addEventListener('webglcontextlost',this.onLost);
 }
 private onLost=(event:Event)=>{event.preventDefault();this.lost=true;};
 private release(world:World){world.scene.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();});world.geometries.forEach(g=>g.dispose());world.materials.forEach(m=>m.dispose());world.scene.clear();}
 private world(stage:Stage3D,characters:Project['characters'],actors:Actor3D[],studio=false):World{
  const scene=new THREE.Scene();scene.background=new THREE.Color(stage.skyColor);scene.fog=new THREE.Fog(stage.skyColor,35,85);
  const world:World={scene,robots:[],geometries:new Set(),materials:new Map()};
  const cube=new THREE.BoxGeometry(1,1,1);world.geometries.add(cube);
  const material=(color:string)=>{let m=world.materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.08});world.materials.set(color,m);}return m;};
  const box=(parent:THREE.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  scene.add(new THREE.HemisphereLight('#ffffff','#72864c',2.3));const sun=new THREE.DirectionalLight('#fff2d4',3.5);sun.position.set(-8,14,8);scene.add(sun);
  box(scene,stage.groundColor,0,-.32,0,56,.6,56);
  if(!studio){
  // Raised plaza, stepping stones and a small arch create depth without external assets.
  box(scene,'#c7d4d9',0,-.08,0,16,.25,10);
  for(let x=-7;x<=7;x+=2)for(let z=-4;z<=4;z+=2)box(scene,(x+z)%4===0?'#dce6e7':'#b8c9ce',x,.055,z,1.94,.05,1.94);
  const studGeometry=new THREE.CylinderGeometry(.13,.13,.09,8);world.geometries.add(studGeometry);
  const studs=new THREE.InstancedMesh(studGeometry,material(stage.groundColor),224);const dummy=new THREE.Object3D();let n=0;
  for(let x=-14;x<=13;x+=2)for(let z=-14;z<=16;z+=2){dummy.position.set(x,.04,z);dummy.updateMatrix();studs.setMatrixAt(n++,dummy.matrix);}scene.add(studs);
  for(const [x,z,h,c] of [[-9,-7,4,'#e6956e'],[8,-8,6,stage.blockColor],[-12,2,3,'#8fb5cf'],[12,0,4,'#9c9ed2']] as const){box(scene,c,x,h/2,z,3,h,3);box(scene,'#f4e6c6',x,h+.2,z,3.35,.4,3.35);for(let y=1;y<h;y+=1.5)box(scene,'#537b95',x,y,z+1.52,1,.7,.06);}
  box(scene,stage.blockColor,-3,2,-8,1,4,1);box(scene,stage.blockColor,3,2,-8,1,4,1);box(scene,'#fff0cd',0,4.3,-8,7,1,1.3);
  for(const [x,z] of [[-7,5],[8,5],[-6,-11],[12,-11]]){box(scene,'#946c47',x,1.2,z,.65,2.4,.65);box(scene,'#4d9466',x,3,z,2.6,2.3,2.6);box(scene,'#6cad73',x-.35,4.3,z,1.8,1,1.8);}
  }
  // Low-cost soft ground marks instead of expensive real-time shadow maps.
  const shadowGeometry=new THREE.CircleGeometry(.85,24);world.geometries.add(shadowGeometry);
  const shadowMaterial=new THREE.MeshStandardMaterial({color:'#526674',transparent:true,opacity:.18,depthWrite:false});world.materials.set('shadow',shadowMaterial);
  const robot=(a:Actor3D,c:Character3D)=>{
   const root=new THREE.Group();scene.add(root);const factor=c.height/3*a.scale;root.scale.setScalar(factor);
   const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.1;root.add(shadow);
   box(root,c.bodyColor,0,1.65,0,1.15,1.05,.65);box(root,c.accentColor,0,1.7,.345,.55,.45,.08);box(root,'#effaff',0,1.72,.4,.16,.15,.04);
   box(root,c.limbColor,0,2.26,0,.35,.2,.35);box(root,c.headColor,0,2.67,0,.96,.75,.8);box(root,'#213746',0,2.71,.414,.76,.34,.04);
   box(root,c.accentColor,-.21,2.75,.445,.17,.12,.03);box(root,c.accentColor,.21,2.75,.445,.17,.12,.03);box(root,c.headColor,0,2.49,.45,.23,.045,.03);
   box(root,c.limbColor,0,3.12,0,.1,.25,.1);box(root,c.accentColor,0,3.26,0,.23,.12,.23);
   const limb=(x:number,y:number,leg:boolean)=>{const pivot=new THREE.Group();pivot.position.set(x,y,0);root.add(pivot);box(pivot,c.limbColor,0,leg?-.48:-.42,0,leg?.38:.32,leg?.85:.72,.4);box(pivot,leg?c.bodyColor:c.headColor,0,leg?-.89:-.87,leg?.1:0,leg?.44:.38,.28,leg?.66:.44);return pivot;};
   const leftArm=limb(-.78,2.05,false),rightArm=limb(.78,2.05,false),leftLeg=limb(-.31,1.13,true),rightLeg=limb(.31,1.13,true);
   return {actor:a,root,leftArm,rightArm,leftLeg,rightLeg};
  };
  world.robots=actors.map(a=>robot(a,characters[a.character]));return world;
 }
 render(project:Project,shot:Shot3D,time:number,width:number,height:number,target:HTMLCanvasElement,studio=false){
  if(this.disposed||this.lost)throw new Error('3D: graphics context unavailable. Reload the project before exporting.');
  const definitions=Object.fromEntries(shot.actors.map(a=>[a.character,project.characters[a.character]]));
  const key=JSON.stringify([project.stages[shot.stage],definitions,shot.actors,studio]);let world=this.cache.get(key);
  if(!world){world=this.world(project.stages[shot.stage],project.characters,shot.actors,studio);this.cache.set(key,world);if(this.cache.size>2){const oldest=this.cache.keys().next().value!;this.release(this.cache.get(oldest)!);this.cache.delete(oldest);}}
  else{this.cache.delete(key);this.cache.set(key,world);}
  for(const r of world.robots){const p=actor3DPose(r.actor,time);r.root.position.set(p.x,p.bob,p.z);r.root.rotation.y=p.rotation;r.leftArm.rotation.x=p.leftArm;r.rightArm.rotation.x=p.rightArm;r.rightArm.rotation.z=p.wave;r.leftLeg.rotation.x=p.leftLeg;r.rightLeg.rotation.x=p.rightLeg;}
  const c=shot.camera,yaw=(c.yaw+c.orbit*time)*Math.PI/180,pitch=c.pitch*Math.PI/180;
  this.camera.position.set(c.targetX+Math.sin(yaw)*Math.cos(pitch)*c.distance,c.targetY+Math.sin(pitch)*c.distance,c.targetZ+Math.cos(yaw)*Math.cos(pitch)*c.distance);this.camera.lookAt(c.targetX,c.targetY,c.targetZ);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  this.renderer.getSize(this.size);if(this.size.x!==width||this.size.y!==height)this.renderer.setSize(width,height,false);this.renderer.render(world.scene,this.camera);
  if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
  const ctx=target.getContext('2d');if(!ctx)throw new Error('3D: cannot copy rendered frame');ctx.clearRect(0,0,width,height);ctx.drawImage(this.renderer.domElement,0,0);
  target.dataset.stage3dTime=String(time);target.dataset.stage3dStage=shot.stage;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.cache.forEach(w=>this.release(w));this.cache.clear();this.renderer.domElement.removeEventListener('webglcontextlost',this.onLost);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.width=0;this.renderer.domElement.height=0;}
}
