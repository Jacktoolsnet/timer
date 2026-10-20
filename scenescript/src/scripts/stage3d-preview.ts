import type {Project} from '../lib/model';
import type {Shot3D} from '../lib/stage3d';
import type {Stage3DRenderer} from './stage3d';
let renderer:Stage3DRenderer|undefined,pending:Promise<Stage3DRenderer>|undefined;
export function prepareStage3DPreview(){return pending??=import('./stage3d').then(m=>renderer=new m.Stage3DRenderer());}
window.addEventListener('pagehide',()=>{renderer?.dispose();renderer=undefined;pending=undefined;});
export type Stage3DView={canvas:HTMLCanvasElement;draw:(time:number)=>void;dispose:()=>void};
export function createStage3DView(project:Project,shot:Shot3D,width:number,height:number,onError:(e:Error)=>void,options:{studio?:boolean;label?:string}={}):Stage3DView{
 const canvas=document.createElement('canvas');canvas.className='scene-background stage3d-canvas';canvas.setAttribute('aria-label',options.label??project.stages[shot.stage].name);canvas.style.pointerEvents='none';let time=0,failed=false,disposed=false;
 const draw=(next:number)=>{time=next;if(!renderer||failed||disposed)return;try{renderer.render(project,shot,time,width,height,canvas,options.studio);}catch(error){failed=true;canvas.dataset.stage3dError='true';onError(error as Error);}};
 if(!renderer)void prepareStage3DPreview().then(()=>draw(time)).catch(error=>{if(disposed)return;failed=true;canvas.dataset.stage3dError='true';onError(error);});
 return {canvas,draw,dispose(){disposed=true;canvas.width=0;canvas.height=0;}};
}
