import {presets,styleCopy,type StyleId} from '../lib/presets';
import {screenWakeLock} from '../lib/wake-lock';
import {evolvePattern,nextEvolutionStep} from '../lib/evolution';
import {enhanceClockSelects} from '../../../shared/preview-selects';
import {defaultInstruments,instrumentIds,instrumentNames,type InstrumentId} from '../lib/instruments';
import {copy} from '../lib/sound-i18n';
const t=copy[document.documentElement.lang as keyof typeof copy]||copy.en;
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const orbit=$<HTMLCanvasElement>('#orbit'), drawing=$<HTMLCanvasElement>('#drawing');
const oc=orbit.getContext('2d')!,dc=drawing.getContext('2d')!;
const atmosphere=$<HTMLCanvasElement>('#sound-atmosphere'),ac=atmosphere.getContext('2d')!;
const colors=['#21bed1','#a482ed','#f0788c','#d8a847','#48bca0','#e68a44','#779cf5','#dc7bcb'];
const lightColors=['#00869b','#7845c7','#cf3659','#a66a08','#078565','#bd5715','#3d66c5','#b0399c'];
const tracks=colors.map((color,i)=>({color,enabled:i<5,instrument:defaultInstruments[i],points:Array.from({length:16},(_,s)=>i===0?s%4===0:i===1?s%8===4:i===2?s%2===0:i===3?s%8===0:i===4?s%5===0:false),mute:false,volume:.65,pitch:0,flash:Array(16).fill(-100),hits:Array<number>(16).fill(-Infinity)}));
let audio:AudioContext|undefined, master:GainNode|undefined, playing=false,timer:ReturnType<typeof setInterval>|undefined,nextTime=0,step=0,bpm=100,anchor=0;
const language=document.documentElement.lang as keyof typeof styleCopy;
let currentStyle:StyleId='electronic',pendingStyle:StyleId|null=null;
let evolving=false,evolutionStep=Infinity;
function setEvolution(on:boolean){
 evolving=on;evolutionStep=on?nextEvolutionStep(step):Infinity;
 $('#evolve').setAttribute('aria-pressed',String(on));labelAction('#evolve',on?t.evolveStop:t.evolve);
 $('#evolution-status').textContent='';
}
const events:{time:number;step:number}[]=[];
function labelAction(selector:string,label:string){const button=$(selector);button.setAttribute('aria-label',label);button.setAttribute('title',label);}
const wake=screenWakeLock($('#wake-status'),'',t.wakeUnavailable);
window.addEventListener('pageshow',()=>wake(document.body.classList.contains('focus-view')));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function activeTracks(){return tracks.map((tr,index)=>({tr,index})).filter(({tr})=>tr.enabled);}
function radius(rank:number,count:number){return 300-rank*(184/Math.max(1,count-1));}
function sync(){
 tracks.forEach((tr,i)=>{
  const row=$<HTMLElement>('[data-track="'+i+'"]');
  row.dataset.enabled=String(tr.enabled);
  row.querySelector<HTMLInputElement>('.track-enabled')!.checked=tr.enabled;
  row.querySelector<HTMLInputElement>('.mute')!.checked=tr.mute;
  row.querySelector<HTMLInputElement>('.track-volume')!.value=String(tr.volume);
  const select=row.querySelector<HTMLSelectElement>('.instrument-select')!;
  select.value=tr.instrument;select.dispatchEvent(new Event('options-sync'));
  const name=instrumentNames[language][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
  row.querySelector('.count')!.textContent=tr.points.filter(Boolean).length+' / 16';
  row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.setAttribute('aria-pressed',String(tr.points[s])));
 });
}
tracks.forEach((tr,i)=>{
 const row=$<HTMLElement>('[data-track="'+i+'"]');
 row.querySelector<HTMLInputElement>('.track-enabled')!.addEventListener('change',e=>{
  tr.enabled=(e.target as HTMLInputElement).checked;tr.flash.fill(-100);tr.hits.fill(-Infinity);sync();
 });
 row.querySelector<HTMLSelectElement>('.instrument-select')!.addEventListener('change',e=>{
  tr.instrument=(e.target as HTMLSelectElement).value as InstrumentId;
  const lang=document.documentElement.lang as keyof typeof instrumentNames;
  const name=instrumentNames[lang][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
 });
 row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.addEventListener('click',()=>{tr.points[s]=!tr.points[s];sync();}));
 row.querySelector<HTMLInputElement>('.mute')!.addEventListener('change',e=>tr.mute=(e.target as HTMLInputElement).checked);
 row.querySelector<HTMLInputElement>('.track-volume')!.addEventListener('input',e=>tr.volume=Number((e.target as HTMLInputElement).value));
});
function voice(i:number,time:number,beat:number){
 const tr=tracks[i];if(!audio||!master||!tr.enabled||tr.mute||tr.volume===0)return;
 const ctx=audio,bus=master,id=tr.instrument;
 const preset=presets[currentStyle],offset=preset.melody[Math.floor(beat/2)%preset.melody.length];
 const scaleIndex=tr.pitch+offset;
 const note=261.626*2**((preset.scale[scaleIndex%preset.scale.length]+12*Math.floor(scaleIndex/preset.scale.length))/12);
 function tone(freq:number,duration:number,level:number,type:OscillatorType='sine',end?:number,attack=.004){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,time);
  if(end)osc.frequency.exponentialRampToValueAtTime(end,time+Math.min(duration,.18));
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*tr.volume),time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 function noise(duration:number,level:number,frequency:number,type:BiquadFilterType='highpass',offset=0){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=time+offset;
  source.buffer=buffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(Math.max(.0002,level*tr.volume),at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(at);source.stop(at+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 switch(id){
  case 'kick':tone(145,.28,.3,'sine',43);break;
  case 'snare':noise(.16,.3,1400);tone(180,.09,.1,'triangle');break;
  case 'hat':noise(.055,.12,7000);break;
  case 'clap':for(let n=0;n<3;n++)noise(n===2?.14:.025,.18,1400,'bandpass',n*.018);break;
  case 'tom':tone(210,.36,.32,'sine',85);break;
  case 'rim':tone(820,.035,.17,'triangle');tone(1730,.025,.09);break;
  case 'shaker':noise(.09,.18,5000,'bandpass');break;
  case 'bass':tone(note/4,.4,.3,'triangle');break;
  case 'synthbass':tone(note/4,.34,.18,'sawtooth');tone(note/8,.4,.13);break;
  case 'marimba':tone(note,.8,.3);tone(note*4,.12,.06);break;
  case 'bells':tone(note*2,1.5,.19);tone(note*5.52,.8,.06);break;
  case 'kalimba':tone(note,.65,.23);tone(note*2.76,.09,.1);break;
  case 'pluck':tone(note,.25,.18,'triangle');tone(note*2,.1,.08);break;
  case 'piano':
   tone(note,1.15,.2);tone(note*2,.6,.08);tone(note*3,.25,.035);break;
  case 'strings':
   for(const detune of [.997,1.003]){tone(note*detune,1.65,.065,'triangle',undefined,.2);tone(note*2*detune,1.5,.025,'sine',undefined,.25);}break;
  case 'guitar':
   tone(note/2,.5,.19,'triangle');tone(note,.32,.075);tone(note*1.5,.2,.045);break;
  case 'organ':
   tone(note,.65,.13,'sine',undefined,.025);tone(note*2,.65,.06,'sine',undefined,.025);tone(note*3,.65,.035,'sine',undefined,.025);break;
  case 'pad':tone(note,1.8,.09,'sine',undefined,.28);tone(note*1.002,1.8,.07,'triangle',undefined,.28);break;
 }
}
function schedule(){
 if(!audio||!playing)return;
 if(nextTime<audio.currentTime-.1){stop();return;}
 while(nextTime<audio.currentTime+.1){
  if(pendingStyle&&step%16===0)applyStyle(pendingStyle);
  if(evolving&&step%16===0&&step>=evolutionStep){
   evolvePattern(tracks,Math.random,presets[currentStyle].grid);
   if(currentStyle==='classical'||currentStyle==='ambient'){const melodic=tracks.filter(tr=>tr.enabled&&!tr.mute&&!['kick','snare','hat','clap','tom','rim','shaker'].includes(tr.instrument));if(melodic.length){const tr=melodic[Math.floor(Math.random()*melodic.length)];tr.pitch=(tr.pitch+1)%presets[currentStyle].scale.length;}}sync();evolutionStep=nextEvolutionStep(step);
  }
  const s=step%16;tracks.forEach((tr,i)=>{if(tr.points[s])voice(i,nextTime,s);});
  events.push({time:nextTime,step:s});nextTime+=60/bpm/4;step++;
 }
}
function stop(){
 setEvolution(false);playing=false;if(timer)clearInterval(timer);timer=undefined;events.length=0;tracks.forEach(tr=>tr.hits.fill(-Infinity));
 if(master&&audio){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(0,audio.currentTime,.01);}
 if(pendingStyle)applyStyle(pendingStyle);
 labelAction('#play',t.play);$('#play').setAttribute('aria-pressed','false');
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
  labelAction('#play',t.pause);$('#play').setAttribute('aria-pressed','true');$('#audio-status').textContent='';
  schedule();timer=setInterval(schedule,25);
 }catch{$('#audio-status').textContent=t.error;stop();}
 finally{starting=false;}
}
$('#evolve').addEventListener('click',async()=>{
 if(starting)return;
 if(evolving){setEvolution(false);return;}
 if(!playing)await start();
 if(playing)setEvolution(true);
});
$('#play').addEventListener('click',()=>playing?stop():void start());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
$<HTMLInputElement>('#tempo').addEventListener('input',e=>{bpm=Number((e.target as HTMLInputElement).value);$('#tempo-value').textContent=bpm+' BPM';});
$<HTMLInputElement>('#volume').addEventListener('input',e=>{if(master&&audio&&playing)master.gain.setTargetAtTime(Number((e.target as HTMLInputElement).value),audio.currentTime,.02);});
$('#clear').addEventListener('click',()=>{tracks.forEach(tr=>tr.points.fill(false));sync();});
function applyStyle(id:StyleId){
 currentStyle=id;pendingStyle=null;const preset=presets[id];
 tracks.forEach((tr,i)=>{
  const part=preset.parts[i];tr.enabled=!!part;tr.instrument=part?.instrument||defaultInstruments[i];
  tr.points=Array.from({length:16},(_,s)=>!!part?.steps.includes(s));tr.pitch=part?.pitch||0;tr.volume=part?.volume??.55;tr.mute=false;tr.flash.fill(-100);tr.hits.fill(-Infinity);
 });
 bpm=preset.bpm;$<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
 syncStyleTiles();
 $('#style-status').textContent='';sync();
}
function syncStyleTiles(){
 document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.stylePreset===currentStyle));
  button.classList.toggle('is-pending',button.dataset.stylePreset===pendingStyle);
 });
}
document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.stylePreset as StyleId;
 if(id===currentStyle){pendingStyle=null;$('#style-status').textContent='';syncStyleTiles();return;}
 if(playing){pendingStyle=id;$('#style-status').textContent=styleCopy[language].pending;syncStyleTiles();}
 else applyStyle(id);
}));
$('#reset').addEventListener('click',()=>{const id=pendingStyle||currentStyle;if(playing){pendingStyle=id;$('#style-status').textContent=styleCopy[language].pending;}else applyStyle(id);});
$('#random').addEventListener('click',()=>{
 const preset=presets[currentStyle];
 tracks.forEach(tr=>{if(!tr.enabled)return;tr.points=tr.points.map((_,s)=>tr.instrument==='kick'&&s%4===0?true:preset.grid.includes(s)&&Math.random()<preset.density);tr.pitch=Math.floor(Math.random()*preset.scale.length);});sync();
});
let ownsFullscreen=false;
function focus(on:boolean,requestFullscreen=true){
 wake(on);document.body.classList.toggle('focus-view',on);
 if(!on)document.body.classList.remove('focus-idle','focus-cursor-hidden');
 $('#focus').setAttribute('aria-pressed',String(on));labelAction('#focus',on?t.exit:t.focus);
 if(on&&requestFullscreen&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
  // Request directly inside the user gesture; denial falls back to the page's focus view.
  void document.documentElement.requestFullscreen().then(()=>{
   ownsFullscreen=true;
   if(!document.body.classList.contains('focus-view')&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  }).catch(()=>{});
 }else if(!on&&ownsFullscreen&&document.fullscreenElement){
  ownsFullscreen=false;void document.exitFullscreen().catch(()=>{});
 }
}
document.addEventListener('fullscreenchange',()=>{
 if(!document.fullscreenElement&&ownsFullscreen){ownsFullscreen=false;focus(false,false);}
});
$('#focus').addEventListener('click',()=>focus(!document.body.classList.contains('focus-view')));
document.addEventListener('keydown',e=>{if(e.key==='Escape')focus(false);});
function position(e:PointerEvent,c:HTMLCanvasElement){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height};}
orbit.addEventListener('pointerdown',e=>{
 const p=position(e,orbit),x=p.x-350,y=p.y-350,r=Math.hypot(x,y);
 const active=activeTracks();if(!active.length)return;
 const nearest=active.map((entry,rank)=>({...entry,distance:Math.abs(r-radius(rank,active.length))})).sort((a,b)=>a.distance-b.distance)[0];
 if(nearest.distance>Math.min(19,92/Math.max(1,active.length-1)))return;
 const i=nearest.index;
 const s=Math.round(((Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16;
 tracks[i].points[s]=!tracks[i].points[s];sync();
});
type Trail={x:number;y:number;time:number;start:boolean;color:string};
const paintedSteps=new Set<string>();
function togglePaintedStep(track:number,step:number,now:number){
 const key=track+':'+step;if(paintedSteps.has(key))return;paintedSteps.add(key);
 const tr=tracks[track];tr.points[step]=!tr.points[step];tr.flash[step]=tr.points[step]?now:-100;tr.hits[step]=-Infinity;
}
let trail:Trail[]=[],active:number|null=null,last:Trail|undefined,lastStamp=0,lastDirection:number|undefined;
function paint(e:PointerEvent,first=false){
 const active=activeTracks();if(!active.length)return;
 const p=position(e,drawing),now=performance.now(),i=active[Math.min(active.length-1,Math.max(0,Math.floor(p.y/drawing.height*active.length)))].index,s=Math.min(15,Math.max(0,Math.floor(p.x/drawing.width*16)));
 const speed=last?Math.hypot(p.x-last.x,p.y-last.y)/Math.max(1,now-last.time):0;
 const point={...p,time:now,start:first,color:colors[i]};
 const direction=last?Math.atan2(p.y-last.y,p.x-last.x):undefined;
 if(direction!==undefined&&lastDirection!==undefined&&Math.abs(Math.atan2(Math.sin(direction-lastDirection),Math.cos(direction-lastDirection)))>.4)tracks[i].pitch=(tracks[i].pitch+1)%presets[currentStyle].scale.length;
 lastDirection=direction;trail.push(point);if(trail.length>1500)trail.shift();
 if(first||now-lastStamp>35){togglePaintedStep(i,s,now);if(speed>1.6)togglePaintedStep(i,(s+1)%16,now);lastStamp=now;sync();}
 last=point;$('#draw-hint').style.display='none';
}
drawing.addEventListener('pointerdown',e=>{if(active!==null)return;active=e.pointerId;paintedSteps.clear();drawing.setPointerCapture(active);last=undefined;lastDirection=undefined;paint(e,true);});
drawing.addEventListener('pointermove',e=>{if(e.pointerId===active)paint(e);});
function end(e:PointerEvent){if(e.pointerId===active){active=null;last=undefined;}}
drawing.addEventListener('pointerup',end);drawing.addEventListener('pointercancel',end);drawing.addEventListener('lostpointercapture',end);
/** Low-resolution atmospheric lighting, driven by scheduled audible note hits. */
function renderAtmosphere(time:number,dark:boolean){
 const w=atmosphere.width,h=atmosphere.height;
 ac.clearRect(0,0,w,h);
 atmosphere.dataset.style=currentStyle;
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 const masterLevel=Number($<HTMLInputElement>('#volume').value);
 const beats=time*bpm/60,still=reduced.matches||!playing;
 const profile={
  electronic:{speed:.09,size:210,power:1},
  house:{speed:.12,size:200,power:1.15},
  pop:{speed:.07,size:220,power:.9},
  rock:{speed:.16,size:180,power:1.1},
  classical:{speed:.035,size:265,power:.65},
  ambient:{speed:.018,size:330,power:.55}
 }[currentStyle];
 for(const {tr,index} of active){
  const phase=still?tr.pitch*.3:beats*profile.speed+tr.pitch*.3;
  const x=w*(.18+.64*(.5+.5*Math.sin(index*2.4+phase)));
  const y=h*(.2+.6*(.5+.5*Math.cos(index*1.7+phase*.73)));
  const age=time-Math.max(...tr.hits);
  const decay=currentStyle==='ambient'?1.5:currentStyle==='classical'?2.2:4;
  const hit=playing&&age>=0&&age<2?Math.exp(-age*decay):0;
  const energy=tr.volume*Math.min(1,masterLevel/.3);
  const pulse=reduced.matches?0:hit*energy;
  const size=profile.size+pulse*95+(still?0:Math.sin(beats*profile.speed*3+index)*20);
  ac.globalAlpha=(dark?.13:.065)+pulse*(dark?.24:.12)*profile.power;
  const glow=ac.createRadialGradient(x,y,0,x,y,size);
  glow.addColorStop(0,tr.color);glow.addColorStop(.4,tr.color+'99');glow.addColorStop(1,tr.color+'00');
  ac.fillStyle=glow;ac.fillRect(x-size,y-size,size*2,size*2);
  if(still)continue;
  ac.strokeStyle=tr.color;ac.fillStyle=tr.color;ac.lineWidth=2;
  if(currentStyle==='classical'){
   // Long, quiet ribbons, more like a conductor's gesture than a drum pulse.
   ac.globalAlpha=(dark?.07:.04)+pulse*.12;
   for(let ribbon=0;ribbon<2;ribbon++){
    const offset=ribbon*25;
    ac.beginPath();ac.moveTo(-40,y+offset);
    ac.bezierCurveTo(w*.25,y-100-Math.sin(phase)*55,w*.65,y+130+offset,w+40,y-40+offset);
    ac.stroke();
   }
  }else if(currentStyle==='ambient'){
   // Broad, slow breathing halos; no sharp percussive accents.
   ac.globalAlpha=(dark?.035:.025)+pulse*.07;
   ac.lineWidth=10;ac.beginPath();
   ac.ellipse(x,y,size*.85,size*.5,phase*.1,0,Math.PI*2);ac.stroke();
  }else if(pulse>.015){
   ac.globalAlpha=pulse*(dark?.25:.15)*profile.power;
   if(currentStyle==='house'){
    for(let ring=0;ring<2;ring++){
     ac.beginPath();ac.arc(x,y,55+age*190+ring*32,0,Math.PI*2);ac.stroke();
    }
   }else if(currentStyle==='pop'){
    // Four-point sparkles fan out from an audible note.
    for(let spark=0;spark<3;spark++){
     const theta=spark*Math.PI*2/3+index;
     const sx=x+Math.cos(theta)*(45+age*90),sy=y+Math.sin(theta)*(45+age*90),r=8+pulse*18;
     ac.beginPath();ac.moveTo(sx,sy-r);ac.quadraticCurveTo(sx+2,sy-2,sx+r,sy);
     ac.quadraticCurveTo(sx+2,sy+2,sx,sy+r);ac.quadraticCurveTo(sx-2,sy+2,sx-r,sy);
     ac.quadraticCurveTo(sx-2,sy-2,sx,sy-r);ac.fill();
    }
   }else if(currentStyle==='rock'){
    ac.lineWidth=2+pulse*3;ac.beginPath();
    for(let n=0;n<=24;n++){
     const px=x-220+n*440/24;
     const py=y+Math.sin(n*2.1+index)*Math.sin(n*Math.PI/24)*pulse*90;
     if(n===0)ac.moveTo(px,py);else ac.lineTo(px,py);
    }
    ac.stroke();
   }else{
    ac.beginPath();ac.ellipse(x,y,90+age*230,55+age*140,index*.35,0,Math.PI*2);ac.stroke();
   }
  }
 }
 ac.globalAlpha=1;ac.lineWidth=1;
}
function frame(now:number){
 const time=audio?.currentTime||0;
 while(events.length&&events[0].time<=time){const ev=events.shift()!;anchor=ev.time-ev.step*60/bpm/4;tracks.forEach(tr=>{if(tr.enabled&&tr.points[ev.step]&&!tr.mute&&tr.volume>0){tr.flash[ev.step]=now;tr.hits[ev.step]=ev.time;}});}
 const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
 tracks.forEach((tr,i)=>{tr.color=(dark?colors:lightColors)[i];});
 renderAtmosphere(time,dark);
 oc.clearRect(0,0,700,700);
 const angle=playing?Math.max(0,(time-anchor)/(60/bpm*4))*Math.PI*2:0;
 const active=activeTracks();
 active.forEach(({tr},rank)=>{
  const r=radius(rank,active.length);oc.beginPath();oc.arc(350,350,r,0,Math.PI*2);oc.strokeStyle=tr.color+(dark?'55':'99');oc.lineWidth=dark?1:1.4;oc.stroke();
  // Only played notes leave a short coloured comet on their own orbit.
  if(playing&&!tr.mute&&!reduced.matches){
   for(let s=0;s<16;s++){
    const age=time-tr.hits[s],lifetime=.65;
    if(age<0||age>=lifetime||!tr.points[s])continue;
    const head=angle-Math.PI/2;
    const length=Math.min(age/(60/bpm*4)*Math.PI*2,.75);
    const fade=Math.pow(1-age/lifetime,.8),segments=28;
    oc.lineCap='round';
    for(let n=segments;n>0;n--){
     const strength=(1-n/(segments+1))*fade;
     const from=head-n*length/segments,to=head-(n-1)*length/segments;
     oc.beginPath();oc.arc(350,350,r,from,to);
     oc.strokeStyle=tr.color;oc.lineWidth=6;oc.globalAlpha=strength*.9;
     oc.shadowColor=tr.color;oc.shadowBlur=dark?18:7;oc.stroke();
    }
    oc.shadowBlur=0;oc.globalAlpha=fade;
    oc.beginPath();oc.arc(350+Math.cos(head)*r,350+Math.sin(head)*r,4.5,0,Math.PI*2);
    oc.fillStyle=tr.color;oc.fill();
   }
   oc.globalAlpha=1;oc.shadowBlur=0;oc.lineCap='butt';oc.lineWidth=1;
  }
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
 for(let n=1;n<trail.length;n++){const a=trail[n-1],b=trail[n];if(b.start)continue;dc.globalAlpha=Math.max(0,1-(now-b.time)/2200);const color=dark?b.color:lightColors[colors.indexOf(b.color)];dc.strokeStyle=color;dc.shadowColor=color;dc.shadowBlur=reduced.matches?0:dark?16:7;dc.lineWidth=3;dc.lineCap='round';dc.beginPath();dc.moveTo(a.x,a.y);dc.lineTo(b.x,b.y);dc.stroke();}
 dc.globalAlpha=1;dc.shadowBlur=0;
 if(!trail.length&&active===null)$('#draw-hint').style.display='';
 requestAnimationFrame(frame);
}
enhanceClockSelects($('.instruments-tile') as HTMLFormElement);
sync();requestAnimationFrame(frame);
