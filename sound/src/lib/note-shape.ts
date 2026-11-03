/** Note heads encode performed level, not the animation-strength preference. */
export function noteHeadRadius(level:number){
 return 3.5+4*Math.sqrt(Math.max(0,Math.min(1,Number.isFinite(level)?level:0)));
}
/** Duration is supplied by the audio voice, never inferred from a point's spacing.
 * Very long tails are bounded just below one revolution to keep the head readable.
 */
export function noteLengthSweep(duration:number,barSeconds:number){
 if(!Number.isFinite(duration)||!Number.isFinite(barSeconds)||duration<=0||barSeconds<=0)return 0;
 return Math.min(Math.PI*2*.94,duration/barSeconds*Math.PI*2);
}
export function noteIsSounding(now:number,started:number,duration:number){
 return Number.isFinite(started)&&now>=started&&now<started+duration;
}
/** Rounded, quiet length bed; the same arc lights up for the scheduled note duration. */
export function paintNoteLength(ctx:CanvasRenderingContext2D,radius:number,angle:number,sweep:number,direction:number,color:string,sounding:boolean,muted:boolean,dark:boolean){
 if(sweep<=0)return;
 ctx.save();ctx.lineCap='round';ctx.lineWidth=5.5;
 ctx.strokeStyle=color;ctx.globalAlpha=muted?.12:sounding?.85:dark?.27:.4;
 ctx.shadowColor=color;ctx.shadowBlur=sounding?(dark?16:7):0;
 ctx.beginPath();ctx.arc(350,350,radius,angle,angle+(direction<0?-sweep:sweep),direction<0);ctx.stroke();ctx.restore();
}

/** An inset slur connects only notes that actually reused one continuous audio voice. */
export function paintNoteJoin(ctx:CanvasRenderingContext2D,radius:number,from:number,to:number,direction:number,color:string,sounding:boolean,muted:boolean,dark:boolean){
 const turn=Math.PI*2,sign=direction<0?-1:1;
 const span=((to-from)*sign%turn+turn)%turn;
 if(span<.001||span>turn*.97)return;
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';
 ctx.globalAlpha=muted?.12:sounding?.95:dark?.48:.6;
 ctx.shadowColor=color;ctx.shadowBlur=sounding?(dark?12:5):0;
 ctx.beginPath();ctx.moveTo(350+Math.cos(from)*radius,350+Math.sin(from)*radius);
 ctx.lineTo(350+Math.cos(from)*(radius-8),350+Math.sin(from)*(radius-8));
 ctx.arc(350,350,radius-8,from,from+sign*span,sign<0);
 ctx.lineTo(350+Math.cos(to)*radius,350+Math.sin(to)*radius);ctx.stroke();ctx.restore();
}
