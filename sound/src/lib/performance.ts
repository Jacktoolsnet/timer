import type {StyleId} from './presets';
import type {DanceId} from './dances';
import type {SustainedInstrument} from './phrasing';
export type VoiceArticulation={attack?:number;release?:number;glide?:number;vibrato?:number;detached?:boolean};
/** Performance choices, not restrictions on the user's manual instrument selection. */
export function performanceProfile(style:StyleId,id:SustainedInstrument,dance: DanceId|null=null){
 const rhythmic=dance?['quickstep','jive','samba','chacha','pasodoble','discofox','tango'].includes(dance):['electronic','house','sport','drumandbass','funk','reggae','hiphop','tango'].includes(style);
 const detached=rhythmic&&['saxophone','strings','organ'].includes(id);
 const voice:VoiceArticulation=detached
  ?{detached:true,attack:id==='organ'?.008:id==='strings'?.018:.012,release:id==='strings'?.035:.025,glide:.004,vibrato:id==='organ'?0:.0003}
  :rhythmic&&id==='voice'?{attack:.045,release:.16,glide:.035}
  :rhythmic&&['pad','vocalpad','choir'].includes(id)?{attack:id==='pad'?.16:.12,release:.35}:{};
 // Voices and atmospheric layers remain phrased, rather than returning to repeated "la la" attacks.
 return {legato:!detached,ratio:id==='organ'?.55:.62,maxBeats:id==='organ'?.5:.65,voice};
}
/** Use actual swung / cross-grid spacing, including reverse and phase-shifted patterns. */
export function performanceGate(style:StyleId,id:SustainedInstrument,bridge:number,quarter:number,dance: DanceId|null=null){
 const profile=performanceProfile(style,id,dance);
 if(profile.legato)return {...profile,hold:bridge};
 const spacing=Math.max(.012,bridge-.035),hold=Math.max(.008,Math.min(spacing*profile.ratio,quarter*profile.maxBeats));
 return {...profile,hold,voice:{...profile.voice,attack:Math.min(profile.voice.attack!,hold*.5),release:Math.min(profile.voice.release!,spacing*.2)}};
}
