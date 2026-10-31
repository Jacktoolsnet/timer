import {Model2DTextures} from './model2d-textures';
import {stageFrame2D} from '../lib/stage2d-frame';
import {Application} from 'pixi.js';
import type {Stage2D,Resources2D} from '../lib/stage2d';
import {createStage2DScene} from './stage2d-scene';
/** One WebGL context per owner, bounded scene cache, common drawing for preview/export. */
export class Stage2DRenderer{
 private app=new Application();
 private worlds=new Map<string,ReturnType<typeof createStage2DScene>>();
 private disposed=false;
 private queue:Promise<unknown>=Promise.resolve();
 private textures=new Model2DTextures(()=>this.clearWorlds());
 private clearWorlds(){this.app.stage.removeChildren();for(const world of this.worlds.values())world.root.destroy({children:true,texture:true,textureSource:true});this.worlds.clear();}
 private lost=false;
 private onLost=(event:Event)=>{event.preventDefault();this.lost=true;};
 async init(){
  try{await this.app.init({width:960,height:540,resolution:1,antialias:true,preference:['webgl'],autoStart:false,preserveDrawingBuffer:true,background:'#123c37',backgroundAlpha:0});}
  catch{throw new Error('2D: WebGL is not available on this device.');}
  this.app.canvas.addEventListener('webglcontextlost',this.onLost);return this;
 }
 /** Serialize image preparation and rendering across shared resource previews. */
 renderAsync(shot:Stage2D,duration:number,time:number,width:number,height:number,target:HTMLCanvasElement,resources:Resources2D,isolated=false){
  const task=this.queue.then(async()=>{if(this.disposed)throw Error('2D renderer disposed');await this.textures.prepare(resources,shot);if(this.disposed)throw Error('2D renderer disposed');this.render(shot,duration,time,width,height,target,resources,isolated);});this.queue=task.catch(()=>{});return task;
 }
 render(shot:Stage2D,duration:number,time:number,width:number,height:number,target:HTMLCanvasElement,resources:Resources2D,isolated=false){
  if(this.disposed)throw Error('2D renderer disposed');if(this.lost)throw new Error('2D: graphics context unavailable.');
  const used={stages2d:Object.fromEntries([shot.stage,...(shot.transition?[shot.transition.stage]:[])].map(id=>[id,resources.stages2d[id]])),objects2d:Object.fromEntries(shot.actors.map(a=>[a.object,resources.objects2d[a.object]]))};
  const key=JSON.stringify([shot,duration,used,isolated]);let world=this.worlds.get(key);
  if(!world){
   if(this.worlds.size>=2){const [oldKey,old]=this.worlds.entries().next().value!;this.app.stage.removeChild(old.root);old.root.destroy({children:true,texture:true,textureSource:true});this.worlds.delete(oldKey);}
   world=createStage2DScene(structuredClone(used),structuredClone(shot),isolated,this.textures.get);this.worlds.set(key,world);
  }
  this.app.stage.removeChildren();this.app.stage.addChild(world.root);
  const frame=stageFrame2D(resources.stages2d[shot.stage]),scale=Math.min(width/frame.width,height/frame.height);world.root.scale.set(scale);world.root.position.set((width-frame.width*scale)/2,(height-frame.height*scale)/2);
  if(this.app.screen.width!==width||this.app.screen.height!==height)this.app.renderer.resize(width,height);
  this.app.renderer.background.alpha=isolated?0:1;
  world.setResolution(scale);world.draw(Math.max(0,Math.min(duration,time)));this.app.render();
  if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
  const context=target.getContext('2d');if(!context)throw new Error('2D: canvas unavailable.');context.clearRect(0,0,width,height);context.drawImage(this.app.canvas,0,0);
  target.dataset.stage2dIsolated=String(isolated);
  target.dataset.stage2dTime=String(time);target.dataset.stage2dStage=shot.stage;target.dataset.stage2dActors=String(shot.actors.length);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.app.canvas.removeEventListener('webglcontextlost',this.onLost);this.clearWorlds();this.textures.dispose();this.app.destroy(true,{children:true});}
}
