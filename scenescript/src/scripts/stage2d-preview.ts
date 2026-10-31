import type {Stage2D,Resources2D} from '../lib/stage2d';
import type {Stage2DRenderer} from './stage2d';
let renderer:Stage2DRenderer|undefined,pending:Promise<Stage2DRenderer>|undefined;
export function prepareStage2DPreview(){return pending??=import('./stage2d').then(async m=>renderer=await new m.Stage2DRenderer().init()).catch(error=>{pending=undefined;throw error;});}
export type Stage2DView={canvas:HTMLCanvasElement;draw:(time:number)=>Promise<void>;dispose:()=>void};
export function createStage2DView(resources:Resources2D,shot:Stage2D,duration:number,width:number,height:number,onError:(error:Error)=>void,isolated=false):Stage2DView{
 const canvas=document.createElement('canvas');canvas.className='scene-background stage2d-canvas'+(isolated?' stage2d-isolated':'');canvas.style.pointerEvents='none';canvas.setAttribute('aria-label','2D · '+resources.stages2d[shot.stage].name);canvas.setAttribute('aria-busy','true');let time=0,disposed=false,failed=false;
 let drawing:Promise<void>|undefined,rendered=-1;
 const draw=async(next:number):Promise<void>=>{time=next;if(disposed||failed)return;if(drawing){await drawing;if(!disposed&&!failed&&rendered!==time)return draw(time);return;}
  const at=time;drawing=prepareStage2DPreview().then(r=>{if(disposed)return;return r.renderAsync(shot,duration,at,width,height,canvas,resources,isolated);}).then(()=>{if(disposed){canvas.width=canvas.height=0;return;}rendered=at;canvas.removeAttribute('aria-busy');}).catch(error=>fail(error as Error)).finally(()=>{drawing=undefined;});await drawing;if(!disposed&&!failed&&rendered!==time)return draw(time);
 };
 const fail=(error:Error)=>{if(disposed)return;failed=true;canvas.removeAttribute('aria-busy');canvas.dataset.stage2dError='true';onError(error);};
 void draw(0);
 return {canvas,draw,dispose(){disposed=true;canvas.width=0;canvas.height=0;}};
}
window.addEventListener('pagehide',()=>{renderer?.dispose();renderer=undefined;pending=undefined;});
