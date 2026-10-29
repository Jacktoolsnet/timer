/** A deterministic, tileable grayscale albedo map; no network, AI call or random state. */
export function createFabricTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 const pixels=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const warp=x%8<3,weft=y%8<3,top=(Math.floor(x/8)+Math.floor(y/8))%2===0;
  const thread=(top?warp:weft)?12:-9,grain=((x%16*13+y%16*7)%9)-4,value=218+thread+grain,i=(y*256+x)*4;
  pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);return {name:'Seamless grayscale fabric material.png',data:canvas.toDataURL('image/png')};
}
