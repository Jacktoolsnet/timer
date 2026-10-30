import {defaultActor2D,defaultStage2D,defaultStage2DResource,type Resources2D} from './stage2d.ts';

/** A selected resource in isolation, never the current scene's camera, actions or overrides. */
export function resourcePreview2D(source:Resources2D,kind:'stages2d'|'objects2d',id:string){
 const library=source[kind];
 if(!Object.hasOwn(library,id))return null;
 const resources:Resources2D={
  stages2d:{preview:kind==='stages2d'?structuredClone(source.stages2d[id]):defaultStage2DResource()},
  objects2d:kind==='objects2d'?{preview:structuredClone(source.objects2d[id])}:{}
 };
 const shot=defaultStage2D('preview');
 if(kind==='objects2d'){
  const actor=defaultActor2D('preview','preview'),robot=source.objects2d[id].kind==='robot';
  actor.x=480;actor.y=robot?425:270;actor.scale=robot?1.8:2;shot.actors.push(actor);
 }
 return {resources,shot,duration:1};
}
