import {copy} from '../lib/sound-i18n';
const t=copy[document.documentElement.lang as keyof typeof copy]||copy.en;
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const orbit=$<HTMLCanvasElement>('#orbit'), drawing=$<HTMLCanvasElement>('#drawing');
const oc=orbit.getContext('2d')!,dc=drawing.getContext('2d')!;
const colors=['#21bed1','#a482ed','#f0788c','#d8a847','#48bca0'];
const tracks=colors.map((color,i)=>({color,points:Array.from({length:16},(_,s)=>i===0?s%4===0:i===1?s%8===4:i===2?s%2===0:i===3?s%8===0:s%5===0),mute:false,volume:.65,pitch:0,flash:Array(16).fill(-100)}));
let audio:AudioContext|undefined, master:GainNode|undefined, playing=false,timer:ReturnType<typeof setInterval>|undefined,nextTime=0,step=0,bpm=100,anchor=0;
const events:{time:number;step:number}[]=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function sync(){
 tracks.forEach((tr,i)=>{
  const row=$<HTMLElement>('[data-track="'+i+'"]');
  row.querySelector('.count')!.textContent=tr.points.filter(Boolean).length+' / 16';
  row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.setAttribute('aria-pressed',String(tr.points[s])));
 });
}
tracks.forEach((tr,i)=>{
 const row=$<HTMLElement>('[data-track="'+i+'"]');
 row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.addEventListener('click',()=>{tr.points[s]=!tr.points[s];sync();}));
 row.querySelector<HTMLInputElement>('.mute')!.addEventListener('change',e=>tr.mute=(e.target as HTMLInputElement).checked);
 row.querySelector<HTMLInputElement>('.track-volume')!.addEventListener('input',e=>tr.volume=Number((e.target as HTMLInputElement).value));
});
function voice(i:number,time:number){
 const tr=tracks[i];if(!audio||!master||tr.mute||tr.volume===0)return;
 const gain=audio.createGain();gain.connect(master);
 const peak=tr.volume*(i===2?.12:.3),duration=i===0?.28:i===1?.16:i===2?.055:i===3?.4:.8;
 gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 if(i===1||i===2){
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate);
  const data=buffer.getChannelData(0);for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter();
  source.buffer=buffer;filter.type='highpass';filter.frequency.value=i===2?7000:1400;source.connect(filter);filter.connect(gain);source.start(time);source.stop(time+duration+.02);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }else{
  const source=audio.createOscillator();source.type=i===3?'triangle':'sine';
  const scale=[0,3,5,7,10],frequency=i===0?145:i===3?65.406:261.626*2**(scale[tr.pitch%5]/12);
  source.frequency.setValueAtTime(frequency,time);
  if(i===0)source.frequency.exponentialRampToValueAtTime(43,time+.15);
  source.connect(gain);source.start(time);source.stop(time+duration+.03);source.onended=()=>{source.disconnect();gain.disconnect();};
 }
}
function schedule(){
 if(!audio||!playing)return;
 if(nextTime<audio.currentTime-.1){stop();return;}
 while(nextTime<audio.currentTime+.1){
  const s=step%16;tracks.forEach((tr,i)=>{if(tr.points[s])voice(i,nextTime);});
  events.push({time:nextTime,step:s});nextTime+=60/bpm/4;step++;
 }
}
function stop(){
 playing=false;if(timer)clearInterval(timer);timer=undefined;events.length=0;
 if(master&&audio){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(0,audio.currentTime,.01);}
 $('#play').textContent='▶ '+t.play;$('#play').setAttribute('aria-pressed','false');
}
let starting=false;
async function start(){
 if(starting)return;starting=true;
 try{
  audio??=new AudioContext();
  if(!master){master=audio.createGain();const compressor=audio.createDynamicsCompressor();master.connect(compressor);compressor.connect(audio.destination);}
  await audio.resume();if(document.hidden)return;
  master.gain.setValueAtTime(Number($<HTMLInputElement>('#volume').value),audio.currentTime);
  playing=true;step=0;nextTime=audio.currentTime+.05;anchor=nextTime;
  $('#play').textContent='Ⅱ '+t.pause;$('#play').setAttribute('aria-pressed','true');$('#audio-status').textContent='';
  schedule();timer=setInterval(schedule,25);
 }catch{$('#audio-status').textContent=t.error;stop();}
 finally{starting=false;}
}
$('#play').addEventListener('click',()=>playing?stop():void start());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
$<HTMLInputElement>('#tempo').addEventListener('input',e=>{bpm=Number((e.target as HTMLInputElement).value);$('#tempo-value').textContent=bpm+' BPM';});
$<HTMLInputElement>('#volume').addEventListener('input',e=>{if(master&&audio&&playing)master.gain.setTargetAtTime(Number((e.target as HTMLInputElement).value),audio.currentTime,.02);});
$('#clear').addEventListener('click',()=>{tracks.forEach(tr=>tr.points.fill(false));sync();});
$('#reset').addEventListener('click',()=>{tracks.forEach((tr,i)=>{tr.points=Array.from({length:16},(_,s)=>i===0?s%4===0:i===1?s%8===4:i===2?s%2===0:i===3?s%8===0:s%5===0);tr.pitch=0;});sync();});
$('#random').addEventListener('click',()=>{tracks.forEach((tr,i)=>{tr.points=tr.points.map(()=>Math.random()<(i===2?.55:.23));tr.pitch=Math.floor(Math.random()*5);});sync();});
function focus(on:boolean){document.body.classList.toggle('focus-view',on);$('#focus').setAttribute('aria-pressed',String(on));$('#focus').textContent=(on?t.exit:t.focus)+' ⛶';}
$('#focus').addEventListener('click',()=>focus(!document.body.classList.contains('focus-view')));
document.addEventListener('keydown',e=>{if(e.key==='Escape')focus(false);});
function position(e:PointerEvent,c:HTMLCanvasElement){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height};}
orbit.addEventListener('pointerdown',e=>{
 const p=position(e,orbit),x=p.x-350,y=p.y-350,r=Math.hypot(x,y);
 let i=Math.round((300-r)/46);if(i<0||i>4||Math.abs(r-(300-i*46))>19)return;
 const s=Math.round(((Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16;
 tracks[i].points[s]=!tracks[i].points[s];sync();
});
type Trail={x:number;y:number;time:number;start:boolean;color:string};
let trail:Trail[]=[],active:number|null=null,last:Trail|undefined,lastStamp=0,lastDirection:number|undefined;
function paint(e:PointerEvent,first=false){
 const p=position(e,drawing),now=performance.now(),i=Math.min(4,Math.max(0,Math.floor(p.y/drawing.height*5))),s=Math.min(15,Math.max(0,Math.floor(p.x/drawing.width*16)));
 const speed=last?Math.hypot(p.x-last.x,p.y-last.y)/Math.max(1,now-last.time):0;
 const point={...p,time:now,start:first,color:colors[i]};
 const direction=last?Math.atan2(p.y-last.y,p.x-last.x):undefined;
 if(direction!==undefined&&lastDirection!==undefined&&Math.abs(Math.atan2(Math.sin(direction-lastDirection),Math.cos(direction-lastDirection)))>.4)tracks[4].pitch=(tracks[4].pitch+1)%5;
 lastDirection=direction;trail.push(point);if(trail.length>1500)trail.shift();
 if(first||now-lastStamp>35){tracks[i].points[s]=true;if(speed>1.6)tracks[i].points[(s+1)%16]=true;tracks[i].flash[s]=now;lastStamp=now;sync();}
 last=point;$('#draw-hint').style.display='none';
}
drawing.addEventListener('pointerdown',e=>{if(active!==null)return;active=e.pointerId;drawing.setPointerCapture(active);last=undefined;lastDirection=undefined;paint(e,true);});
drawing.addEventListener('pointermove',e=>{if(e.pointerId===active)paint(e);});
function end(e:PointerEvent){if(e.pointerId===active){active=null;last=undefined;}}
drawing.addEventListener('pointerup',end);drawing.addEventListener('pointercancel',end);drawing.addEventListener('lostpointercapture',end);
function frame(now:number){
 const time=audio?.currentTime||0;
 while(events.length&&events[0].time<=time){const ev=events.shift()!;anchor=ev.time-ev.step*60/bpm/4;tracks.forEach(tr=>{if(tr.points[ev.step]&&!tr.mute)tr.flash[ev.step]=now;});}
 const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
 oc.clearRect(0,0,700,700);
 const angle=playing?Math.max(0,(time-anchor)/(60/bpm*4))*Math.PI*2:0;
 if(playing&&!reduced.matches){
  for(let n=32;n>0;n--){oc.beginPath();oc.moveTo(350,350);oc.arc(350,350,314,angle-Math.PI/2-n*.012,angle-Math.PI/2-(n-1)*.012);oc.closePath();oc.fillStyle='rgba(120,180,210,'+(.0015*(33-n))+')';oc.fill();}
 }
 tracks.forEach((tr,i)=>{
  const r=300-i*46;oc.beginPath();oc.arc(350,350,r,0,Math.PI*2);oc.strokeStyle=tr.color+(dark?'55':'66');oc.lineWidth=1;oc.stroke();
  for(let s=0;s<16;s++){
   const a=s/16*Math.PI*2-Math.PI/2,x=350+Math.cos(a)*r,y=350+Math.sin(a)*r;
   const pulse=reduced.matches?0:Math.max(0,1-(now-tr.flash[s])/550),on=tr.points[s];
   oc.globalAlpha=tr.mute?.28:1;oc.shadowColor=tr.color;oc.shadowBlur=on?(dark?15:6)+pulse*22:0;
   oc.beginPath();oc.arc(x,y,on?5+pulse*3:3,0,Math.PI*2);oc.fillStyle=on?tr.color:(dark?'#101c28':'#fcfdf8');oc.fill();oc.strokeStyle=tr.color;oc.stroke();oc.shadowBlur=0;
   if(pulse>0){oc.beginPath();oc.arc(x,y,10+(1-pulse)*18,0,Math.PI*2);oc.strokeStyle=tr.color;oc.globalAlpha=pulse*.6;oc.stroke();}
   oc.globalAlpha=1;
  }
 });
 oc.beginPath();oc.moveTo(350,350);oc.lineTo(350+Math.cos(angle-Math.PI/2)*317,350+Math.sin(angle-Math.PI/2)*317);oc.strokeStyle=dark?'#d9f5ff':'#465e70';oc.shadowColor='#a5e4ff';oc.shadowBlur=reduced.matches?0:12;oc.lineWidth=1.5;oc.stroke();oc.shadowBlur=0;
 oc.beginPath();oc.arc(350,350,7,0,Math.PI*2);oc.fillStyle=dark?'#d9f5ff':'#465e70';oc.fill();
 dc.clearRect(0,0,700,440);trail=trail.filter(p=>now-p.time<2200);
 for(let n=1;n<trail.length;n++){const a=trail[n-1],b=trail[n];if(b.start)continue;dc.globalAlpha=Math.max(0,1-(now-b.time)/2200);dc.strokeStyle=b.color;dc.shadowColor=b.color;dc.shadowBlur=reduced.matches?0:16;dc.lineWidth=3;dc.lineCap='round';dc.beginPath();dc.moveTo(a.x,a.y);dc.lineTo(b.x,b.y);dc.stroke();}
 dc.globalAlpha=1;dc.shadowBlur=0;
 if(!trail.length&&active===null)$('#draw-hint').style.display='';
 requestAnimationFrame(frame);
}
sync();requestAnimationFrame(frame);
