import {parseGroup3D,defaultGroupPlacement3D,groupMembers3D,groupBudget3D} from './group3d.ts';
import {modelRadius3D} from './model3d.ts';
import {demoProject,newScene,type Project} from './model.ts';
import {defaultActor3D,defaultStage3D,defaultStageCamera3D,parseCharacter3D,parseStage3D,type Resource3D,type Shot3D} from './stage3d.ts';
/** An isolated preview project: never changes scene actors, camera or project resources. */
export function resource3DPreview(kind:Resource3D['kind'],id:string,definition:unknown,animation='',characters:Project['characters']={}):{project:Project;shot:Shot3D;studio:boolean;label:string}{
 const project=demoProject(),scene=newScene('resource-preview');scene.elements=[];scene.transition='none';project.scenes=[scene];
 if(kind==='group'){
  const group=parseGroup3D(definition,characters);project.characters=characters;project.groups3d={[id]:group};project.stages={studio:parseStage3D({...defaultStage3D(),model:{parts:[{id:'empty',shape:'group'}]},skyColor:'#e6edf3',groundColor:'#c9d4df'})};
  const shot:Shot3D={stage:'studio',camera:{...defaultStageCamera3D(),yaw:18,pitch:18,distance:18},actors:[],groups:[defaultGroupPlacement3D(id)]};scene.duration=12;scene.stage3d=shot;
  // Populate the deterministic layout now as well: malformed definitions never reach WebGL.
  groupMembers3D(group);if(groupBudget3D(shot.groups!,project.groups3d,characters,'group preview')+1>2048)throw new Error('group preview: maximum 2048 active 3D parts');return {project,shot,studio:true,label:group.name};
 }
 if(kind==='character'){
  const character=parseCharacter3D(definition);project.characters={[id]:character};project.stages={studio:{...defaultStage3D(),name:character.name,skyColor:'#e6edf3',groundColor:'#c9d4df'}};
  const shot:Shot3D={stage:'studio',camera:{...defaultStageCamera3D(),yaw:18,pitch:9,distance:Math.max(5.5,character.height*2.1),targetY:character.height*.55},actors:[defaultActor3D(id,'preview-character')]};if(character.model){shot.camera.distance=Math.min(80,Math.max(5.5,modelRadius3D(character.model)*character.height/3*2.8));const clip=Object.hasOwn(character.model.animations,animation)?character.model.animations[animation]:undefined;if(clip){scene.duration=Math.min(3600,Math.max(4,clip.duration+.01));shot.actors[0].motions=[{animation,at:0,duration:scene.duration,speed:1,loop:false,blend:0}];}}
  scene.stage3d=shot;
  return {project,shot,studio:true,label:character.name};
 }
 const stage=parseStage3D(definition);project.stages={[id]:stage};const shot:Shot3D={stage:id,camera:{...defaultStageCamera3D(),pitch:23,distance:23,targetY:1,targetZ:-2},actors:[]};if(stage.model){shot.camera.targetZ=0;shot.camera.distance=Math.min(80,Math.max(5.5,modelRadius3D(stage.model)*2.8));const clip=Object.hasOwn(stage.model.animations,animation)?stage.model.animations[animation]:undefined;if(clip){scene.duration=Math.min(3600,Math.max(4,clip.duration+.01));shot.stageMotions=[{animation,at:0,duration:scene.duration,speed:1,loop:false,blend:0}];}}scene.stage3d=shot;
 return {project,shot,studio:false,label:stage.name};
}
