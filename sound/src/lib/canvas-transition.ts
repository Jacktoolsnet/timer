/** Reuse one bounded snapshot per layer; blend the live incoming scene, not CSS screenshots. */
export const visualFadeDuration=1100;
export function visualFadeProgress(elapsed:number,reduced=false){
 const t=Math.max(0,Math.min(1,elapsed/visualFadeDuration));
 return reduced?1:t*t*(3-2*t);
}
export class CanvasTransition{
 private key:string|undefined;
 private start=-Infinity;
 private snapshot:HTMLCanvasElement|undefined;
 begin(ctx:CanvasRenderingContext2D,key:string,now:number,reduced:boolean){
  if(this.key!==undefined&&key!==this.key&&!reduced){
   this.snapshot??=document.createElement('canvas');
   this.snapshot.width=ctx.canvas.width;this.snapshot.height=ctx.canvas.height;
   this.snapshot.getContext('2d')!.drawImage(ctx.canvas,0,0);this.start=now;
  }
  if(reduced)this.start=-Infinity;
  this.key=key;
 }
 finish(ctx:CanvasRenderingContext2D,now:number,reduced:boolean){
  const mix=visualFadeProgress(now-this.start,reduced);
  if(mix>=1||!this.snapshot)return false;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.shadowBlur=0;ctx.filter='none';
  ctx.globalCompositeOperation='destination-in';ctx.globalAlpha=mix;ctx.fillStyle='#fff';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-mix;ctx.drawImage(this.snapshot,0,0);ctx.restore();
  return true;
 }
}
