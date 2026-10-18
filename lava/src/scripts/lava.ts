const canvas = document.querySelector<HTMLCanvasElement>('#lava-canvas')!;
const stage = document.querySelector<HTMLElement>('#lava-stage')!;
const toggle = document.querySelector<HTMLButtonElement>('#lava-toggle')!;
const status = document.querySelector<HTMLElement>('#lava-status')!;
const speed = document.querySelector<HTMLInputElement>('#lava-speed')!;
const brightness = document.querySelector<HTMLInputElement>('#lava-brightness')!;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
let running = false, frame = 0, previous = 0, elapsed = 12, colour = 0;
const colours = [[1,.28,.055],[.63,.22,1],[.05,.85,.64],[1,.22,.49]];
const glows = ['#ff703e','#b784ff','#50e8cc','#ff80b5'];
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
 varying vec2 uv; uniform float time; uniform float aspect; uniform vec3 colour;
 float field(vec2 p){
  float f=0.;
  for(int i=0;i<14;i++){
   float n=float(i);
   float phase=time*(.11+n*.006)+n*2.399;
   vec2 c=vec2(.5+sin(phase*.45+n*2.399)*.46,.5+.55*sin(phase));
   float r=.055+.035*(.5+.5*sin(n*7.));
   // Stretch fastest in transit, then gather at the turning points.
   // Reciprocal axes preserve approximate area instead of inflating the wax.
   float travel=abs(cos(phase));
   float stretch=1.+1.15*pow(travel,1.4)*(.7+.3*sin(n*3.1+time*.08));
   vec2 d=(p-c)*vec2(aspect,1.);
   float tilt=.18*sin(phase*.8+n);
   d=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*d;
   // A gently bent centreline and a tapered trailing end avoid rigid ellipses.
   d.x+=.014*sin(d.y*12.+phase+n)*smoothstep(0.,.12,abs(d.y));
   float taper=clamp(1.+.17*sin(phase+1.5708)*d.y/r,.72,1.28);
   d*=vec2(sqrt(stretch)*taper,1./sqrt(stretch));
   f+=r*r/(dot(d,d)+.001);
  }
  f+=.0025/(p.y*p.y+.002);
  return f;
 }
 void main(){
  vec2 p=uv;
  float f=field(p);
  float mask=smoothstep(.82,.99,f);
  vec2 grad=vec2(field(p+vec2(.003,0.))-field(p-vec2(.003,0.)),field(p+vec2(0.,.003))-field(p-vec2(0.,.003)));
  vec3 normal=normalize(vec3(-grad*.9,.45));
  // A concealed bulb below the glass lights the wax and the carrier liquid.
  vec3 toBulb=normalize(vec3((.5-p.x)*.15,-.12-p.y,.32));
  float light=max(0.,dot(normal,toBulb));
  float uplight=exp(-p.y*2.1);
  float coneWidth=.8+p.y*.36;
  float beam=exp(-pow((p.x-.5)/coneWidth,2.))*exp(-p.y*1.65);
  vec3 lampLight=mix(colour,vec3(1.,.82,.48),.26);
  float rim=pow(1.-normal.z,2.);
  vec3 liquid=colour*(.75+.48*light)+lampLight*(.22+.48*uplight)+vec3(1.,.88,.65)*pow(light,10.)*.28;
  liquid+=colour*rim*.5;
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
 gl.viewport(0,0,width,height);gl.uniform1f(gl.getUniformLocation(program,'aspect'),width/height);gl.uniform1f(gl.getUniformLocation(program,'time'),elapsed);
 gl.uniform3fv(gl.getUniformLocation(program,'colour'),colours[colour]);gl.drawArrays(gl.TRIANGLES,0,6);
}
function animate(now:number){
 if(!running||document.hidden)return;
 if(previous)elapsed+=Math.min((now-previous)/1000,.05)*Number(speed.value);
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
 colour=Number(input.value);
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
