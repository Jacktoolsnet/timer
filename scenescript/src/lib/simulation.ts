export const simulationTypes=['particles','snow','bubbles'] as const;
export type Simulation={type:typeof simulationTypes[number];color:string;count:number;speed:number;size:number;opacity:number;seed:number};
export function defaultSimulation(type:Simulation['type']='particles'):Simulation{return {type,color:'#ffffff',count:60,speed:1,size:type==='bubbles'?18:type==='snow'?6:5,opacity:.75,seed:1};}
export function switchSimulationType(current:Simulation|null,type:Simulation['type']):Simulation{
 const preset=defaultSimulation(type);if(!current)return preset;
 return {...current,type,size:current.size===defaultSimulation(current.type).size?preset.size:current.size};
}
export function parseSimulation(value:unknown,path:string):Simulation|null{
 if(value===undefined||value===null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const s=value as Record<string,unknown>;
 const d=defaultSimulation(simulationTypes.includes(s.type as Simulation['type'])?s.type as Simulation['type']:'particles');
 for(const key of Object.keys(s))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 if(!simulationTypes.includes(s.type as Simulation['type']))throw new Error(path+'.type: particles, snow, bubbles');
 if(typeof (s.color??d.color)!=='string'||!/^#[0-9a-f]{6}$/i.test(String(s.color??d.color)))throw new Error(path+'.color: expected #RRGGBB');
 const number=(key:keyof Simulation,min:number,max:number,integer=false)=>{const value=s[key]??d[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error(path+'.'+key+': expected '+(integer?'integer ':'number ')+min+'–'+max);return value;};
 return {type:s.type as Simulation['type'],color:String(s.color??d.color),count:number('count',1,200,true),speed:number('speed',.1,5),size:number('size',1,100),opacity:number('opacity',0,1),seed:number('seed',0,4294967295,true)};
}
function random(seed:number){let state=seed>>>0;return ()=>{state=(state+0x6D2B79F5)>>>0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
export type Particle={x:number;y:number;radius:number;alpha:number};
/** Absolute-time trajectories: no per-frame integration, resets, or wall-clock random. */
export function simulationParticles(s:Simulation,width:number,height:number,time:number):Particle[]{
 const rng=random(s.seed),t=Math.max(0,time)*s.speed;
 return Array.from({length:s.count},()=>{
  const startX=rng(),startY=rng(),rate=.7+rng()*.6,phase=rng()*Math.PI*2,radius=s.size*(.45+rng()*.55);
  const direction=s.type==='snow'?1:-1;
  const cycle=((startY+direction*t*rate*(s.type==='particles'?.025:.06))%1+1)%1;
  const fade=Math.min(1,cycle/.08,(1-cycle)/.08);
  const drift=s.type==='particles'?.04:s.type==='snow'?.025:.015;
  return {x:(startX+Math.sin(t*rate*.6+phase)*drift)*width,y:cycle*height,radius,alpha:s.opacity*fade*(s.type==='particles'?.45+.55*(.5+.5*Math.sin(t*.7+phase)):1)};
 });
}
