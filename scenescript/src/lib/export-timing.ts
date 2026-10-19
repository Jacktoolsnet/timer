export type ExportTimePhase='estimating'|'rendering'|'stalled'|'finalizing'|'complete'|'stopped';
export type ExportTime={elapsedMs:number;remainingMs:number|null;phase:ExportTimePhase};
const WINDOW_MS=45000,WARMUP_MS=5000,STALE_MS=10000,SAMPLE_MS=500;
type Sample={at:number;progress:number};
/** Monotonic, bounded recent-throughput estimate. The last 2% is file finalization. */
export class ExportTiming{
 private progress=0;private samples:Sample[]=[];private latest:Sample|undefined;private ended:number|undefined;private stopped=false;private lastNow:number;private started:number;
 constructor(started:number){if(!Number.isFinite(started))throw new Error('Invalid export start time');this.started=started;this.lastNow=started;}
 private now(value:number){return this.lastNow=Math.max(this.lastNow,Number.isFinite(value)?value:this.lastNow);}
 observe(progress:number,at:number){
  const now=this.now(at);if(this.ended!==undefined||!Number.isFinite(progress)||progress<=this.progress)return;
  this.progress=Math.min(1,Math.max(0,progress));
  if(this.progress===1){this.ended=now;return;}
  if(this.progress>=.98)return;
  if(this.latest&&now-this.latest.at>=STALE_MS)this.samples=[];
  const point={at:now,progress:this.progress};this.latest=point;
  if(!this.samples.length||now-this.samples.at(-1)!.at>=SAMPLE_MS)this.samples.push(point);
  while(this.samples.length>2&&this.samples[1].at<now-WINDOW_MS)this.samples.shift();
 }
 stop(at:number){if(this.ended===undefined){this.ended=this.now(at);this.stopped=true;}}
 read(at:number):ExportTime{
  const now=this.now(at),elapsedMs=Math.max(0,(this.ended??now)-this.started);
  if(this.stopped)return {elapsedMs,remainingMs:null,phase:'stopped'};
  if(this.progress>=1)return {elapsedMs,remainingMs:0,phase:'complete'};
  if(this.progress>=.98)return {elapsedMs,remainingMs:null,phase:'finalizing'};
  const first=this.samples[0],latest=this.latest;
  if(latest&&now-latest.at>=STALE_MS)return {elapsedMs,remainingMs:null,phase:'stalled'};
  if(!first||!latest||latest.at-first.at<WARMUP_MS||this.samples.length<3)return {elapsedMs,remainingMs:null,phase:'estimating'};
  const rate=(latest.progress-first.progress)/(latest.at-first.at),remainingMs=(.98-this.progress)/rate;
  if(!Number.isFinite(remainingMs)||remainingMs<0)return {elapsedMs,remainingMs:null,phase:'estimating'};
  return {elapsedMs,remainingMs,phase:'rendering'};
 }
}
export function formatExportDuration(ms:number){
 const seconds=Math.max(0,Math.floor(Number.isFinite(ms)?ms/1000:0)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60;
 return (hours?String(hours).padStart(2,'0')+':':'')+String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
