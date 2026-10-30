import {defaultAction2D,defaultActor2D,defaultStage2D,defaultStage2DResource,type Resources2D} from './stage2d.ts';
/** Selected resource only: never inherit a scene's camera, actions or overrides. */
export function resourcePreview2D(source:Resources2D,kind:'stages2d'|'objects2d',id:string,clip=''){
 const library=source[kind];if(!Object.hasOwn(library,id))return null;
 const selected=library[id],model=selected.model;
 const resources:Resources2D={
  stages2d:{preview:kind==='stages2d'?structuredClone(source.stages2d[id]):defaultStage2DResource()},
  objects2d:kind==='objects2d'?{preview:structuredClone(source.objects2d[id])}:{}
 };
 if(!clip&&resources[kind].preview.model)resources[kind].preview.model!.animations={};
 const shot=defaultStage2D('preview'),duration=clip&&model?.animations[clip]?model.animations[clip].duration:Math.max(1,model?.animations.idle?.duration??1);
 if(kind==='objects2d'){
  const actor=defaultActor2D('preview','preview'),robot=source.objects2d[id].kind==='robot';
  actor.x=480;actor.y=robot?425:270;actor.scale=robot?1.8:2;
  if(model){actor.scale=Math.min(440/model.width,340/model.height,4);actor.x=480+(model.originX-model.width/2)*actor.scale;actor.y=270+(model.originY-model.height/2)*actor.scale;}
  if(clip&&model?.animations[clip])actor.actions=[{...defaultAction2D('play'),clip,duration}];
  shot.actors.push(actor);
 }else if(clip&&model?.animations[clip])shot.stageClip=clip;
 return {resources,shot,duration,isolated:kind==='objects2d'};
}
