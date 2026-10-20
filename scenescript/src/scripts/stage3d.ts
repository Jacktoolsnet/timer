import {groupMembers3D,groupMemberFrame3D,groupAnimationTime3D,type Group3D,type GroupPlacement3D,type GroupMember3D} from '../lib/group3d';
import {cameraPose3D} from '../lib/camera3d';
import * as THREE from 'three';
import {createModel3D} from './model3d';
import {actor3DMouth,emptySpeechEnvelopes,type SpeechEnvelopes} from '../lib/stage3d-speech';
import {presetCharacterModel3D,presetStageModel3D} from '../lib/stage3d-presets';
import {actor3DFace,actor3DPose,actor3DFrame,type Shot3D,type Actor3D,type Character3D,type Stage3D} from '../lib/stage3d';
import type {Project} from '../lib/model';
type Custom3D=ReturnType<typeof createModel3D>&{actor:Actor3D;character:Character3D};
type GroupCopy3D=ReturnType<typeof createModel3D>&{member:GroupMember3D;placement:GroupPlacement3D;duration:number;controls:Record<string,number>;motions:Actor3D['motions']};
type World={members:GroupCopy3D[];framing:{center:THREE.Vector3;size:THREE.Vector3}|null;custom:Custom3D[];stageModel:ReturnType<typeof createModel3D>|null;scene:THREE.Scene;geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
/** A bounded cache and ONE GPU context per owner, never a new context per frame. */
export class Stage3DRenderer{
 private renderer:THREE.WebGLRenderer;private basis=new THREE.Matrix4();private axisX=new THREE.Vector3();private axisY=new THREE.Vector3();private axisZ=new THREE.Vector3();private camera=new THREE.PerspectiveCamera(38,1,.1,160);private cache=new Map<string,World>();private disposed=false;private lost=false;private size=new THREE.Vector2();
 constructor(){
  try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch{throw new Error('3D: WebGL 2 is not available on this device.');}
  this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.renderer.domElement.addEventListener('webglcontextlost',this.onLost);
 }
 private onLost=(event:Event)=>{event.preventDefault();this.lost=true;};
 private release(world:World){world.scene.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();});world.geometries.forEach(g=>g.dispose());world.materials.forEach(m=>m.dispose());world.scene.clear();}
 private world(stage:Stage3D,characters:Project['characters'],actors:Actor3D[],groups:Record<string,Group3D>,placements:GroupPlacement3D[],studio=false):World{
  const scene=new THREE.Scene();scene.background=new THREE.Color(stage.skyColor);scene.fog=new THREE.Fog(stage.skyColor,35,85);
  const world:World={members:[],framing:null,custom:[],stageModel:null,scene,geometries:new Set(),materials:new Map()};
  const cube=new THREE.BoxGeometry(1,1,1);world.geometries.add(cube);
  const material=(color:string)=>{let m=world.materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.08});world.materials.set(color,m);}return m;};
  const box=(parent:THREE.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  scene.add(new THREE.HemisphereLight('#ffffff','#72864c',2.3));const sun=new THREE.DirectionalLight('#fff2d4',3.5);sun.position.set(-8,14,8);scene.add(sun);
  box(scene,stage.groundColor,0,-.32,0,56,.6,56);
  if(!studio){world.stageModel=createModel3D(stage.model??presetStageModel3D(),world,stage);scene.add(world.stageModel.root);}
  for(const actor of actors){const character=characters[actor.character],model=createModel3D(character.model??presetCharacterModel3D(character.style),world,character);model.root.scale.setScalar(character.height/3*actor.scale);scene.add(model.root);world.custom.push({...model,actor,character});}
  for(const placement of placements){const group=groups[placement.group];for(const member of groupMembers3D(group)){
   const character=characters[member.character],model=createModel3D(character.model??presetCharacterModel3D(character.style),world,character),frame=groupMemberFrame3D(member,placement);
   model.root.position.set(frame.position.x,frame.position.y,frame.position.z);model.root.rotation.y=(placement.rotation+member.rotation)*Math.PI/180;model.root.scale.setScalar(character.height/3*member.scale*placement.scale);scene.add(model.root);
   const clip=group.animation?character.model?.animations[group.animation]:undefined;world.members.push({...model,member,placement,duration:clip?.duration??1,controls:{...(character.expression==='neutral'?{}:{[character.expression]:1}),speech:0,mouth:character.expression==='surprised'?1:0},motions:clip?[{animation:group.animation,at:0,duration:clip.duration+1,speed:1,loop:true,blend:0}]:[]});
  }}
  if(studio&&(world.custom.length||world.members.length)){const bounds=new THREE.Box3();for(const r of [...world.custom,...world.members])bounds.expandByObject(r.root);if(!bounds.isEmpty())world.framing={center:bounds.getCenter(new THREE.Vector3()),size:bounds.getSize(new THREE.Vector3())};}return world;
 }
 render(project:Project,shot:Shot3D,time:number,width:number,height:number,target:HTMLCanvasElement,studio=false,speech:SpeechEnvelopes=emptySpeechEnvelopes){
  if(this.disposed||this.lost)throw new Error('3D: graphics context unavailable. Reload the project before exporting.');
  const placements=shot.groups??[],groups=Object.fromEntries(placements.map(p=>[p.group,project.groups3d[p.group]])),refs=new Set([...shot.actors.map(a=>a.character),...Object.values(groups).flatMap(g=>g.characters)]),definitions=Object.fromEntries([...refs].map(id=>[id,project.characters[id]]));
  const key=JSON.stringify([project.stages[shot.stage],definitions,shot.actors,groups,placements,studio]);let world=this.cache.get(key);
  if(!world){world=this.world(project.stages[shot.stage],project.characters,shot.actors,groups,placements,studio);this.cache.set(key,world);if(this.cache.size>2){const oldest=this.cache.keys().next().value!;this.release(this.cache.get(oldest)!);this.cache.delete(oldest);}}
  else{this.cache.delete(key);this.cache.set(key,world);}
  world.stageModel?.update(shot.stageJoints??{},shot.stageMotions??[],time);
  for(const r of world.members)r.update({},r.motions,groupAnimationTime3D(r.member,r.placement,time,r.duration),r.controls);
  const paths=project.stages[shot.stage].paths??{};
  for(const r of world.custom){
   const pose=actor3DPose(r.actor,time,shot.actors,paths),face=actor3DFace(r.actor,time,r.character.expression),mouth=actor3DMouth(project,shot,r.actor,time,speech);
   const frame=actor3DFrame(r.actor,time,shot.actors,paths);r.root.position.set(frame.position.x,frame.position.y,frame.position.z);
   this.basis.makeBasis(this.axisX.set(frame.right.x,frame.right.y,frame.right.z),this.axisY.set(frame.up.x,frame.up.y,frame.up.z),this.axisZ.set(frame.forward.x,frame.forward.y,frame.forward.z));r.root.quaternion.setFromRotationMatrix(this.basis);
   r.update(r.actor.joints,r.actor.motions,time,{...face,speech:mouth,mouth:Math.max(mouth,face.surprised),leftArm:pose.leftArm/Math.PI,rightArm:pose.rightArm/Math.PI,leftLeg:pose.leftLeg/Math.PI,rightLeg:pose.rightLeg/Math.PI,wave:pose.wave/(Math.PI/2),bob:pose.bob/.1});
  }
  const c=world.framing?{...shot.camera,targetX:world.framing.center.x,targetY:world.framing.center.y,targetZ:world.framing.center.z,distance:Math.min(80,Math.max(5.5,world.framing.size.length()/2/Math.sin(19*Math.PI/180)*1.12/Math.min(1,width/height)))}:shot.camera;
  const view=cameraPose3D(c,time,id=>actor3DFrame(shot.actors.find(a=>a.id===id)!,time,shot.actors,paths));
  this.camera.position.set(view.position.x,view.position.y,view.position.z);this.camera.up.set(view.up.x,view.up.y,view.up.z);this.camera.lookAt(view.target.x,view.target.y,view.target.z);this.camera.fov=c.fov??38;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  this.renderer.getSize(this.size);if(this.size.x!==width||this.size.y!==height)this.renderer.setSize(width,height,false);this.renderer.render(world.scene,this.camera);
  if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
  const ctx=target.getContext('2d');if(!ctx)throw new Error('3D: cannot copy rendered frame');ctx.clearRect(0,0,width,height);ctx.drawImage(this.renderer.domElement,0,0);
  target.dataset.stage3dTime=String(time);target.dataset.stage3dStage=shot.stage;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.cache.forEach(w=>this.release(w));this.cache.clear();this.renderer.domElement.removeEventListener('webglcontextlost',this.onLost);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.width=0;this.renderer.domElement.height=0;}
}
