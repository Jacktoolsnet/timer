export type Accent = 0 | 1 | 2;
export type Settings = { bpm: number; beats: number; subdivision: number; accents: Accent[]; sound: 'wood'|'digital'|'soft'|'silent'; volume: number; view: 'orbit'|'pendulum'|'strip'|'ball'; gap: boolean; audibleBars: number; silentBars: number; hideGap: boolean; reduced: boolean };
export const defaults: Settings = { bpm: 90, beats: 4, subdivision: 1, accents: [2,1,1,1], sound: 'wood', volume: .5, view: 'orbit', gap: false, audibleBars: 3, silentBars: 1, hideGap: false, reduced: false };
export function normalize(raw: Partial<Settings>): Settings {
 const integer = (n: unknown, fallback: number, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(min,Math.min(max,Math.round(n))) : fallback;
 const beats=integer(raw.beats,4,1,12);
 return { bpm:integer(raw.bpm,90,20,300), beats, subdivision:[1,2,3,4].includes(raw.subdivision!)?raw.subdivision!:1,
 accents:Array.from({length:beats},(_,i)=>[0,1,2].includes(raw.accents?.[i] ?? -1)?raw.accents![i]:i===0?2:1),
 sound:['wood','digital','soft','silent'].includes(raw.sound!)?raw.sound!:'wood', volume:typeof raw.volume==='number'&&Number.isFinite(raw.volume)?Math.max(0,Math.min(1,raw.volume)):.5,
 view:['orbit','pendulum','strip','ball'].includes(raw.view!)?raw.view!:'orbit', gap:raw.gap===true, audibleBars:integer(raw.audibleBars,3,1,16),silentBars:integer(raw.silentBars,1,1,8),hideGap:raw.hideGap===true,reduced:raw.reduced===true };
}
export function pulseAt(index:number,s:Settings) {
 const beatIndex=Math.floor(index/s.subdivision),beat=beatIndex%s.beats,bar=Math.floor(beatIndex/s.beats),sub=index%s.subdivision;
 const silent=s.gap && bar%(s.audibleBars+s.silentBars)>=s.audibleBars;
 return {beat,bar,sub,silent,accent:silent?0:sub===0?s.accents[beat]:s.accents[beat]===0?0:1};
}
export function tappedTempo(taps:number[]):number|null {
 const intervals=taps.slice(1).map((t,i)=>t-taps[i]).filter(t=>t>=100&&t<=3000).sort((a,b)=>a-b);
 if(!intervals.length)return null;
 const mid=Math.floor(intervals.length/2),median=intervals.length%2?intervals[mid]:(intervals[mid-1]+intervals[mid])/2;
 return Math.max(20,Math.min(300,Math.round(60000/median)));
}

/** Ball contacts each station exactly on the beat, including the bar wrap. */
export function bouncePosition(position:number,beats:number,reduced=false){
 const whole=Math.floor(position),fraction=position-whole;
 const station=(beat:number)=>beats===1?180:30+300*(beat%beats)/(beats-1);
 return {x:reduced?station(whole):station(whole)+(station(whole+1)-station(whole))*fraction,y:238-(reduced?0:100*4*fraction*(1-fraction))};
}
