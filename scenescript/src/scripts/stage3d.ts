import * as THREE from 'three';
import {createModel3D} from './model3d';
import {actor3DMouth,emptySpeechEnvelopes,type SpeechEnvelopes} from '../lib/stage3d-speech';
import {presetCharacterModel3D,presetStageModel3D} from '../lib/stage3d-presets';
import {actor3DFace,actor3DPose,type Shot3D,type Actor3D,type Character3D,type Stage3D} from '../lib/stage3d';
import type {Project} from '../lib/model';
type Custom3D=ReturnType<typeof createModel3D>&{actor:Actor3D;character:Character3D};
type World={framing:{center:THREE.Vector3;size:THREE.Vector3}|null;custom:Custom3D[];stageModel:ReturnType<typeof createModel3D>|null;scene:THREE.Scene;geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
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
  const world:World={framing:null,custom:[],stageModel:null,scene,geometries:new Set(),materials:new Map()};
  const cube=new THREE.BoxGeometry(1,1,1);world.geometries.add(cube);
  const material=(color:string)=>{let m=world.materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.08});world.materials.set(color,m);}return m;};
  const box=(parent:THREE.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  scene.add(new THREE.HemisphereLight('#ffffff','#72864c',2.3));const sun=new THREE.DirectionalLight('#fff2d4',3.5);sun.position.set(-8,14,8);scene.add(sun);
  box(scene,stage.groundColor,0,-.32,0,56,.6,56);
  if(!studio){world.stageModel=createModel3D(stage.model??presetStageModel3D(),world,stage);scene.add(world.stageModel.root);}
  for(const actor of actors){const character=characters[actor.character],model=createModel3D(character.model??presetCharacterModel3D(character.style),world,character);model.root.scale.setScalar(character.height/3*actor.scale);scene.add(model.root);world.custom.push({...model,actor,character});}
  if(studio&&world.custom.length===1){const bounds=new THREE.Box3().setFromObject(world.custom[0].root);if(!bounds.isEmpty())world.framing={center:bounds.getCenter(new THREE.Vector3()),size:bounds.getSize(new THREE.Vector3())};}return world;
 }
 render(project:Project,shot:Shot3D,time:number,width:number,height:number,target:HTMLCanvasElement,studio=false,speech:SpeechEnvelopes=emptySpeechEnvelopes){
  if(this.disposed||this.lost)throw new Error('3D: graphics context unavailable. Reload the project before exporting.');
  const definitions=Object.fromEntries(shot.actors.map(a=>[a.character,project.characters[a.character]]));
  const key=JSON.stringify([project.stages[shot.stage],definitions,shot.actors,studio]);let world=this.cache.get(key);
  if(!world){world=this.world(project.stages[shot.stage],project.characters,shot.actors,studio);this.cache.set(key,world);if(this.cache.size>2){const oldest=this.cache.keys().next().value!;this.release(this.cache.get(oldest)!);this.cache.delete(oldest);}}
  else{this.cache.delete(key);this.cache.set(key,world);}
  world.stageModel?.update(shot.stageJoints??{},shot.stageMotions??[],time);
  for(const r of world.custom){
   const pose=actor3DPose(r.actor,time,shot.actors),face=actor3DFace(r.actor,time,r.character.expression),mouth=actor3DMouth(project,shot,r.actor,time,speech);
   r.root.position.set(pose.x,r.actor.y,pose.z);r.root.rotation.set(r.actor.pitch*Math.PI/180,pose.rotation,r.actor.roll*Math.PI/180);
   r.update(r.actor.joints,r.actor.motions,time,{...face,speech:mouth,mouth:Math.max(mouth,face.surprised),leftArm:pose.leftArm/Math.PI,rightArm:pose.rightArm/Math.PI,leftLeg:pose.leftLeg/Math.PI,rightLeg:pose.rightLeg/Math.PI,wave:pose.wave/(Math.PI/2),bob:pose.bob/.1});
  }
  const c=world.framing?{...shot.camera,targetX:world.framing.center.x,targetY:world.framing.center.y,targetZ:world.framing.center.z,distance:Math.min(80,Math.max(5.5,world.framing.size.length()/2/Math.sin(19*Math.PI/180)*1.12/Math.min(1,width/height)))}:shot.camera,yaw=(c.yaw+c.orbit*time)*Math.PI/180,pitch=c.pitch*Math.PI/180;
  this.camera.position.set(c.targetX+Math.sin(yaw)*Math.cos(pitch)*c.distance,c.targetY+Math.sin(pitch)*c.distance,c.targetZ+Math.cos(yaw)*Math.cos(pitch)*c.distance);this.camera.lookAt(c.targetX,c.targetY,c.targetZ);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  this.renderer.getSize(this.size);if(this.size.x!==width||this.size.y!==height)this.renderer.setSize(width,height,false);this.renderer.render(world.scene,this.camera);
  if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
  const ctx=target.getContext('2d');if(!ctx)throw new Error('3D: cannot copy rendered frame');ctx.clearRect(0,0,width,height);ctx.drawImage(this.renderer.domElement,0,0);
  target.dataset.stage3dTime=String(time);target.dataset.stage3dStage=shot.stage;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.cache.forEach(w=>this.release(w));this.cache.clear();this.renderer.domElement.removeEventListener('webglcontextlost',this.onLost);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.width=0;this.renderer.domElement.height=0;}
}
