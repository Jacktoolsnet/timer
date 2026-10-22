import {morphProgress,type MorphMesh} from '../lib/morph';
/** Two endpoint images deform into the same mesh, then dissolve. Shared by preview/export. */
export function renderMorph(outgoing:HTMLCanvasElement,incoming:HTMLCanvasElement,mesh:MorphMesh,progress:number,target=document.createElement('canvas')){
 const w=incoming.width,h=incoming.height;target.width=w;target.height=h;const ctx=target.getContext('2d')!,t=morphProgress(progress);
 if(t===0){ctx.drawImage(outgoing,0,0);return target;}if(t===1){ctx.drawImage(incoming,0,0);return target;}
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
 const destination=mesh.from.map((p,i)=>({x:(p.x+(mesh.to[i].x-p.x)*t)*w/100,y:(p.y+(mesh.to[i].y-p.y)*t)*h/100}));
 const warp=(image:HTMLCanvasElement,vertices:MorphMesh['from'],opacity:number)=>{
  const layer=document.createElement('canvas');layer.width=w;layer.height=h;const c=layer.getContext('2d')!;
  try{for(const ids of mesh.triangles){
   const s=ids.map(i=>({x:vertices[i].x*w/100,y:vertices[i].y*h/100})),d=ids.map(i=>destination[i]);
   const ux=s[1].x-s[0].x,uy=s[1].y-s[0].y,vx=s[2].x-s[0].x,vy=s[2].y-s[0].y,det=ux*vy-uy*vx;
   const ax=d[1].x-d[0].x,ay=d[1].y-d[0].y,bx=d[2].x-d[0].x,by=d[2].y-d[0].y;
   const a=(ax*vy-bx*uy)/det,b=(ay*vy-by*uy)/det,cx=(bx*ux-ax*vx)/det,e=(by*ux-ay*vx)/det;
   c.save();c.beginPath();const center={x:(d[0].x+d[1].x+d[2].x)/3,y:(d[0].y+d[1].y+d[2].y)/3};
   // Subpixel overlap prevents hairline cracks between antialiased triangle clips.
   d.forEach((p,i)=>{const length=Math.hypot(p.x-center.x,p.y-center.y),x=p.x+(p.x-center.x)/length*.65,y=p.y+(p.y-center.y)/length*.65;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.clip();
   c.setTransform(a,b,cx,e,d[0].x-a*s[0].x-cx*s[0].y,d[0].y-b*s[0].x-e*s[0].y);c.drawImage(image,0,0);c.restore();
  }ctx.globalAlpha=opacity;ctx.drawImage(layer,0,0);}finally{layer.width=0;layer.height=0;}
 };
 warp(outgoing,mesh.from,1);warp(incoming,mesh.to,t);ctx.globalAlpha=1;return target;
}
