import {stageFrame2D} from '../lib/stage2d-frame';
import {Container,Graphics,Text,BlurFilter,type Texture} from 'pixi.js';
import type {Resources2D,Stage2D} from '../lib/stage2d';
import {actorFrame2D,cameraFrame2D,ease2D,mix2D} from '../lib/motion2d';
import {createBackdrop2D,createObjectView2D,label} from './light-collector';
/** Compose resources into independent instances. No story-specific schedules live in the renderer. */
export function createStage2DScene(resources:Resources2D,shot:Stage2D,isolated=false,textureFor?:(data:string)=>Texture){
 const foreground=new Container(),root=new Container(),empty=new Container();
 const base=isolated?{root:empty,world:empty,draw:(_time:number,_camera:{x:number;y:number;zoom:number},_clip?:string)=>{}}:createBackdrop2D(resources.stages2d[shot.stage],textureFor);root.addChild(base.root);
 const actors=shot.actors.map(instance=>({instance,view:createObjectView2D(resources.objects2d[instance.object],instance,textureFor)}));for(const actor of actors){actor.view.host.label=actor.instance.id;actor.view.node.label='actor-pose';(actor.instance.layer==='foreground'?foreground:base.world).addChild(actor.view.host);}
 const incoming=shot.transition?createBackdrop2D(resources.stages2d[shot.transition.stage],textureFor):undefined;const mask=new Graphics();if(incoming){root.addChild(incoming.root);incoming.root.addChild(mask);incoming.root.mask=mask;}
 root.addChild(foreground);
 const ending=new Container();root.addChild(ending);if(shot.ending){label(ending,shot.ending.title,94,154,39,0xe7eed9);label(ending,shot.ending.subtitle,94,202,45,0xffd6a5);ending.addChild(new Graphics().moveTo(96,264).bezierCurveTo(185,256,271,271,357,260).stroke({color:0xf7b89a,width:2}));label(ending,'GESTIK  /  GEWICHT  /  ATMOSPHÄRE',98,289,12,0x91b7ac);}
 const effects:{node:Container;filter:BlurFilter;strength:number}[]=[];const texts:Text[]=[];const collect=(node:Container)=>{if(node instanceof Text)texts.push(node);for(const filter of node.filters??[])if(filter instanceof BlurFilter)effects.push({node,filter,strength:filter.strength});for(const child of node.children)collect(child);};collect(root);
 const handAt=(id:string,time:number)=>{const actor=actors.find(a=>a.instance.id===id)!;actor.view.draw(actorFrame2D(actor.instance,time),time);return base.world.toLocal(actor.view.hand!.toGlobal({x:0,y:29}));};
 return {root,setResolution(resolution:number){for(const text of texts)text.resolution=Math.max(1,resolution);},draw(time:number){
  base.draw(time,cameraFrame2D(shot.camera,time),shot.stageClip||'idle');incoming?.draw(time,{x:0,y:0,zoom:1});foreground.position.copyFrom(base.world.position);foreground.scale.copyFrom(base.world.scale);
  for(const actor of actors)actor.view.draw(actorFrame2D(actor.instance,time),time);
  for(const actor of actors){const links=actor.instance.actions.filter(a=>a.type==='attach'&&time>=a.at).sort((a,b)=>a.at-b.at);if(!links.length){actor.view.burst({x:0,y:0},-1);continue;}
   const frame=actorFrame2D(actor.instance,time);let x=frame.x,y=frame.y;
   for(const attach of links){const hand=handAt(attach.target,time),q=ease2D((time-attach.at)/attach.duration);x=mix2D(x,hand.x,q);y=mix2D(y,hand.y,q);}
   actor.view.node.position.set(x,y);const last=links.at(-1)!;if(last.burst){const impact=handAt(last.target,last.at+last.duration);actor.view.burst(impact,time-last.at-last.duration);}else actor.view.burst({x:0,y:0},-1);
  }
  // Historical contact-point sampling must not leave a target in a past pose.
  for(const actor of actors)if(actor.view.hand)actor.view.draw(actorFrame2D(actor.instance,time),time);
  if(incoming&&shot.transition){const t=shot.transition,q=ease2D((time-t.at)/t.duration);incoming.root.visible=q>0;mask.clear().circle(t.x,t.y,Math.max(.01,q*Math.max(1150,Math.hypot(...Object.values(stageFrame2D(resources.stages2d[shot.stage])))))).fill(0xffffff);}
  const alpha=shot.ending?ease2D((time-shot.ending.at)/shot.ending.duration):0;ending.alpha=alpha;ending.y=12*(1-alpha);for(const effect of effects){const m=effect.node.getGlobalTransform();effect.filter.strength=effect.strength*Math.max(Math.hypot(m.a,m.b),Math.hypot(m.c,m.d));}
 }};
}
