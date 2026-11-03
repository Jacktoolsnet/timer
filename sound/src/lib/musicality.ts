import type {StyleId} from './presets';
import type {NoteGroup} from './note-groups';
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function calmStyle(style:StyleId){return ['ambient','focus','classical','slowwaltz','coffeehouse','lofi'].includes(style);}
/** Genre phrasing complements groove.ts; it never moves a kick or a recorded tap. */
type PhraseProfile={bars:number;colour:number;breath:number;thin:number;run:number;chord:number;gate:number;ornament:'classical'|'jazz'|'soft'|'none'};
export const phraseProfiles:Record<StyleId,PhraseProfile>={
 electronic:{bars:8,colour:.28,breath:.12,thin:.04,run:3,chord:.55,gate:.58,ornament:'none'},
 house:{bars:8,colour:.3,breath:.1,thin:.03,run:2,chord:.8,gate:.34,ornament:'none'},
 pop:{bars:8,colour:.25,breath:.24,thin:.08,run:3,chord:.7,gate:.85,ornament:'soft'},
 rock:{bars:8,colour:.3,breath:.16,thin:.04,run:2,chord:.7,gate:.58,ornament:'none'},
 classical:{bars:16,colour:.22,breath:.38,thin:.12,run:4,chord:.7,gate:1.1,ornament:'classical'},
 slowwaltz:{bars:16,colour:.18,breath:.3,thin:.06,run:3,chord:.8,gate:1.1,ornament:'soft'},
 tango:{bars:8,colour:.28,breath:.16,thin:.03,run:2,chord:.85,gate:.38,ornament:'none'},
 jazz:{bars:8,colour:.25,breath:.34,thin:.14,run:3,chord:.8,gate:.66,ornament:'jazz'},
 coffeehouse:{bars:16,colour:.16,breath:.38,thin:.13,run:3,chord:.8,gate:.95,ornament:'soft'},
 hiphop:{bars:8,colour:.22,breath:.18,thin:.06,run:2,chord:.85,gate:.72,ornament:'none'},
 lofi:{bars:16,colour:.14,breath:.3,thin:.12,run:2,chord:.85,gate:1.05,ornament:'soft'},
 funk:{bars:4,colour:.25,breath:.12,thin:.03,run:2,chord:.85,gate:.25,ornament:'none'},
 reggae:{bars:8,colour:.18,breath:.16,thin:.02,run:2,chord:.95,gate:.23,ornament:'none'},
 drumandbass:{bars:8,colour:.32,breath:.1,thin:.03,run:4,chord:.5,gate:.48,ornament:'none'},
 latin:{bars:8,colour:.22,breath:.24,thin:.06,run:3,chord:.6,gate:.52,ornament:'none'},
 ambient:{bars:32,colour:.12,breath:.5,thin:.2,run:2,chord:.95,gate:1.4,ornament:'none'},
 focus:{bars:16,colour:.1,breath:.24,thin:.06,run:2,chord:.9,gate:1.2,ornament:'none'},
 sport:{bars:8,colour:.3,breath:.1,thin:.02,run:2,chord:.7,gate:.4,ornament:'none'}
};
/** Smooth tension, not a master fade: calm styles develop more patiently. */
export function phraseContour(style:StyleId,bar:number){
 const profile=phraseProfiles[style],phase=((bar%profile.bars)+profile.bars)%profile.bars/profile.bars;
 const energy=(1-Math.cos(phase*Math.PI*2))/2;
 return {energy,cutoff:Math.pow(2,(energy-.5)*profile.colour),
  velocity:.97+.06*energy,register:energy>.86?1:0,space:profile.breath};
}
/** Limit embellishment length rather than turning every style into rapid arpeggios. */
export function genreGroupCount(style:StyleId,kind:'run'|'chord',available:number){
 return kind==='chord'?3:Math.max(2,Math.min(available,phraseProfiles[style].run));
}
/** Weight existing anchors only: offbeat chops never rewrite the underlying pulse. */
export function groupAnchorWeight(style:StyleId,beat:number,slots:number,beats:number){
 const position=beat/slots*beats,fraction=position-Math.floor(position);
 const offbeat=Math.abs(fraction-.5)<.08;
 if(['house','funk','reggae'].includes(style))return offbeat?4:1;
 if(['jazz','latin','hiphop'].includes(style))return fraction>.2?2:1;
 return 1;
}
/** Recognisable echo of the current question, preserving the responder's register/contour. */
export function responsePhrase(own:readonly number[],question:readonly number[],bar:number):number[]{
 const shift=Math.floor(bar/4)%2===0?0:2;
 return own.map((value,index)=>{
  const source=question[(index+shift)%Math.max(1,question.length)]??value;
  const previous=question[(index+shift+question.length-1)%Math.max(1,question.length)]??source;
  const contour=Math.sign(source-previous);
  const target=index%2===0?source:clamp(value+contour,0,4);
  return clamp(value+Math.sign(target-value),0,4);
 });
}
/** A short breath at the end of the question/answer, never a whole-mix dropout. */
export function phraseBreath(style:StyleId,bar:number,role:number){
 if(role<0||role>1)return false;
 const phase=((bar%4)+4)%4,width=phraseContour(style,bar).space;
 return role===0?phase>=2-width&&phase<2:phase>=4-width;
}
export function conversationLevel(bar:number,role:number){
 if(role<0||role>1)return 1;
 const x=((bar%4)+4)%4,answer=(1-Math.cos(Math.PI*x/2))/2;
 return .7+.3*(role===0?1-answer:answer);
}
/** Thin only occasional weak backing attacks at the relaxed end of the arch. */
export function phraseNoteAllowed(style:StyleId,bar:number,track:number,beat:number,role:number){
 if(beat%4===0||role===0)return true;
 const energy=phraseContour(style,bar).energy;
 const choice=(Math.sin(Math.floor(bar)*1.73+track*7.17+beat*2.39)+1)/2;
 return choice>=(1-energy)*phraseProfiles[style].thin;
}
/** Search close inversions/octaves while retaining chord pitch classes and voice identity. */
export function leadChord(raw:readonly number[],previous?:readonly number[]):number[]{
 const original=[...raw].sort((a,b)=>a-b);
 if(!previous||previous.length!==raw.length)return original;
 let best=original,bestCost=Infinity;
 for(let rotation=0;rotation<raw.length;rotation++){
  const inversion=original.slice(rotation).concat(original.slice(0,rotation).map(n=>n+12));
  const search=(index:number,result:number[])=>{
   if(index===inversion.length){
    if(result.at(-1)!-result[0]>24)return;
    const cost=result.reduce((sum,n,i)=>sum+Math.abs(n-previous[i])-(n===previous[i]?1.5:0),0)
     +Math.abs(result.reduce((a,b)=>a+b,0)/result.length-previous.reduce((a,b)=>a+b,0)/previous.length)*.08;
    if(cost<bestCost){bestCost=cost;best=result;}return;
   }
   for(const octave of [-2,-1,0,1,2]){
    const note=inversion[index]+octave*12;
    if(note< -12||note>48||result.length&&note<=result.at(-1)!)continue;
    search(index+1,[...result,note]);
   }
  };
  search(0,[]);
 }
 return best;
}
/** Concrete, saved ornaments: quiet grace attacks or a connected finger trill. */
export function instrumentGroup(group:NoteGroup,instrument:string,style:StyleId,energy:number,beats=4):NoteGroup{
 const profile=phraseProfiles[style];
 if(group.kind==='chord'){
  const bed=['pad','shimmer'].includes(instrument)||calmStyle(style)&&['strings','choir','organ'].includes(instrument);
  return {...group,notes:group.notes.map(n=>({...n,gate:bed?beats+.04:profile.gate,velocity:n.velocity*(bed?.78:1)}))};
 }
 const ornament=profile.ornament;
 if((ornament==='classical'||ornament==='jazz')&&['flute','clarinet'].includes(instrument)&&energy>.2)return {kind:'run',ornament:'trill',notes:[0,1,0,1].map((tone,i)=>({offset:i*.22,tone,velocity:i%2?.62:.82,gate:.255}))};
 if(ornament!=='none'&&(ornament!=='soft'||energy>.55)&&['piano','epiano','guitar','harp','kalimba','vibraphone'].includes(instrument))return {kind:'run',ornament:'grace',notes:[{offset:0,tone:0,velocity:.42,gate:.13},{offset:.16,tone:1,velocity:.88,gate:.72}]};
 // Keep neutral wind runs untouched; short keyboard/pluck notes make skanks and stabs audible.
 if(['funk','reggae','house','tango','sport','rock','hiphop','latin','lofi'].includes(style)&&['piano','epiano','guitar','organ','pluck','vibraphone','kalimba'].includes(instrument)){
  const repeats=['funk','reggae','hiphop','rock'].includes(style);
  return {...group,notes:group.notes.map((n,i)=>({...n,tone:repeats?(i%2):n.tone,
   gate:Math.max(.05,Math.min(n.gate,profile.gate/group.notes.length)),velocity:n.velocity*(i===0?1:.86)}))};
 }
 return group;
}

/** A subtle initial lip/breath scoop, never chromatic detuning of the whole track. */
export function windScoop(style:StyleId,instrument:string,bar:number,beat:number){
 if(!['jazz','coffeehouse','latin','pop','rock'].includes(style)||!['saxophone','trumpet'].includes(instrument)||beat!==0)return 0;
 const amount=style==='jazz'?.65:style==='coffeehouse'?.4:style==='latin'?.35:.2;
 return Math.floor(bar)%4===0?-amount*.8:Math.floor(bar)%4===2?-amount:0;
}

export function firstPhraseAttack(points:readonly boolean[],beat:number,slots:number,direction:number,phase:number){
 const clock=((beat-phase)*direction+slots*2)%slots;
 for(let k=0;k<clock;k++)if(points[((direction*k+phase)%slots+slots)%slots])return false;
 return true;
}

/** Neighbouring scale tones for ornaments, rather than wide chord-step trills. */
export function ornamentPitch(base:number,root:number,third:number,steps:number){
 const scale=third===4?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];let pitch=base;
 for(let i=0;i<Math.abs(steps);i++)for(let distance=1;distance<=3;distance++){
  const candidate=pitch+Math.sign(steps)*distance;
  if(scale.includes(((candidate-root)%12+12)%12)){pitch=candidate;break;}
 }
 return pitch;
}
