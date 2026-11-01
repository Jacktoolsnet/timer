import type {InstrumentId} from './instruments';
export type ToneRecipe={ratio?:number;hz?:number;duration:number;level:number;type?:OscillatorType;endHz?:number;attack?:number;glide?:number;sustain?:number};
export type NoiseRecipe={duration:number;level:number;frequency:number;type?:BiquadFilterType;offset?:number;attack?:number};
export type VoiceRecipe={tones:ToneRecipe[];noise:NoiseRecipe[]};
export function voiceRecipe(id:InstrumentId,warm:boolean,decay:number):VoiceRecipe{
 const tone=(hz:number,duration:number,level:number,extra:Partial<ToneRecipe>={}):ToneRecipe=>({hz,duration,level,...extra});
 const partial=(ratio:number,duration:number,level:number,extra:Partial<ToneRecipe>={}):ToneRecipe=>({ratio,duration,level,...extra});
 switch(id){
  case 'kick':return {tones:[tone(145,.32,.29,{endHz:44,glide:.045,attack:.002}),tone(65,.14,.035,{attack:.003})],noise:[]};
  case 'snare':return {tones:[tone(185,.12,.085,{endHz:155,glide:.07,attack:.002}),tone(330,.065,.035,{attack:.001})],noise:[{duration:.17,level:.24,frequency:1900,type:'highpass',attack:.001}]};
  case 'hat':return {tones:[tone(6450,.025,.018,{type:'square',attack:.001}),tone(8910,.02,.01,{type:'square',attack:.001})],noise:[{duration:.065,level:.095,frequency:6500,attack:.001}]};
  case 'clap':return {tones:[],noise:[0,.012,.026].map((offset,i)=>({duration:i===2?.16:.02,level:i===2?.14:.11,frequency:1400,type:'bandpass' as const,offset,attack:.001}))};
  case 'tom':return {tones:[tone(175,.4,.24,{endHz:113,glide:.055,attack:.002}),tone(267,.18,.055,{attack:.003})],noise:[{duration:.018,level:.025,frequency:1600,type:'bandpass',attack:.001}]};
  case 'rim':return {tones:[tone(760,.038,.13,{attack:.001}),tone(1680,.022,.07,{attack:.001}),tone(2390,.013,.025,{attack:.001})],noise:[]};
  case 'shaker':return {tones:[],noise:[{duration:.095,level:.14,frequency:4800,type:'bandpass',attack:.012},{duration:.035,level:.035,frequency:7200,offset:.018,attack:.008}]};
  case 'synthbass':return {tones:[partial(.25,.36,.14,{type:'sawtooth',attack:.006}),partial(.125,.42,.12,{attack:.008}),partial(.2504,.22,.025,{type:'triangle',attack:.009})],noise:[]};
  case 'bells':return {tones:[partial(2,warm?.9:1.5,.14,{attack:.002}),partial(5.52,warm?.22:.45,warm?.018:.032,{attack:.001}),partial(8.1,.12,.008,{attack:.001})],noise:[]};
  case 'pluck':return {tones:[partial(1,.32*decay,.14,{type:'triangle',attack:.003}),partial(2,.12*decay,warm?.02:.04,{attack:.002}),partial(3,.055,.012,{attack:.002})],noise:[]};
  case 'organ':return {tones:[partial(1,.7,.12,{attack:.018,sustain:.85}),partial(2,.7,.045,{attack:.022,sustain:.8}),partial(3,.68,.027,{attack:.02,sustain:.8}),partial(.5,.68,.024,{attack:.025,sustain:.85})],noise:[]};
  case 'pad':return {tones:[partial(.999,1.95,.075,{type:'triangle',attack:.32,sustain:.65}),partial(1.001,2.05,.065,{attack:.38,sustain:.7}),partial(2,1.85,.018,{attack:.42,sustain:.55})],noise:[]};
  default:return {tones:[],noise:[]};
 }
}
