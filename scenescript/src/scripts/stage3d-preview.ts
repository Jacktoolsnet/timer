import type {Project} from '../lib/model';
import type {Shot3D} from '../lib/stage3d';
import type {Stage3DRenderer} from './stage3d';
let renderer:Stage3DRenderer|undefined,pending:Promise<Stage3DRenderer>|undefined;
export function prepareStage3DPreview(){return pending??=import('./stage3d').then(m=>renderer=new m.Stage3DRenderer());}
window.addEventListener('pagehide',()=>{renderer?.dispose();renderer=undefined;pending=undefined;});
export type Stage3DView={canvas:HTMLCanvasElement;draw:(time:number)=>void};
export function createStage3DView(project:Project,shot:Shot3D,width:number,height:number,onError:(e:Error)=>void):Stage3DView{
 const canvas=document.createElement('canvas');canvas.className='scene-background stage3d-canvas';canvas.setAttribute('aria-label',project.stages[shot.stage].name);canvas.style.pointerEvents='none';let time=0,failed=false;
 const draw=(next:number)=>{time=next;if(!renderer||failed)return;try{renderer.render(project,shot,time,width,height,canvas);}catch(error){failed=true;canvas.dataset.stage3dError='true';onError(error as Error);}};
 if(!renderer)void prepareStage3DPreview().then(()=>draw(time)).catch(error=>{failed=true;canvas.dataset.stage3dError='true';onError(error);});
 return {canvas,draw};
}
