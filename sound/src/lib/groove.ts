import {rhythmAccent} from './dance-rhythm';
import {dances,type DanceId} from './dances';
import {presets,type StyleId} from './presets';
export const grooveChoices=['auto','discofox','waltz','chacha'] as const;
export type GrooveChoice=typeof grooveChoices[number];
export type Groove={choice:GrooveChoice;style:StyleId;beats:2|3|4;steps:8|12|16;dance?:DanceId;swing:number;grid:number[]};
export function resolveGroove(style:StyleId,choice:GrooveChoice,dance?:DanceId|null):Groove{
 if(style==='tango')dance='tango';
 if(dance){const d=dances[dance];return {choice:'auto',style,dance,beats:d.beats,steps:d.beats*4 as 8|12|16,swing:d.preset.swing||0,grid:d.preset.grid};}
 const steps=choice==='waltz'||choice==='auto'&&presets[style].beats===3?12:16;
 return {choice,style,beats:steps===12?3:4,steps,swing:choice==='auto'?(presets[style].swing||0):0,
  grid:choice==='auto'?presets[style].grid.filter(n=>n<steps):Array.from({length:steps},(_,i)=>i)};
}
export function grooveRole(id:string){
 if(id==='kick')return 'kick';
 if(['snare','clap','rim','tom','conga'].includes(id))return 'backbeat';
 if(['hat','shaker'].includes(id))return 'hat';
 if(['bass','synthbass','doublebass','acidbass'].includes(id))return 'bass';
 if(['piano','epiano','guitar','organ'].includes(id))return 'chords';
 if(['strings','pad','choir','vocalpad','shimmer','cello'].includes(id))return 'sustain';
 return 'melody';
}
export function grooveAnchored(id:string){return !['melody','sustain'].includes(grooveRole(id));}
export function groovePattern(groove:Groove,id:string):number[]{
 const role=grooveRole(id);
 if(groove.choice==='auto'){
  const preset=groove.dance?dances[groove.dance].preset:presets[groove.style];
  const exact=preset.parts.find(p=>p.instrument===id);
  const related=preset.parts.find(p=>grooveRole(p.instrument)===role);
  return [...(exact||related||{steps:[0,8]}).steps];
 }
 const patterns:Record<string,number[]>=groove.choice==='waltz'
  ?{kick:[0],backbeat:[4,8],hat:[0,4,8],bass:[0],chords:[4,8],sustain:[0],melody:[0,6,8]}
  :groove.choice==='chacha'
  ?{kick:[0,8],backbeat:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,6,8,14],chords:[0,4,8,12,14],sustain:[0,8],melody:[4,8,12,14]}
  :{kick:[0,4,8,12],backbeat:[4,12],hat:[2,6,10,14],bass:[0,8],chords:[2,6,10,14],sustain:[0,8],melody:[0,6,10]};
 return patterns[role];
}
export function grooveAnchors(groove:Groove,id:string){return grooveAnchored(id)?groovePattern(groove,id):[];}
export function grooveAccent(groove:Groove,id:string,beat:number,index?:number){
 if(groove.dance)return rhythmAccent(groove.dance,index,id,beat,dances[groove.dance].accents[Math.floor(beat)%dances[groove.dance].accents.length]);
 const role=grooveRole(id),quarter=Math.floor(beat/4),sub=beat%4;
 if(groove.beats===3&&groove.style==='slowwaltz'&&role==='chords')return quarter===0?.65:quarter===1?1:.86;
 if(groove.beats===3)return role==='chords'?(quarter===0?.65:.94):quarter===0?1:sub===0?.72:.55;
 if(groove.choice==='chacha')return [0,12,14].includes(beat)?1:sub===0?.85:.64;
 if(groove.choice==='discofox')return role==='hat'?(sub===2?1:.55):sub===0?1:.65;
 const style=groove.style;
 if(['house','sport'].includes(style)&&role==='kick')return sub===0?1:.58;
 if(style==='reggae')return role==='chords'?(sub===2?1:.48):role==='kick'?(beat===8?1:.62):sub===0?.88:.7;
 if(style==='funk'||style==='latin')return sub===0?.82:[2,3].includes(sub)?1:.64;
 if(['jazz','coffeehouse','lofi','hiphop'].includes(style))return beat===0?1:sub===0?.84:sub===2?.73:.48;
 if(style==='drumandbass')return role==='backbeat'&&[4,12].includes(beat)?1:sub===0?.88:.63;
 return beat===0?1:sub===0?.86:.64;
}
export function grooveMutationGrid(groove:Groove,id:string){
 const role=grooveRole(id);
 // A quiet, dependable pulse under the piano: no random drum fills or extra bass attacks.
 if(groove.style==='focus'&&groove.choice==='auto'&&!groove.dance&&['kick','hat','backbeat','bass'].includes(role))return groovePattern(groove,id);
 if(groove.dance&&grooveAnchored(id))return groovePattern(groove,id);
 if(role==='kick'&&(groove.choice!=='auto'||['house','sport','reggae'].includes(groove.style)))return groovePattern(groove,id);
 if(groove.beats===3&&role==='bass')return groovePattern(groove,id);
 if(groove.beats===3&&role==='chords')return [4,8];
 if(groove.beats===3&&role==='backbeat')return [4,7,8,11];
 if(groove.choice==='discofox'&&role==='backbeat')return [3,4,11,12];
 return groove.grid;
}
export function randomGroovePattern(groove:Groove,id:string,density:number,random=Math.random){
 const anchors=grooveAnchors(groove,id),grid=grooveMutationGrid(groove,id);
 return Array.from({length:16},(_,s)=>s<groove.steps&&(anchors.includes(s)||grid.includes(s)&&random()<density*.7));
}
export const grooveCopy={
 de:{title:'Takt & Groove',auto:'Stiltypisch',discofox:'Discofox',waltz:'Walzer',chacha:'Cha-Cha-Cha',pending:'Groove-Wechsel zum nächsten Takt'},
 en:{title:'Meter & groove',auto:'Style default',discofox:'Discofox',waltz:'Waltz',chacha:'Cha-cha-cha',pending:'Groove changes at the next bar'},
 es:{title:'Compás y groove',auto:'Según el estilo',discofox:'Discofox',waltz:'Vals',chacha:'Cha-cha-chá',pending:'El groove cambia en el próximo compás'},
 fr:{title:'Mesure et groove',auto:'Selon le style',discofox:'Discofox',waltz:'Valse',chacha:'Cha-cha-cha',pending:'Le groove change à la prochaine mesure'}
};
