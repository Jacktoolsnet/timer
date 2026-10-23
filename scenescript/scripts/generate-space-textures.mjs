/** Deterministic, code-native artwork: mathematical vortex and planetary color maps. */
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const root=new URL('../public/examples/space-adventure-storyboard/',import.meta.url);
const browser=await chromium.launch();
try{const page=await browser.newPage();const images=await page.evaluate(()=>{
 const out=[];
 for(const kind of ['vortex-cyan','vortex-violet','planet-ocean','planet-banded']){
  const planet=kind.startsWith('planet'),w=planet?1024:768,h=planet?512:768,c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d'),image=ctx.createImageData(w,h),data=image.data;
  const noise=(x,y)=>Math.sin(x*9.3+Math.sin(y*7.1)*2)*Math.sin(y*11.7+Math.sin(x*4.3));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,u=x/w,v=y/h;
   if(!planet){
    const dx=(u-.5)*2,dy=(v-.5)*2,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),s=Math.max(0,1-r);
    if(r>1)continue;
    const spiral=Math.pow(.5+.5*Math.sin(a*7+Math.log(r+.015)*17+1.4*Math.sin(r*23)),6);
    const rings=Math.pow(.5+.5*Math.sin(Math.log(r+.015)*24),12),streak=Math.pow(.5+.5*Math.sin(a*31+r*19),18);
    const glow=(spiral*.62+rings*.18+streak*.12)*Math.pow(r,.5),center=Math.min(1,r/.16),edge=Math.min(1,(1-r)*35);
    const base=kind==='vortex-cyan'?[6,23,49]:[22,6,44],light=kind==='vortex-cyan'?[65,219,244]:[205,91,243];
    for(let k=0;k<3;k++)data[i+k]=Math.min(255,(base[k]+light[k]*glow*1.5)*center+Math.pow(s,12)*[2,5,15][k]);
    data[i+3]=Math.round(edge*255);
   }else{
    const a=u*Math.PI*2,b=v*Math.PI,detail=noise(a*3,b*3)+.35*noise(a*8,b*8);
    let rgb;
    if(kind==='planet-ocean'){
     const land=Math.sin(a*3+Math.sin(b*4))+Math.cos(b*5+a*.7)+detail*.55;
     rgb=land>.55?[45+detail*8,91+detail*16,79+detail*10]:[12+detail*6,52+detail*12,100+detail*18];
     const cloud=Math.max(0,Math.sin(b*12+Math.sin(a*4)*1.4)+detail*.7-.75)*.6,ice=Math.pow(Math.abs(Math.cos(b)),16)*.8;
     rgb=rgb.map(n=>n+(225-n)*Math.min(.9,cloud+ice));
    }else{
     const bands=.5+.5*Math.sin(b*32+Math.sin(a*4+b*3)*.8+detail*.45),storm=Math.exp(-((u-.7)**2/.009+(v-.6)**2/.001));
     rgb=[132+bands*73+storm*32,81+bands*70-storm*20,61+bands*59-storm*10];
    }
    for(let k=0;k<3;k++)data[i+k]=Math.max(0,Math.min(255,rgb[k]));data[i+3]=255;
   }
  }
  ctx.putImageData(image,0,0);out.push({name:kind+'.png',data:c.toDataURL('image/png').split(',')[1]});
 }return out;
});for(const image of images){await writeFile(new URL(image.name,root),Buffer.from(image.data,'base64'));console.log('Created',image.name);}}finally{await browser.close();}
