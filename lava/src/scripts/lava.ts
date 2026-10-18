import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
import {createBlobColours, advanceBlobColours} from '../lib/rainbow';
const canvas = document.querySelector<HTMLCanvasElement>('#lava-canvas')!;
const stage = document.querySelector<HTMLElement>('#lava-stage')!;
const toggle = document.querySelector<HTMLButtonElement>('#lava-toggle')!;
const status = document.querySelector<HTMLElement>('#lava-status')!;
const speed = document.querySelector<HTMLInputElement>('#lava-speed')!;
const brightness = document.querySelector<HTMLInputElement>('#lava-brightness')!;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
let running = false, frame = 0, previous = 0, elapsed = 12, colour = 0;
const colours = [[1,.28,.055],[.63,.22,1],[.05,.85,.64],[1,.22,.49],[.63,.22,1],[.64,.72,.84],[.78,.34,.17],[.95,.66,.17],[.16,.19,.28]];
const glows = ['#ff703e','#b784ff','#50e8cc','#ff80b5','#ae7eff','#bdcce0','#dc916a','#edc46b','#9582ce'];
const blobColours=createBlobColours();
let program: WebGLProgram | null = null;
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
 precision mediump float;
 varying vec2 uv; uniform vec3 params; uniform vec3 colour; uniform vec3 blobColours[14];
 #define time params.x
 #define aspect params.y
 #define material params.z
 float contribution(vec2 p, float n){
   float phase=time*(.11+n*.006)+n*2.399;
   vec2 c=vec2(.5+sin(phase*.45+n*2.399)*.46,.5+.55*sin(phase));
   float r=.055+.035*(.5+.5*sin(n*7.));
   // Stretch fastest in transit, then gather at the turning points.
   // Reciprocal axes preserve approximate area instead of inflating the wax.
   float travel=abs(cos(phase));
   float shapeCycle=.5+.5*sin(time*.075+n*1.73);
   float stretch=.85+1.65*pow(shapeCycle,1.4)*(.6+.4*travel);
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
   float squareness=smoothstep(.18,.88,.5+.5*sin(time*.055+n*2.17));
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
  float mask=smoothstep(.82,.99,f);
  vec2 stepSize=.004*min(aspect,1.)/vec2(aspect,1.);
  vec2 grad=vec2(
   surfaceHeight(p+vec2(stepSize.x,0.))-surfaceHeight(p-vec2(stepSize.x,0.)),
   surfaceHeight(p+vec2(0.,stepSize.y))-surfaceHeight(p-vec2(0.,stepSize.y)));
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
    mixed+=blobColours[i]*weight;total+=weight;
   }
   waxColour=mixed/max(total,.0001);
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
     +.13*sin(p.x*4.+p.y*3.+time*.055);
    vec3 iridescence=.5+.5*cos(6.28318*(film+vec3(0.,.33,.67)));
    liquid=mix(vec3(.045,.055,.09),iridescence,.38+.38*fresnel)
     +iridescence*band*.32+vec3(.75,.87,1.)*softbox*.3;
   }
  }
  vec3 bg=vec3(.055,.025,.095)+colour*.055;
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
 if(!gl||!program)return;
 const ratio=Math.min(devicePixelRatio||1,1.5);
 const width=Math.round(canvas.clientWidth*ratio),height=Math.round(canvas.clientHeight*ratio);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 gl.viewport(0,0,width,height);gl.uniform3f(gl.getUniformLocation(program,'params'),elapsed,width/height,colour);
 gl.uniform3fv(gl.getUniformLocation(program,'blobColours[0]'),blobColours);
 gl.uniform3fv(gl.getUniformLocation(program,'colour'),colours[colour]);gl.drawArrays(gl.TRIANGLES,0,6);
}
function animate(now:number){
 if(!running||document.hidden)return;
 if(previous){
  const dt=Math.min((now-previous)/1000,.05)*Number(speed.value);
  elapsed+=dt;
  if(colour===4)advanceBlobColours(blobColours,elapsed,dt,canvas.clientWidth/canvas.clientHeight);
 }
 previous=now;draw();frame=requestAnimationFrame(animate);
}
function sync(){
 cancelAnimationFrame(frame);previous=0;
 const label=running?toggle.dataset.pause!:toggle.dataset.start!;
 toggle.setAttribute('aria-label',label);toggle.title=label;
 toggle.setAttribute('aria-pressed',String(running));
 if(running&&!document.hidden)frame=requestAnimationFrame(animate);
}
toggle.addEventListener('click',()=>{running=!running;status.textContent='';sync();});
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


// Save only with explicit consent; never persist playback or a running session.
function saveLavaSettings() {
 if (!storageAllowed()) return;
 try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
   colour, speed: Number(speed.value), brightness: Number(brightness.value)
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
