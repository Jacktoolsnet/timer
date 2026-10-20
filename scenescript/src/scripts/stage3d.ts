import * as THREE from 'three';
import {createModel3D} from './model3d';
import {actor3DMouth,emptySpeechEnvelopes,type SpeechEnvelopes} from '../lib/stage3d-speech';
import {facePixel3D} from '../lib/stage3d-face';
import {actor3DFace,type FacePose3D,actor3DPose,type Shot3D,type Actor3D,type Character3D,type Stage3D} from '../lib/stage3d';
import type {Project} from '../lib/model';
type Robot={actor:Actor3D;character:Character3D;updateFace:(pose:FacePose3D,mouth?:number)=>void;root:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group};
type Custom3D=ReturnType<typeof createModel3D>&{actor:Actor3D;character:Character3D};
type World={custom:Custom3D[];stageModel:ReturnType<typeof createModel3D>|null;scene:THREE.Scene;robots:Robot[];geometries:Set<THREE.BufferGeometry>;materials:Map<string,THREE.MeshStandardMaterial>};
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
  const world:World={custom:[],stageModel:null,scene,robots:[],geometries:new Set(),materials:new Map()};
  const cube=new THREE.BoxGeometry(1,1,1);world.geometries.add(cube);
  const material=(color:string)=>{let m=world.materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.08});world.materials.set(color,m);}return m;};
  const box=(parent:THREE.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  scene.add(new THREE.HemisphereLight('#ffffff','#72864c',2.3));const sun=new THREE.DirectionalLight('#fff2d4',3.5);sun.position.set(-8,14,8);scene.add(sun);
  box(scene,stage.groundColor,0,-.32,0,56,.6,56);
  if(!studio&&!stage.model){
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
  if(!studio&&stage.model){world.stageModel=createModel3D(stage.model,world);scene.add(world.stageModel.root);}
  // Low-cost soft ground marks instead of expensive real-time shadow maps.
  const shadowGeometry=new THREE.CircleGeometry(.85,24);world.geometries.add(shadowGeometry);
  const shadowMaterial=new THREE.MeshStandardMaterial({color:'#526674',transparent:true,opacity:.18,depthWrite:false});world.materials.set('shadow',shadowMaterial);
  const robot=(a:Actor3D,c:Character3D)=>{
   const root=new THREE.Group();scene.add(root);const factor=c.height/3*a.scale;root.scale.setScalar(factor);
   const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.1;root.add(shadow);
   const person=c.style==='brick';
   box(root,c.bodyColor,0,1.65,0,1.15,1.05,.65);
   if(!person){box(root,c.accentColor,0,1.7,.345,.55,.45,.08);box(root,'#effaff',0,1.72,.4,.16,.15,.04);}
   else{box(root,c.accentColor,0,1.22,.34,1.08,.12,.04);for(const y of [1.5,1.8,2])box(root,c.accentColor,0,y,.34,.07,.07,.04);}
   box(root,person?c.headColor:c.limbColor,0,2.26,0,.35,.2,.35);
   // Stable face geometry is built once; only transforms change per frame.
   const face=new THREE.Group();face.name='face';root.add(face);
   const part=(name:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{const mesh=box(face,color,x,y,z,w,h,d);mesh.name=name;return mesh;};
   const pixelMeshes:THREE.Mesh[]=[];
   if(person){
    const headGeometry=new THREE.CylinderGeometry(.48,.48,.75,32);world.geometries.add(headGeometry);
    const head=new THREE.Mesh(headGeometry,material(c.headColor));head.position.y=2.67;root.add(head);
    box(root,c.headColor,0,3.09,0,.32,.13,.32);
    for(const x of [-.19,.19]){part('eye','#213746',x,2.77,.441,.09,.13,.055);part('eye-highlight','#ffffff',x-.015,2.8,.474,.025,.035,.015);}
    part('nose',c.headColor,0,2.63,.5,.14,.15,.17);
    for(const [x,y] of [[-.19,2.51],[-.12,2.47],[0,2.45],[.12,2.47],[.19,2.51]])part('mouth','#663d32',x,y,Math.sqrt(.48*.48-x*x)+.012,.085,.045,.04);
   }else{
    box(root,c.headColor,0,2.67,0,.96,.75,.8);
    if(c.style==='pixel'){
     part('monitor-frame',c.limbColor,0,2.67,.432,.88,.64,.1);
     part('monitor','#101e2c',0,2.67,.492,.78,.54,.035);
     // A real 12×8 pixel face, with gaps instead of a blurred texture.
     for(let row=0;row<8;row++)for(let col=0;col<12;col++)pixelMeshes.push(part('face-pixel',c.accentColor,(col-5.5)*.058,2.67+(3.5-row)*.058,.518,.046,.046,.02));
    }else{
     part('visor','#213746',0,2.71,.414,.76,.34,.04);
     part('eye',c.accentColor,-.21,2.75,.445,.17,.12,.03);part('eye',c.accentColor,.21,2.75,.445,.17,.12,.03);
     if(c.style==='robot'){
      part('mouth-frame',c.limbColor,0,2.43,.43,.54,.16,.06);
      part('mouth','#142733',0,2.43,.468,.44,.09,.025);
      for(const x of [-.14,0,.14])part('mouth-grille',c.headColor,x,2.43,.486,.027,.08,.02);
     }else part('mouth',c.headColor,0,2.49,.45,.23,.045,.03);
    }
    box(root,c.limbColor,0,3.12,0,.1,.25,.1);box(root,c.accentColor,0,3.26,0,.23,.12,.23);
   }
   if(c.style!=='pixel'){
    for(const x of [-.2,.2])part('brow',person?'#663d32':c.accentColor,x,2.94,person?.446:.45,.19,.035,.035);
    if(person){
     const mouthGeometry=new THREE.CylinderGeometry(.085,.085,.035,16);world.geometries.add(mouthGeometry);
     const mouth=new THREE.Mesh(mouthGeometry,material('#663d32'));mouth.name='surprise-mouth';mouth.position.set(0,2.43,.496);mouth.rotation.x=Math.PI/2;face.add(mouth);
    }
   }
   const parts=face.children.map(mesh=>({mesh:mesh as THREE.Mesh,position:mesh.position.clone(),scale:mesh.scale.clone()}));
   const updateFace=(p:FacePose3D,mouth=0)=>{
    const open=Math.max(p.surprised,mouth);
    if(c.style==='pixel'){
     pixelMeshes.forEach((mesh,i)=>{const weight=facePixel3D(p,Math.floor(i/12),i%12,mouth);mesh.visible=weight>1e-5;mesh.scale.set(.046*weight,.046*weight,.02);});return;
    }
    const eyeScale=(1-.3*p.happy-.2*p.sad-.35*p.angry+.45*p.surprised)*(1-.95*p.blink);
    for(const {mesh,position,scale} of parts){
     mesh.position.copy(position);mesh.scale.copy(scale);mesh.rotation.z=0;mesh.visible=true;
     const side=Math.sign(position.x);
     if(mesh.name==='eye'||mesh.name==='eye-highlight'){mesh.scale.y*=eyeScale;mesh.rotation.z=side*(p.angry*.22-p.sad*.12);if(mesh.name==='eye-highlight')mesh.visible=p.blink<.8;}
     if(mesh.name==='brow'){
      const strength=Math.max(p.happy*.4,p.sad,p.angry,p.surprised);mesh.visible=strength>1e-5;mesh.scale.y*=strength;
      mesh.rotation.z=side*(p.angry*.45-p.sad*.4);mesh.position.y+=p.surprised*.035-p.angry*.04;
     }
     if(mesh.name==='mouth'){
      if(person){const edge=Math.abs(position.x)/.19;mesh.position.y+=p.happy*.06*(edge-.5)-(p.sad+p.angry*.7)*.18*(edge-.5);mesh.scale.x*=1-open;mesh.scale.y*=1-open;}
      else{mesh.scale.x*=1-.55*open;mesh.scale.y*=1+open*1.6;mesh.rotation.z=p.sad*.12;mesh.position.y+=p.happy*.015-p.sad*.015;}
     }
     if(mesh.name==='mouth-frame'){mesh.scale.y*=1+open*.9;mesh.scale.x*=1-open*.35;}
     if(mesh.name==='mouth-grille'){mesh.scale.y*=1-open;mesh.position.y+=(Math.abs(position.x)/.14-.5)*(.045*p.happy-.045*p.sad);}
     if(mesh.name==='surprise-mouth'){mesh.visible=open>1e-5;mesh.scale.set(open,1,open*1.4);}
    }
   };
   const limb=(x:number,y:number,leg:boolean)=>{const pivot=new THREE.Group();pivot.position.set(x,y,0);root.add(pivot);box(pivot,person&&!leg?c.bodyColor:c.limbColor,0,leg?-.48:-.42,0,leg?.38:.32,leg?.85:.72,.4);box(pivot,leg?(person?c.limbColor:c.bodyColor):c.headColor,0,leg?-.89:-.87,leg?.1:0,leg?.44:.38,.28,leg?.66:.44);return pivot;};
   const leftArm=limb(-.78,2.05,false),rightArm=limb(.78,2.05,false),leftLeg=limb(-.31,1.13,true),rightLeg=limb(.31,1.13,true);
   return {actor:a,character:c,updateFace,root,leftArm,rightArm,leftLeg,rightLeg};
  };
  for(const actor of actors){const character=characters[actor.character];if(character.model){const model=createModel3D(character.model,world);model.root.scale.setScalar(character.height/3*actor.scale);scene.add(model.root);world.custom.push({...model,actor,character});}else world.robots.push(robot(actor,character));}return world;
 }
 render(project:Project,shot:Shot3D,time:number,width:number,height:number,target:HTMLCanvasElement,studio=false,speech:SpeechEnvelopes=emptySpeechEnvelopes){
  if(this.disposed||this.lost)throw new Error('3D: graphics context unavailable. Reload the project before exporting.');
  const definitions=Object.fromEntries(shot.actors.map(a=>[a.character,project.characters[a.character]]));
  const key=JSON.stringify([project.stages[shot.stage],definitions,shot.actors,studio]);let world=this.cache.get(key);
  if(!world){world=this.world(project.stages[shot.stage],project.characters,shot.actors,studio);this.cache.set(key,world);if(this.cache.size>2){const oldest=this.cache.keys().next().value!;this.release(this.cache.get(oldest)!);this.cache.delete(oldest);}}
  else{this.cache.delete(key);this.cache.set(key,world);}
  for(const r of world.robots){r.updateFace(actor3DFace(r.actor,time,r.character.expression),actor3DMouth(project,shot,r.actor,time,speech));const p=actor3DPose(r.actor,time,shot.actors);r.root.position.set(p.x,r.actor.y+p.bob,p.z);r.root.rotation.set(r.actor.pitch*Math.PI/180,p.rotation,r.actor.roll*Math.PI/180);r.leftArm.rotation.x=p.leftArm;r.rightArm.rotation.x=p.rightArm;r.rightArm.rotation.z=p.wave;r.leftLeg.rotation.x=p.leftLeg;r.rightLeg.rotation.x=p.rightLeg;}
  world.stageModel?.update(shot.stageJoints??{},shot.stageMotions??[],time);
  for(const r of world.custom){
   const pose=actor3DPose(r.actor,time,shot.actors),face=actor3DFace(r.actor,time,r.character.expression),mouth=actor3DMouth(project,shot,r.actor,time,speech);
   r.root.position.set(pose.x,r.actor.y,pose.z);r.root.rotation.set(r.actor.pitch*Math.PI/180,pose.rotation,r.actor.roll*Math.PI/180);
   r.update(r.actor.joints,r.actor.motions,time,{...face,mouth:Math.max(mouth,face.surprised)});
  }
  const c=shot.camera,yaw=(c.yaw+c.orbit*time)*Math.PI/180,pitch=c.pitch*Math.PI/180;
  this.camera.position.set(c.targetX+Math.sin(yaw)*Math.cos(pitch)*c.distance,c.targetY+Math.sin(pitch)*c.distance,c.targetZ+Math.cos(yaw)*Math.cos(pitch)*c.distance);this.camera.lookAt(c.targetX,c.targetY,c.targetZ);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  this.renderer.getSize(this.size);if(this.size.x!==width||this.size.y!==height)this.renderer.setSize(width,height,false);this.renderer.render(world.scene,this.camera);
  if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
  const ctx=target.getContext('2d');if(!ctx)throw new Error('3D: cannot copy rendered frame');ctx.clearRect(0,0,width,height);ctx.drawImage(this.renderer.domElement,0,0);
  target.dataset.stage3dTime=String(time);target.dataset.stage3dStage=shot.stage;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.cache.forEach(w=>this.release(w));this.cache.clear();this.renderer.domElement.removeEventListener('webglcontextlost',this.onLost);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.width=0;this.renderer.domElement.height=0;}
}
