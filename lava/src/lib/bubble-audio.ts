import {BLOB_COUNT,blobShape} from './rainbow.ts';

/** Quiet procedural bubbles, no files or network requests. */
export class BubbleAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private volume=.5;
 setVolume(value:number){
  this.volume=Math.max(0,Math.min(1,value));
  if(this.master&&this.context)this.master.gain.setTargetAtTime(this.volume*2,this.context.currentTime,.025);
 }
 private contacts=new Map<string,boolean>();
 private lastSound=-10;
 private primed=false;
 private enabled=false;
 async start(){
  this.enabled=true;
  try{
   this.context??=new AudioContext();
   if(!this.master){
    this.master=this.context.createGain();
    this.master.gain.value=this.volume*2;
    this.master.connect(this.context.destination);
   }
   await this.context.resume();
   if(!this.enabled)await this.context.suspend();
  }catch{this.enabled=false;}
 }
 stop(){
  this.enabled=false;this.primed=false;this.contacts.clear();
  if(this.context?.state==='running')void this.context.suspend().catch(()=>{});
 }
 update(time:number,aspect:number,viscosity:number,offsets:Float32Array){
  if(!this.enabled||!this.context||this.context.state!=='running')return;
  const shapes=Array.from({length:BLOB_COUNT},(_,i)=>{
   const s=blobShape(i,time,viscosity);return {...s,x:s.x+offsets[i*2],y:s.y+offsets[i*2+1]};
  });
  const scale=Math.min(aspect,1);
  let event: {joined:boolean;size:number}|null=null;
  for(let i=0;i<BLOB_COUNT;i++)for(let j=i+1;j<BLOB_COUNT;j++){
   const a=shapes[i],b=shapes[j],key=i+':'+j;
   const was=this.contacts.get(key)??false;
   const distance=Math.hypot((a.x-b.x)*aspect/((a.rx+b.rx)*scale),(a.y-b.y)/((a.ry+b.ry)*scale));
   // Hysteresis avoids repeated sounds when two boundaries barely touch.
   const joined=distance<(was?1.5:1.25);
   this.contacts.set(key,joined);
   if(this.primed&&joined!==was&&a.y>0&&a.y<1&&b.y>0&&b.y<1)
    event={joined,size:(a.rx+b.rx)/2};
  }
  this.primed=true;
  if(event&&this.context.currentTime-this.lastSound>.65){
   this.lastSound=this.context.currentTime;this.play(event.joined,event.size);
  }
 }
 private play(joined:boolean,size:number){
  const ctx=this.context!;const now=ctx.currentTime;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const pitch=240+(1-size/.1)*130;
  osc.type='sine';
  osc.frequency.setValueAtTime(joined?pitch*1.15:pitch*.8,now);
  osc.frequency.exponentialRampToValueAtTime(joined?pitch*.55:pitch*1.4,now+.15);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(.05,now+.018);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.24);
  osc.connect(gain);gain.connect(this.master!);
  osc.start(now);osc.stop(now+.26);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
}
