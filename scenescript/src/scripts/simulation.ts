import {simulationParticles,type Simulation} from '../lib/simulation';
export type SimulationView={canvas:HTMLCanvasElement;draw:(time:number)=>void};
export function createSimulation(s:Simulation,width:number,height:number):SimulationView{
 const canvas=document.createElement('canvas');canvas.className='simulation-canvas';canvas.setAttribute('aria-hidden','true');
 const scale=Math.min(1,1600/Math.max(width,height),Math.sqrt(1500000/(width*height)));
 canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d');let lastTime=-1;
 return {canvas,draw(time){
  const t=Math.max(0,time);if(t===lastTime||!ctx)return;lastTime=t;
  canvas.dataset.simulationTime=String(t);
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
  ctx.fillStyle=s.color;ctx.strokeStyle=s.color;
  for(const p of simulationParticles(s,width,height,t)){
   ctx.globalAlpha=p.alpha;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
   if(s.type==='bubbles'){
    ctx.lineWidth=Math.max(1,p.radius*.08);ctx.stroke();
    ctx.globalAlpha=p.alpha*.13;ctx.fill();
    ctx.globalAlpha=p.alpha*.6;ctx.beginPath();ctx.arc(p.x-p.radius*.28,p.y-p.radius*.28,p.radius*.46,Math.PI,Math.PI*1.55);ctx.stroke();
   }else ctx.fill();
  }
  ctx.globalAlpha=1;
 }};
}
