/** Scene-relative interval editing; duration changes never extend the scene. */
export function editInterval(at:number,until:number|null,duration:number,delta:number,mode:'move'|'start'|'end',snap=false){
 const min=Math.min(.001,duration),end=until??duration;
 if(end-at<min)return {at,until};
 let a=at,b=end;
 const round=(v:number)=>snap?Math.round(v*10)/10:v;
 if(mode==='move'){const shift=Math.max(-at,Math.min(duration-end,round(at+delta)-at));a=at+shift;b=end+shift;}
 else if(mode==='start')a=Math.max(0,Math.min(end-min,round(at+delta)));
 else b=Math.max(at+min,Math.min(duration,round(end+delta)));
 a=Number(a.toFixed(6));b=Number(b.toFixed(6));
 return {at:a,until:mode==='start'&&until===null?null:mode==='move'&&a===at&&b===end?until:b};
}
