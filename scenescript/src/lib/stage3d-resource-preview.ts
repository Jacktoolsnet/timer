import {demoProject,newScene,type Project} from './model.ts';
import {defaultActor3D,defaultStage3D,defaultStageCamera3D,parseCharacter3D,parseStage3D,type Resource3D,type Shot3D} from './stage3d.ts';
/** An isolated preview project: never changes scene actors, camera or project resources. */
export function resource3DPreview(kind:Resource3D['kind'],id:string,definition:unknown):{project:Project;shot:Shot3D;studio:boolean;label:string}{
 const project=demoProject(),scene=newScene('resource-preview');scene.elements=[];scene.transition='none';project.scenes=[scene];
 if(kind==='character'){
  const character=parseCharacter3D(definition);project.characters={[id]:character};project.stages={studio:{...defaultStage3D(),name:character.name,skyColor:'#e6edf3',groundColor:'#c9d4df'}};
  const shot:Shot3D={stage:'studio',camera:{...defaultStageCamera3D(),yaw:18,pitch:9,distance:Math.max(5.5,character.height*2.1),targetY:character.height*.55},actors:[defaultActor3D(id,'preview-character')]};scene.stage3d=shot;
  return {project,shot,studio:true,label:character.name};
 }
 const stage=parseStage3D(definition);project.stages={[id]:stage};const shot:Shot3D={stage:id,camera:{...defaultStageCamera3D(),pitch:23,distance:23,targetY:1,targetZ:-2},actors:[]};scene.stage3d=shot;
 return {project,shot,studio:false,label:stage.name};
}
