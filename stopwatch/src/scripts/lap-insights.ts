import {analyzeLaps,formatElapsed} from '../lib/stopwatch';

export function renderLapInsights(laps: readonly {duration:number}[], t: Record<string,string>) {
 const $ = (id:string) => document.getElementById(id)!;
 const analysis = analyzeLaps(laps);
 $('lap-insights').hidden = !analysis;
 const content = $('lap-chart-content');
 content.replaceChildren();
 if (!analysis) return;
 const namedTime = (index:number) => `${formatElapsed(laps[index]!.duration)} · ${t.lap} ${index+1}`;
 $('lap-fastest').textContent = namedTime(analysis.fastest);
 $('lap-slowest').textContent = namedTime(analysis.slowest);
 $('lap-average').textContent = formatElapsed(analysis.average);
 $('lap-difference').textContent = analysis.difference === null ? '—' :
  (analysis.difference > 0 ? '+' : analysis.difference < 0 ? '−' : '') + formatElapsed(Math.abs(analysis.difference));
 // Zero-based vertical scale with headroom; a single lap is centered.
 const maximum = Math.max(10,laps[analysis.slowest]!.duration) * 1.15;
 const x = (index:number) => laps.length===1 ? 260 : 52 + index/(laps.length-1)*408;
 const y = (duration:number) => 190 - duration/maximum*170;
 const add = (tag:string, attrs:Record<string,string|number>, text?:string, parent:Element=content) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg',tag);
  for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
  if(text!==undefined) element.textContent=text;
  parent.append(element);
  return element;
 };
 for(let tick=0;tick<=4;tick++){
  const duration=maximum*tick/4;
  add('line',{x1:52,x2:460,y1:y(duration),y2:y(duration),class:'lap-chart-grid'});
  add('text',{x:44,y:y(duration)+4,'text-anchor':'end'},(duration/1000).toLocaleString(undefined,{maximumFractionDigits:2}));
 }
 add('line',{x1:52,x2:460,y1:y(analysis.average),y2:y(analysis.average),class:'lap-chart-average'});
 add('polyline',{points:laps.map((lap,index)=>`${x(index)},${y(lap.duration)}`).join(' '),class:'lap-chart-line'});
 // Limit visible labels but retain every point and its exact-value tooltip.
 const stride=Math.max(1,Math.ceil(laps.length/8));
 laps.forEach((lap,index)=>{
  const point=add('circle',{cx:x(index),cy:y(lap.duration),r:3,class:'lap-chart-point'});
  add('title',{},`${t.lap} ${index+1}: ${formatElapsed(lap.duration)}`,point);
  if(index%stride===0 || index===laps.length-1) add('text',{x:x(index),y:210,'text-anchor':'middle'},String(index+1));
 });
 add('text',{x:260,y:228,'text-anchor':'middle'},t.lap);
 $('lap-chart-description').textContent = `${t.chart}: ${laps.length} · ${t.average}: ${formatElapsed(analysis.average)}. ${t.fastest}: ${namedTime(analysis.fastest)}. ${t.slowest}: ${namedTime(analysis.slowest)}.`;
}
