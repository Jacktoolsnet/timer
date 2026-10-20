export type TrailBubble={x:number;y:number;vx:number;vy:number;radius:number;life:number;duration:number;colour:string};
export class LavaTrail{
 bubbles:TrailBubble[]=[];
 private remainder=0;
 clear(){this.bubbles=[];this.remainder=0;}
 stroke(x:number,y:number,dx:number,dy:number,aspect:number,colour:string){
  const scale=Math.min(aspect,1);
  const distance=Math.hypot(dx*aspect/scale,dy/scale);
  if(distance<.0001)return;
  const spacing=.025;
  this.remainder+=distance;
  const count=Math.min(8,Math.floor(this.remainder/spacing));
  this.remainder%=spacing;
  for(let i=0;i<count;i++){
   const fraction=(i+.5)/count;
   const duration=2.4+Math.random()*1.6;
   this.bubbles.push({x:x-dx*(1-fraction),y:y-dy*(1-fraction),
    vx:Math.max(-.1,Math.min(.1,dx*1.4)),vy:Math.max(-.1,Math.min(.1,dy*1.4)),
    radius:.006+Math.random()*.008,life:duration,duration,colour});
  }
  if(this.bubbles.length>64)this.bubbles.splice(0,this.bubbles.length-64);
 }
 advance(dt:number,viscosity:number){
  for(const p of this.bubbles){
   p.life-=dt;
   p.x+=p.vx*dt;p.y+=(p.vy+.018/(1+viscosity))*dt;
   p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);
  }
  this.bubbles=this.bubbles.filter(p=>p.life>0);
 }
}
