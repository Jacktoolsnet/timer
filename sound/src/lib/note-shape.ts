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
export function paintNoteLength(ctx:CanvasRenderingContext2D,radius:number,angle:number,sweep:number,direction:number,color:string,sounding:boolean,muted:boolean,dark:boolean,width=5.5){
 if(sweep<=0)return;
 ctx.save();ctx.lineCap='round';ctx.lineWidth=width;
 ctx.strokeStyle=color;ctx.globalAlpha=muted?.12:sounding?.85:dark?.27:.4;
 ctx.shadowColor=color;ctx.shadowBlur=sounding?(dark?16:7):0;
 ctx.beginPath();ctx.arc(350,350,radius,angle,angle+(direction<0?-sweep:sweep),direction<0);ctx.stroke();ctx.restore();
}
