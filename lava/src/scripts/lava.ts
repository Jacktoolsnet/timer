import {hitBlob,sheddingPoint} from '../lib/shedding';
import {LavaTrail} from '../lib/trail';
import {BubbleAudio} from '../lib/bubble-audio';
import {LavaInteraction} from '../lib/interaction';
import {presets} from '../lib/presets';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
import {createBlobColours, advanceBlobColours} from '../lib/rainbow';
const trail=new LavaTrail();
const shedding=new LavaTrail();
const sheddingEnabled=document.querySelector<HTMLInputElement>('#lava-shedding')!;
const trailEnabled=document.querySelector<HTMLInputElement>('#lava-trail')!;
const trailCanvas=document.querySelector<HTMLCanvasElement>('#lava-trail-canvas')!;
const trailContext=trailCanvas.getContext('2d');
const canvas = document.querySelector<HTMLCanvasElement>('#lava-canvas')!;
const stage = document.querySelector<HTMLElement>('#lava-stage')!;
const toggle = document.querySelector<HTMLButtonElement>('#lava-toggle')!;
const status = document.querySelector<HTMLElement>('#lava-status')!;
const speed = document.querySelector<HTMLInputElement>('#lava-speed')!;
const brightness = document.querySelector<HTMLInputElement>('#lava-brightness')!;
const viscosity=document.querySelector<HTMLInputElement>('#lava-viscosity')!;
let fluidColour=0;
const touch=document.querySelector<HTMLInputElement>('#lava-touch')!;
const evolution=document.querySelector<HTMLInputElement>('#lava-evolution')!;
const interaction=new LavaInteraction();
let evolutionTime=12;
const sound=document.querySelector<HTMLInputElement>('#lava-sound')!;
const bubbleAudio=new BubbleAudio();
const volume=document.querySelector<HTMLInputElement>('#lava-volume')!;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
let running = false, frame = 0, previous = 0, elapsed = 12, colour = 0;
const colours = [[1,.28,.055],[.63,.22,1],[.05,.85,.64],[1,.22,.49],[.63,.22,1],[.64,.72,.84],[.78,.34,.17],[.95,.66,.17],[.16,.19,.28]];
const glows = ['#ff703e','#b784ff','#50e8cc','#ff80b5','#ae7eff','#bdcce0','#dc916a','#edc46b','#9582ce'];
const blobColours=createBlobColours();
let program: WebGLProgram | null = null;
const textureData=new Uint8Array(16*2*4);
const blobTexture=gl?.createTexture();
if(gl&&blobTexture){
 gl.bindTexture(gl.TEXTURE_2D,blobTexture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function shader(type: number, source: string) {
 const s = gl!.createShader(type)!; gl!.shaderSource(s,source); gl!.compileShader(s);
 if (!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)) {gl!.deleteShader(s);throw Error('Shader compilation failed');}
 return s;
}
if (gl) {
 try {
 program = gl.createProgram()!;
 const vertex = shader(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
 const fragment = shader(gl.FRAGMENT_SHADER,`
 #ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
 #endif
 varying vec2 uv; uniform vec4 params; uniform vec4 colourData; uniform sampler2D blobs; uniform float evolutionTime; uniform vec2 resolution;
 #define time params.x
 #define aspect params.y
 #define material params.z
 #define viscosity params.w
 #define colour colourData.rgb
 float contribution(vec2 p, float n){
   float phase=time*(.11+n*.006)+n*2.399;
   vec2 c=vec2(.5+sin(phase*.45+n*2.399)*.46,.5+.55*sin(phase));
   vec2 offset=texture2D(blobs,vec2((n+.5)/16.,.75)).rg;
   c+=(offset*255.-128.)/127.*.24;
   float r=.055+.035*(.5+.5*sin(n*7.));
   // Stretch fastest in transit, then gather at the turning points.
   // Reciprocal axes preserve approximate area instead of inflating the wax.
   float travel=abs(cos(phase));
   float shapeCycle=.5+.5*sin(evolutionTime*(.075/(1.+viscosity))+n*1.73);
   float stretch=.85+(1.2+1.3*viscosity)*pow(shapeCycle,1.4)*(.6+.4*travel);
   // Size wax relative to the shorter side: portrait must not magnify
   // blobs until they fill almost the entire narrow viewport.
   vec2 d=(p-c)*vec2(aspect,1.)/min(aspect,1.);
   float tilt=.38*sin(phase*.65+n);
   d=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*d;
   // A gently bent centreline and a tapered trailing end avoid rigid ellipses.
   d.x+=.014*sin(d.y*12.+phase+n)*smoothstep(0.,.12,abs(d.y));
   float tail=.17*sin(phase+1.5708)*d.y/r;
   float taper=1.+.28*tail/sqrt(.28*.28+tail*tail);
   d*=vec2(sqrt(stretch)*taper,1./sqrt(stretch));
   // Slowly morph the cross-section from round to a soft rounded square.
   // Normalising by radius keeps the exponent numerically stable on mobile GPUs.
   float squareness=smoothstep(.18,.88,.5+.5*sin(evolutionTime*.055+n*2.17));
   float exponent=mix(2.,4.2,squareness);
   vec2 q=sqrt(d*d+vec2(.000001))/r;
   float distanceSquared=pow(pow(q.x,exponent)+pow(q.y,exponent),2./exponent);
   return 1./(distanceSquared+.001/(r*r));
 }
 float field(vec2 p){
  float f=0.;
  for(int i=0;i<14;i++){
   f+=contribution(p,float(i));
  }
  f+=.0025/(p.y*p.y+.002);
  return f;
 }
 // A bounded surface height prevents the strong metaball core from
 // producing a pinched highlight/ridge through the centre of each blob.
 float surfaceHeight(vec2 p){
  float f=field(p);
  return f/(1.+f);
 }
 void main(){
  vec2 p=uv;
  float f=field(p);

  vec2 stepSize=.004*min(aspect,1.)/vec2(aspect,1.);
  vec2 grad=vec2(
   surfaceHeight(p+vec2(stepSize.x,0.))-surfaceHeight(p-vec2(stepSize.x,0.)),
   surfaceHeight(p+vec2(0.,stepSize.y))-surfaceHeight(p-vec2(0.,stepSize.y)));
  // Keep contour softness near one physical pixel, not a fraction of
  // the scene: fullscreen should reveal detail rather than enlarge blur.
  float height= f/(1.+f);
  vec2 fieldSlope=grad/(2.*stepSize)/max((1.-height)*(1.-height),.0001);
  float edgeWidth=clamp(length(fieldSlope/resolution)*.85,.002,.09);
  float mask=smoothstep(.905-edgeWidth,.905+edgeWidth,f);
  vec3 normal=normalize(vec3(-grad*9.,.65));
  // A concealed bulb below the glass lights the wax and the carrier liquid.
  vec3 toBulb=normalize(vec3((.5-p.x)*.15,-.12-p.y,.32));
  float light=max(0.,dot(normal,toBulb));
  float uplight=exp(-p.y*2.1);
  float coneWidth=.8+p.y*.36;
  float beam=exp(-pow((p.x-.5)/coneWidth,2.))*exp(-p.y*1.65);
  vec3 waxColour=colour;
  if(abs(material-4.)<.1){
   vec3 mixed=vec3(0.);float total=0.;
   for(int i=0;i<14;i++){
    // Local influence blends at the neck, without tinting distant blobs.
    float weight=pow(contribution(p,float(i)),2.);
    mixed+=texture2D(blobs,vec2((float(i)+.5)/16.,.25)).rgb*weight;total+=weight;
   }
   waxColour=mixed/max(total,.0001);
  }
  if(material<3.5){
   vec3 nuance=.5+.5*cos(evolutionTime*.018+vec3(0.,2.094,4.188));
   waxColour=mix(waxColour,waxColour*(.65+.7*nuance),.32);
  }
  vec3 lampLight=mix(waxColour,vec3(1.,.82,.48),.26);
  float rim=pow(1.-normal.z,2.);
  vec3 liquid=waxColour*(.75+.48*light)+lampLight*(.22+.48*uplight)+vec3(1.,.88,.65)*pow(light,10.)*.28;
  liquid+=waxColour*rim*.5;
  if(material>4.5){
   // Broad studio-like reflections rather than pin-point highlights.
   vec3 reflection=reflect(vec3(0.,0.,-1.),normal);
   float band=exp(-pow((reflection.x+.3+reflection.y*.35)/.24,2.));
   float softbox=exp(-pow((reflection.x-.45)/.5,2.))*smoothstep(-.5,.7,reflection.y);
   float fresnel=.16+.84*pow(1.-normal.z,3.);
   liquid=waxColour*(.22+.38*light)+waxColour*band*.65
    +mix(waxColour,vec3(1.),.6)*softbox*.65+vec3(.65,.74,.9)*fresnel*.3;
   if(material>7.5){
    // Thin-film-inspired interference; varies with curvature and slow motion.
    float film=normal.z*2.2+normal.x*.28+normal.y*.18
     +.13*sin(p.x*4.+p.y*3.+evolutionTime*.055);
    vec3 iridescence=.5+.5*cos(6.28318*(film+vec3(0.,.33,.67)));
    liquid=mix(vec3(.045,.055,.09),iridescence,.38+.38*fresnel)
     +iridescence*band*.32+vec3(.75,.87,1.)*softbox*.3;
   }
  }
  vec3 carrier=vec3(.055,.025,.095);
  if(colourData.w>.5)carrier=vec3(.025,.13,.32);
  if(colourData.w>1.5)carrier=vec3(.19,.045,.29);
  if(colourData.w>2.5)carrier=vec3(.29,.13,.025);
  if(colourData.w>3.5)carrier=vec3(.025,.22,.19);
  vec3 bg=carrier+colour*.055;
  liquid=mix(liquid,liquid*(.8+carrier*.9),.28);
  bg+=lampLight*beam*.34;
  // Concentrated warm glow above the base, diffusing into the liquid.
  float source=exp(-pow((p.x-.5)/.9,2.)-p.y*24.);
  bg+=lampLight*source*.65;
  bg+=colour*.12*min(f,.9);
  gl_FragColor=vec4(mix(bg,liquid,mask),1.);
 }`);
 gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader linking failed');
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 gl.deleteShader(vertex);gl.deleteShader(fragment);
 } catch {program=null;stage.classList.add('no-webgl');}
} else stage.classList.add('no-webgl');
function draw(){
 drawTrail();
 if(!gl||!program)return;
 const ratio=Math.min(devicePixelRatio||1,2);
 const width=Math.round(canvas.clientWidth*ratio),height=Math.round(canvas.clientHeight*ratio);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 gl.uniform2f(gl.getUniformLocation(program,'resolution'),width,height);
 gl.viewport(0,0,width,height);gl.uniform4f(gl.getUniformLocation(program,'params'),elapsed,width/height,colour,Number(viscosity.value)/100);
 for(let i=0;i<14;i++){
  for(let c=0;c<3;c++)textureData[i*4+c]=Math.round(blobColours[i*3+c]*255);
  textureData[i*4+3]=255;
  for(let c=0;c<2;c++)textureData[64+i*4+c]=Math.round(128+interaction.offsets[i*2+c]/.24*127);
 }
 gl.bindTexture(gl.TEXTURE_2D,blobTexture!);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,16,2,0,gl.RGBA,gl.UNSIGNED_BYTE,textureData);
 gl.uniform1i(gl.getUniformLocation(program,'blobs'),0);
 gl.uniform1f(gl.getUniformLocation(program,'evolutionTime'),evolutionTime);
 gl.uniform4f(gl.getUniformLocation(program,'colourData'),...colours[colour] as [number,number,number],fluidColour);gl.drawArrays(gl.TRIANGLES,0,6);
}
function animate(now:number){
 if(!running||document.hidden)return;
 if(previous){
  const dt=Math.min((now-previous)/1000,.05)*Number(speed.value)/(1+Number(viscosity.value)/100*1.5);
  elapsed+=dt;
  if(evolution.checked)evolutionTime+=dt;
  shedding.advance(dt,Number(viscosity.value)/100);
  trail.advance(dt,Number(viscosity.value)/100);
  interaction.advance(dt,Number(viscosity.value)/100);
  if(colour===4)advanceBlobColours(blobColours,elapsed,dt,canvas.clientWidth/canvas.clientHeight,Number(viscosity.value)/100,interaction.offsets,evolution.checked);
 }
 bubbleAudio.update(elapsed,canvas.clientWidth/canvas.clientHeight,Number(viscosity.value)/100,interaction.offsets);
 previous=now;draw();frame=requestAnimationFrame(animate);
}
function sync(){
 cancelAnimationFrame(frame);previous=0;
 if(!running||document.hidden)bubbleAudio.stop();
 const label=running?toggle.dataset.pause!:toggle.dataset.start!;
 toggle.setAttribute('aria-label',label);toggle.title=label;
 toggle.setAttribute('aria-pressed',String(running));
 if(running&&!document.hidden)frame=requestAnimationFrame(animate);
}
toggle.addEventListener('click',()=>{running=!running;status.textContent='';sync();if(running&&sound.checked)void bubbleAudio.start();});
document.addEventListener('visibilitychange',sync);
motion.addEventListener('change',()=>{if(motion.matches){running=false;status.textContent=status.dataset.reduced!;sync();}});
document.querySelectorAll<HTMLInputElement>('[name=lava-color]').forEach(input=>input.addEventListener('change',()=>{
 colour=Number(input.value);stage.dataset.rainbow=String(colour===4);stage.dataset.material=['ember','amethyst','lagoon','rose','rainbow','silver','copper','gold','oil'][colour];
 const picker=document.querySelector<HTMLDetailsElement>('#lava-colour-picker')!;
 document.querySelector('#lava-colour-value')!.textContent=input.closest('label')!.querySelector('strong')!.textContent;
 picker.open=false;
 stage.style.setProperty('--glow',glows[colour]);draw();
}));
speed.addEventListener('input',()=>{document.querySelector('#speed-value')!.textContent=Number(speed.value)+'×';});
brightness.addEventListener('input',()=>{
 stage.style.setProperty('--brightness',String(Number(brightness.value)/100));
 document.querySelector('#brightness-value')!.textContent=brightness.value+' %';
});
document.querySelector<HTMLButtonElement>('#lava-fullscreen')!.addEventListener('click',async(e)=>{
 const button=e.currentTarget as HTMLButtonElement;
 try {if(!stage.requestFullscreen)throw Error();await stage.requestFullscreen();}
 catch {status.textContent=button.dataset.error!;}
});
document.querySelector('#exit-fullscreen')!.addEventListener('click',()=>{void document.exitFullscreen();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;program=null;stage.classList.add('no-webgl');sync();});
const resizeCanvas=new ResizeObserver(()=>{if(!running)draw();});
resizeCanvas.observe(stage);
window.addEventListener('resize',()=>{if(!running)draw();});
draw();
if(motion.matches)status.textContent=status.dataset.reduced!;
export {};

// Keep focus controls available on interaction, but out of the way while watching.
let controlsTimer: ReturnType<typeof setTimeout> | undefined;
function revealFocusControls() {
 clearTimeout(controlsTimer);
 stage.classList.remove('focus-controls-hidden');
 if (document.fullscreenElement !== stage) return;
 controlsTimer = setTimeout(() => {
  // Never hide the control currently being used from the keyboard.
  if (stage.querySelector('.stage-play:focus-visible, .fullscreen-exit:focus-visible')) return;
  stage.classList.add('focus-controls-hidden');
 }, 3000);
}
document.addEventListener('fullscreenchange', revealFocusControls);
stage.addEventListener('pointermove', revealFocusControls);
stage.addEventListener('pointerdown', revealFocusControls);
stage.addEventListener('keydown', revealFocusControls);
stage.addEventListener('focusin', revealFocusControls);
stage.addEventListener('focusout', revealFocusControls);

const colourPicker=document.querySelector<HTMLDetailsElement>('#lava-colour-picker')!;
document.addEventListener('click',event=>{if(!colourPicker.contains(event.target as Node))colourPicker.open=false;});
colourPicker.addEventListener('keydown',event=>{if(event.key==='Escape'){colourPicker.open=false;colourPicker.querySelector('summary')!.focus();}});


const fluidPicker=document.querySelector<HTMLDetailsElement>('#fluid-picker')!;
document.querySelectorAll<HTMLInputElement>('[name=fluid-color]').forEach(input=>input.addEventListener('change',()=>{
 fluidColour=Number(input.value);
 document.querySelector('#fluid-value')!.textContent=input.closest('label')!.querySelector('strong')!.textContent;
 fluidPicker.open=false;draw();saveLavaSettings();
}));
document.addEventListener('click',event=>{if(!fluidPicker.contains(event.target as Node))fluidPicker.open=false;});
fluidPicker.addEventListener('keydown',event=>{if(event.key==='Escape'){fluidPicker.open=false;fluidPicker.querySelector('summary')!.focus();}});
viscosity.addEventListener('input',()=>{
 document.querySelector('#viscosity-value')!.textContent=viscosity.value+' %';draw();saveLavaSettings();
});

// Save only with explicit consent; never persist playback or a running session.
function saveLavaSettings() {
 if (!storageAllowed()) return;
 try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
   colour, speed: Number(speed.value), brightness: Number(brightness.value), fluidColour, viscosity: Number(viscosity.value), touch:touch.checked, evolution:evolution.checked, sound:sound.checked, trail:trailEnabled.checked, shedding:sheddingEnabled.checked, volume:Number(volume.value)
  }));
 } catch { /* Blocked/full storage must not prevent using the animation. */ }
}
document.addEventListener('storage-enabled', saveLavaSettings);
document.querySelectorAll<HTMLInputElement>('[name=lava-color]').forEach(input =>
 input.addEventListener('change', saveLavaSettings));
speed.addEventListener('input', saveLavaSettings);
brightness.addEventListener('input', saveLavaSettings);
if (storageAllowed()) {
 try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
   if(typeof saved.shedding==='boolean')sheddingEnabled.checked=saved.shedding;
   if(typeof saved.trail==='boolean')trailEnabled.checked=saved.trail;
   if(typeof saved.sound==='boolean')sound.checked=saved.sound;
   if(Number.isInteger(saved.volume)&&saved.volume>=0&&saved.volume<=100)volume.value=String(saved.volume);
   if(typeof saved.touch==='boolean')touch.checked=saved.touch;
   if(typeof saved.evolution==='boolean')evolution.checked=saved.evolution;
   if(Number.isInteger(saved.fluidColour)&&saved.fluidColour>=0&&saved.fluidColour<5){
    const input=document.querySelector<HTMLInputElement>('[name=fluid-color][value="'+saved.fluidColour+'"]')!;
    input.checked=true;input.dispatchEvent(new Event('change'));
   }
   if(Number.isInteger(saved.viscosity)&&saved.viscosity>=0&&saved.viscosity<=100){
    viscosity.value=String(saved.viscosity);viscosity.dispatchEvent(new Event('input'));
   }
   if (Number.isInteger(saved.colour) && saved.colour >= 0 && saved.colour < colours.length) {
    const input = document.querySelector<HTMLInputElement>('[name=lava-color][value="'+saved.colour+'"]')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
   }
   if (typeof saved.speed === 'number' && Number.isFinite(saved.speed) && saved.speed >= .25 && saved.speed <= 1.75) {
    speed.value = String(saved.speed);
    speed.dispatchEvent(new Event('input'));
   }
   if (Number.isInteger(saved.brightness) && saved.brightness >= 25 && saved.brightness <= 100) {
    brightness.value = String(saved.brightness);
    brightness.dispatchEvent(new Event('input'));
   }
  }
 } catch { /* Ignore malformed preferences. */ }
}


const presetPicker=document.querySelector<HTMLDetailsElement>('#lava-preset-picker')!;
const presetValue=document.querySelector<HTMLElement>('#lava-preset-value')!;
const presetInputs=document.querySelectorAll<HTMLInputElement>('[name=lava-preset]');
let applyingPreset=false;
function syncPresetLabel() {
 if(applyingPreset)return;
 presetInputs.forEach(input=>{input.checked=false;});
 presetValue.textContent=presetValue.dataset.custom!;
}
presetInputs.forEach(input=>input.addEventListener('change',()=>{
 const preset=presets[Number(input.value)];
 if(!preset)return;
 applyingPreset=true;
 try {
  for(const [name,value] of [['lava-color',preset.colour],['fluid-color',preset.fluidColour]] as const){
   const radio=document.querySelector<HTMLInputElement>('[name="'+name+'"][value="'+value+'"]')!;
   radio.checked=true;radio.dispatchEvent(new Event('change'));
  }
  for(const [control,value] of [[speed,preset.speed],[brightness,preset.brightness],[viscosity,preset.viscosity]] as const){
   control.value=String(value);control.dispatchEvent(new Event('input'));
  }
 } finally {applyingPreset=false;}
 presetValue.textContent=input.closest('label')!.querySelector('strong')!.textContent;
 presetPicker.open=false;
 saveLavaSettings();
}));
document.querySelectorAll<HTMLInputElement>('[name=lava-color],[name=fluid-color]').forEach(input=>input.addEventListener('change',syncPresetLabel));
for(const control of [speed,brightness,viscosity])control.addEventListener('input',syncPresetLabel);
document.addEventListener('click',event=>{if(!presetPicker.contains(event.target as Node))presetPicker.open=false;});
presetPicker.addEventListener('keydown',event=>{if(event.key==='Escape'){presetPicker.open=false;presetPicker.querySelector('summary')!.focus();}});
// Derive the initial label from restored values; no extra storage field needed.
const initialPreset=presets.findIndex(p=>p.colour===colour&&p.fluidColour===fluidColour&&p.speed===Number(speed.value)&&p.brightness===Number(brightness.value)&&p.viscosity===Number(viscosity.value));
if(initialPreset<0)syncPresetLabel();
else{
 const input=presetInputs[initialPreset];input.checked=true;
 presetValue.textContent=input.closest('label')!.querySelector('strong')!.textContent;
}


let activePointer:number|null=null;
let grabbedBlob=-1;
let lastPoint={x:0,y:0};
function updateTouchMode(){
 stage.style.touchAction=touch.checked&&running?'none':'auto';
}
function stopStroke(){activePointer=null;grabbedBlob=-1;}
stage.addEventListener('pointerdown',event=>{
 if(!touch.checked||!running||!program||!(event.target instanceof Element)||event.target.closest('button'))return;
 if(activePointer!==null)return;
 const rect=canvas.getBoundingClientRect();
 activePointer=event.pointerId;
 lastPoint={x:(event.clientX-rect.left)/rect.width,y:1-(event.clientY-rect.top)/rect.height};
 grabbedBlob=hitBlob(lastPoint.x,lastPoint.y,elapsed,rect.width/rect.height,Number(viscosity.value)/100,interaction.offsets);
 stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove',event=>{
 if(event.pointerId!==activePointer||!touch.checked||!running)return;
 const rect=canvas.getBoundingClientRect();
 const point={x:(event.clientX-rect.left)/rect.width,y:1-(event.clientY-rect.top)/rect.height};
 if(trailEnabled.checked)trail.stroke(point.x,point.y,point.x-lastPoint.x,point.y-lastPoint.y,rect.width/rect.height,trailColour(point.x,point.y));
 if(sheddingEnabled.checked&&grabbedBlob>=0){
  const dx=point.x-lastPoint.x,dy=point.y-lastPoint.y;
  const edge=sheddingPoint(grabbedBlob,elapsed,rect.width/rect.height,Number(viscosity.value)/100,interaction.offsets,dx,dy);
  if(edge){
   const parent=trailColour(edge.x,edge.y,grabbedBlob);
   shedding.stroke(edge.x,edge.y,dx*.45,dy*.45,rect.width/rect.height,parent);
  }
 }
 interaction.stroke(point.x,point.y,point.x-lastPoint.x,point.y-lastPoint.y,elapsed,rect.width/rect.height,Number(viscosity.value)/100);
 lastPoint=point;
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,stopStroke);
touch.addEventListener('change',()=>{stopStroke();if(!touch.checked){interaction.reset();trail.clear();shedding.clear();}updateTouchMode();draw();saveLavaSettings();});
evolution.addEventListener('change',saveLavaSettings);
toggle.addEventListener('click',()=>{stopStroke();updateTouchMode();});
document.addEventListener('visibilitychange',stopStroke);
motion.addEventListener('change',()=>{stopStroke();updateTouchMode();});
updateTouchMode();

sound.addEventListener('change',()=>{
 if(sound.checked&&running&&!document.hidden)void bubbleAudio.start();
 else bubbleAudio.stop();
 saveLavaSettings();
});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&running&&sound.checked)void bubbleAudio.start();
});
window.addEventListener('pagehide',()=>bubbleAudio.stop());

function updateVolume(){
 bubbleAudio.setVolume(Number(volume.value)/100);
 document.querySelector('#volume-value')!.textContent=volume.value+' %';
}
volume.addEventListener('input',()=>{updateVolume();saveLavaSettings();});
updateVolume();


function trailColour(x:number,y:number,parent?:number){
 if(colour!==4)return ['#ff763f','#b784ff','#50e8cc','#ff80b5','#b784ff','#c9d8ed','#dd956d','#f0ca61','#9b9cde'][colour];
 if(parent!==undefined)return 'rgb('+[0,1,2].map(c=>Math.round(blobColours[parent*3+c]*255)).join(',')+')';
 let closest=0,distance=Infinity;
 for(let i=0;i<14;i++){
  const phase=elapsed*(.11+i*.006)+i*2.399;
  const dx=(.5+Math.sin(phase*.45+i*2.399)*.46+interaction.offsets[i*2]-x)*canvas.clientWidth/canvas.clientHeight;
  const dy=.5+.55*Math.sin(phase)+interaction.offsets[i*2+1]-y;
  if(dx*dx+dy*dy<distance){closest=i;distance=dx*dx+dy*dy;}
 }
 return 'rgb('+[0,1,2].map(c=>Math.round(blobColours[closest*3+c]*255)).join(',')+')';
}
function drawTrail(){
 if(!trailContext)return;
 const ratio=Math.min(devicePixelRatio||1,2);
 const width=Math.round(trailCanvas.clientWidth*ratio),height=Math.round(trailCanvas.clientHeight*ratio);
 if(trailCanvas.width!==width||trailCanvas.height!==height){trailCanvas.width=width;trailCanvas.height=height;}
 const ctx=trailContext;ctx.clearRect(0,0,width,height);
 if(!touch.checked)return;
 const particles=[...(trailEnabled.checked?trail.bubbles:[]),...(sheddingEnabled.checked?shedding.bubbles:[])];
 for(const p of particles){
  const fraction=p.life/p.duration;
  const radius=p.radius*Math.min(width,height)*Math.min(1,fraction*2);
  if(radius<.2)continue;
  const x=p.x*width,y=(1-p.y)*height;
  ctx.globalAlpha=Math.min(1,(1-fraction)*8)*Math.min(1,fraction*2);
  const fill=ctx.createRadialGradient(x-radius*.3,y-radius*.35,radius*.05,x,y,radius);
  fill.addColorStop(0,'#fff5df');fill.addColorStop(.27,p.colour);fill.addColorStop(1,p.colour);
  ctx.fillStyle=fill;ctx.shadowColor=p.colour;ctx.shadowBlur=radius*.8;
  ctx.beginPath();ctx.ellipse(x,y,radius*.86,radius*1.1,Math.sin(p.life)*.2,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;ctx.shadowBlur=0;
}
trailEnabled.addEventListener('change',()=>{if(!trailEnabled.checked)trail.clear();drawTrail();saveLavaSettings();});

sheddingEnabled.addEventListener('change',()=>{if(!sheddingEnabled.checked)shedding.clear();drawTrail();saveLavaSettings();});
