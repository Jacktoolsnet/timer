import {BLOB_COUNT,blobShape} from './rainbow.ts';
export class LavaInteraction {
 offsets=new Float32Array(BLOB_COUNT*2);
 velocities=new Float32Array(BLOB_COUNT*2);
 reset(){this.offsets.fill(0);this.velocities.fill(0);}
 stroke(x:number,y:number,dx:number,dy:number,time:number,aspect:number,viscosity:number){
  const scale=Math.min(aspect,1);
  for(let i=0;i<BLOB_COUNT;i++){
   const shape=blobShape(i,time,viscosity),k=i*2;
   const rx=(shape.x+this.offsets[k]-x)*aspect/scale;
   const ry=(shape.y+this.offsets[k+1]-y)/scale;
   const influence=Math.exp(-(rx*rx+ry*ry)/.06);
   const length=Math.hypot(dx*aspect/scale,dy/scale);
   const limit=Math.min(1,.12/Math.max(length,.0001));
   this.velocities[k]+=dx*limit*influence*7;
   this.velocities[k+1]+=dy*limit*influence*7;
  }
 }
 advance(dt:number,viscosity:number){
  const drag=Math.exp(-dt*(2.5+viscosity*3));
  for(let k=0;k<this.offsets.length;k++){
   this.velocities[k]=(this.velocities[k]-this.offsets[k]*dt*.65)*drag;
   this.offsets[k]=Math.max(-.24,Math.min(.24,this.offsets[k]+this.velocities[k]*dt));
  }
 }
}
