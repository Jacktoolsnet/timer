/** Percentages of the project viewport; height uses the same percentage as width. */
export type CameraStation={at:number;x:number;y:number;width:number;hold:number;easing:'linear'|'ease-in-out'};
export type Camera={stations:CameraStation[]};
export function parseCamera(value:unknown,duration:number,path='camera'):Camera|null{
 if(value===undefined||value===null)return null;
 const object=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
 const keys=(o:Record<string,unknown>,allowed:string[],p:string)=>{for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');};
 const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
 const o=object(value,path);keys(o,['stations'],path);
 if(!Array.isArray(o.stations)||!o.stations.length||o.stations.length>32)throw new Error(path+'.stations: expected 1–32 stations');
 const stations=o.stations.map((v,i)=>{const p=path+'.stations['+i+']',s=object(v,p);keys(s,['at','x','y','width','hold','easing'],p);
 const at=number(s.at,p+'.at',0,duration),x=number(s.x,p+'.x',0,100),y=number(s.y,p+'.y',0,100),width=number(s.width,p+'.width',1,100),hold=number(s.hold===undefined?0:s.hold,p+'.hold',0,duration);
 if(x+width>100+1e-9||y+width>100+1e-9)throw new Error(p+': camera rectangle outside project');
 if(at+hold>duration+1e-9)throw new Error(p+'.hold: exceeds scene duration');
 const easing=s.easing===undefined?'linear':s.easing;if(easing!=='linear'&&easing!=='ease-in-out')throw new Error(p+'.easing: linear, ease-in-out');
 return {at,x,y,width,hold,easing} as CameraStation;
 });
 if(stations[0].at!==0)throw new Error(path+'.stations[0].at: must be 0');
 for(let i=1;i<stations.length;i++)if(stations[i].at<=stations[i-1].at+stations[i-1].hold)throw new Error(path+'.stations['+i+'].at: must be after previous arrival and hold');
 return {stations};
}
export function cameraState(camera:Camera|null|undefined,time:number){
 if(!camera)return {x:0,y:0,width:100};
 const stations=camera.stations;let previous=stations[0];
 for(const next of stations.slice(1)){
  if(time<next.at){const start=previous.at+previous.hold;let p=Math.max(0,Math.min(1,(time-start)/(next.at-start)));if(next.easing==='ease-in-out')p=p*p*(3-2*p);return {x:previous.x+(next.x-previous.x)*p,y:previous.y+(next.y-previous.y)*p,width:previous.width+(next.width-previous.width)*p};}
  previous=next;
 }
 return {x:previous.x,y:previous.y,width:previous.width};
}
export function cameraTransform(camera:Camera|null|undefined,time:number,width:number,height:number){const c=cameraState(camera,time),scale=100/c.width;return `matrix(${scale},0,0,${scale},${-c.x*width/100*scale},${-c.y*height/100*scale})`;}
