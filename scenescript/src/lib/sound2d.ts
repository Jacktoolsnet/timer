import {defaultMusic,parseMusic,presetInstrument,instrumentTail,type Instrument,type Note,type Music} from './music.ts';
import {actorFrame2D} from './motion2d.ts';
import type {Action2D} from './stage2d.ts';
import type {Project} from './model.ts';
export type Sound2D={id:string;name:string;action:Action2D['type'];clip:string;trigger:'start'|'repeat'|'steps';phase:number;interval:number;stride:number;instrument:Instrument;notes:Omit<Note,'instrument'>[]};
export type SoundInstance2D={muted:boolean;volume:number;pitch:number};
export function defaultSound2D(id='sound'):Sound2D{return {id,name:'Klang',action:'wave',clip:'',trigger:'start',phase:0,interval:.43,stride:35,instrument:presetInstrument('bell'),notes:[{at:0,duration:.15,pitch:79,velocity:.7}]};}
export function parseSounds2D(value:unknown,path:string):Sound2D[]{
 if(!Array.isArray(value)||value.length>8)throw Error(path+': maximum 8 sound bindings');
 const ids=new Set<string>();
 return value.map((value,index)=>{
  const p=path+'['+index+']',d=defaultSound2D();if(!value||typeof value!=='object'||Array.isArray(value))throw Error(p+': expected object');
  const raw=value as Record<string,unknown>;for(const key of Object.keys(raw))if(!Object.hasOwn(d,key))throw Error(p+'.'+key+': unknown field');
  const s={...d,...raw};
  if(typeof s.id!=='string'||!(/^[A-Za-z0-9_-]{1,100}$/).test(s.id)||ids.has(s.id))throw Error(p+': invalid or duplicate sound ID');ids.add(s.id);
  if(typeof s.name!=='string'||s.name.length>200||typeof s.clip!=='string'||s.clip.length>100)throw Error(p+': invalid name/clip');
  if(!['move','walk','wave','jump','float','attach','fade','play'].includes(s.action)||!['start','repeat','steps'].includes(s.trigger)||s.trigger==='steps'&&s.action!=='walk')throw Error(p+': invalid sound trigger/action');
  for(const [key,min,max]of [['phase',0,1],['interval',.08,16],['stride',5,1000]] as const)if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(p+'.'+key+': invalid number');
  if(!Array.isArray(s.notes)||!s.notes.length||s.notes.length>8||s.notes.some(n=>!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).some(k=>!['at','duration','pitch','velocity'].includes(k))))throw Error(p+'.notes: expected 1–8 notes');
  const instrument=s.instrument;
  const music=parseMusic({...defaultMusic(),mode:'score',instruments:[instrument],notes:s.notes.map(n=>({...n,instrument:instrument?.id}))},4,p)!;
  return {...s,instrument:music.instruments[0],notes:music.notes.map(({instrument,...note})=>note)};
 });
}
export function parseSoundInstance2D(value:unknown,path:string):SoundInstance2D{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['muted','volume','pitch'].includes(k)))throw Error(path+': invalid sound settings');
 const s={muted:false,volume:1,pitch:0,...value};
 if(typeof s.muted!=='boolean'||typeof s.volume!=='number'||!Number.isFinite(s.volume)||s.volume<0||s.volume>1||!Number.isInteger(s.pitch)||s.pitch< -24||s.pitch>24)throw Error(path+': invalid sound settings');return s;
}
/** Compile reusable action bindings into one deterministic, non-persisted audio score.
 * No wall-clock callbacks: seeking, pausing, retiming and export use the same events. */
export function objectSoundScore2D(project:Pick<Project,'objects2d'|'scenes'>):Music|null{
 const instruments:Instrument[]=[],notes:Note[]=[],byId=new Map<string,Instrument>();let origin=0;
 for(const scene of project.scenes){
  for(const actor of scene.stage2d?.actors??[]){
   if(actor.sound?.muted||actor.sound?.volume===0)continue;
   for(const sound of project.objects2d[actor.object]?.sounds??[]){
    if(sound.instrument.volume===0||sound.notes.every(note=>note.velocity===0))continue;
    const key=JSON.stringify([actor.object,sound.id]);let instrument=byId.get(key);
    const emit=(at:number)=>{
     const opacity=actorFrame2D(actor,at).opacity;if(opacity<=0)return;
     for(const note of sound.notes){
      if(at+note.at>=scene.duration||note.velocity===0)continue;
      if(notes.length>=10000)throw Error('2D sounds: maximum 10000 emitted notes per project');
      if(!instrument){instrument={...sound.instrument,id:key,name:sound.name};byId.set(key,instrument);instruments.push(instrument);}
      notes.push({...note,instrument:key,at:origin+at+note.at,pitch:Math.min(108,Math.max(21,note.pitch+(actor.sound?.pitch??0))),velocity:note.velocity*(actor.sound?.volume??1)*opacity});
     }
    };
    for(const action of actor.actions){
     if(action.type!==sound.action||sound.clip&&sound.clip!==action.clip)continue;
     const at=action.at+sound.phase*action.duration,end=action.at+action.duration;
     if(sound.trigger==='start')emit(at);
     else if(sound.trigger==='repeat'){for(let t=at;t<end-1e-7;t+=sound.interval)emit(t);}
     else{
      const frame=actorFrame2D(actor,action.at),distance=Math.hypot(action.toX-frame.x,action.toY-frame.groundY);
      for(let step=1;step*sound.stride<=distance;step++){
       const target=step*sound.stride/distance;let lo=0,hi=1;
       for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(mid*mid*(3-2*mid)<target)lo=mid;else hi=mid;}
       const t=action.at+action.duration*(lo+hi)/2;if(t>=at)emit(t);
      }
     }
    }
   }
  }
  origin+=scene.duration;
 }
 if(!notes.length)return null;
 const points:[number,number][]=[];for(const note of notes){const i=byId.get(note.instrument)!;points.push([note.at,1],[note.at+note.duration+instrumentTail(i),-1]);}
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let voices=0;for(const [,delta]of points){voices+=delta;if(voices>64)throw Error('2D sounds: maximum 64 overlapping voices');}
 return {...defaultMusic(),mode:'score',instruments,notes:notes.sort((a,b)=>a.at-b.at),seed:2407,volume:.7,fadeIn:0,fadeOut:1.25};
}
