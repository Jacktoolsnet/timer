import {prepareStage3DSpeech} from './stage3d-speech';
import {emptySpeechEnvelopes,type SpeechEnvelopes} from '../lib/stage3d-speech';
import {modelTextureIDs3D} from '../lib/texture3d';
import type {Project} from '../lib/model';
import type {Shot3D} from '../lib/stage3d';
import type {Stage3DRenderer} from './stage3d';
let renderer:Stage3DRenderer|undefined,pending:Promise<Stage3DRenderer>|undefined;
export function prepareStage3DPreview(project?:Project,check:()=>void=()=>{},shot?:Shot3D){
 const ready=pending??=import('./stage3d').then(m=>renderer=new m.Stage3DRenderer());
 if(!project)return ready;
 return ready.then(async value=>{
  // Keep the active world resident. Preparing every scene here evicts it from
  // the bounded GPU cache, leaving an already-ready view unable to render.
  // Later scene views prepare their own textures when they are created.
  check();if(shot){await value.prepare(project,shot);check();}
  for(const scene of project.scenes){check();if(scene.stage3d)await prepareStage3DSpeech(project,scene.stage3d,check);}
  check();return value;
 });
}
window.addEventListener('pagehide',()=>{renderer?.dispose();renderer=undefined;pending=undefined;});
export type Stage3DView={canvas:HTMLCanvasElement;draw:(time:number)=>void;dispose:()=>void};
export function createStage3DView(project:Project,shot:Shot3D,width:number,height:number,onError:(e:Error)=>void,options:{studio?:boolean;label?:string}={}):Stage3DView{
 const canvas=document.createElement('canvas');canvas.className='scene-background stage3d-canvas';canvas.setAttribute('aria-label',options.label??project.stages[shot.stage].name);canvas.style.pointerEvents='none';let time=0,failed=false,disposed=false,ready=!shot.actors.some(a=>a.speech);let speech:SpeechEnvelopes=emptySpeechEnvelopes;
 const draw=(next:number)=>{time=next;if(!renderer||!ready||failed||disposed)return;try{renderer.render(project,shot,time,width,height,canvas,options.studio,speech);}catch(error){failed=true;canvas.dataset.stage3dError='true';onError(error as Error);}};
 const fail=(error:Error)=>{if(disposed)return;failed=true;canvas.removeAttribute('aria-busy');canvas.dataset.stage3dError='true';onError(error);};
 const hasTextures=[project.stages[shot.stage].model,...shot.actors.map(a=>project.characters[a.character].model),...(shot.groups??[]).flatMap(g=>project.groups3d[g.group].characters.map(id=>project.characters[id].model))].some(m=>modelTextureIDs3D(m).length);
 if(hasTextures){ready=false;canvas.setAttribute('aria-busy','true');void prepareStage3DPreview().then(async value=>{if(disposed)return;await value.prepare(project,shot,options.studio);if(disposed)return;speech=await prepareStage3DSpeech(project,shot);if(disposed)return;ready=true;canvas.removeAttribute('aria-busy');draw(time);}).catch(fail);}
 else{
  if(!ready){canvas.setAttribute('aria-busy','true');void prepareStage3DSpeech(project,shot).then(value=>{if(disposed)return;speech=value;ready=true;canvas.removeAttribute('aria-busy');draw(time);}).catch(fail);}
  if(!renderer)void prepareStage3DPreview().then(()=>draw(time)).catch(fail);
 }
 return {canvas,draw,dispose(){disposed=true;canvas.width=0;canvas.height=0;}};
}
