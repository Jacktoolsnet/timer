import {renderLapInsights} from './lap-insights';
import {enhanceStopwatchSelects} from './stopwatch-selects';
import {Stopwatch, formatElapsed, lapRows, lapsCsv, combinedLapRows, analyzeLaps, lapsHtml} from '../lib/stopwatch';
import {screenWakeLock} from '../lib/wake-lock';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
const $ = (id: string) => document.getElementById(id)!;
const t = JSON.parse($('stopwatch-app').dataset.text!);
let timer = new Stopwatch();
let nextClockNumber=2;
const colors = ['#a64d35','#59745c','#427ca1','#9465aa','#b17a20'];
const clocks: {timer:Stopwatch; name:string; color:string; card?:HTMLElement}[] = [{timer,name:t.clock+' 1',color:colors[0]!}];
const captures: {clock:number; number:number; duration:number; elapsed:number}[] = [];
let selectedClock = 0;
let resetTarget = 0;

const start = $('toggle-timing') as HTMLButtonElement;
const lap = $('lap') as HTMLButtonElement;
const reset = $('reset-timing') as HTMLButtonElement;
const copyLaps = $('copy-laps') as HTMLButtonElement;
const exportLaps = $('export-laps') as HTMLButtonElement;
const awake = $('awake') as HTMLInputElement;
const view = $('stopwatch-view') as HTMLSelectElement;
const wake = screenWakeLock($('wake-status'), '', t.unavailable);
// Wall-clock timestamps include time spent in background tabs and device sleep.
// Device clock adjustments remain a documented limitation.
const now = () => Date.now();
try { if (storageAllowed()) {
 const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
 awake.checked = saved?.awake === true;
 if (saved?.view === 'analog' || saved?.view === 'digital' || saved?.view === 'combined') view.value = saved.view;
} } catch {}
function save() {
 if (!storageAllowed()) return;
 try {localStorage.setItem(STORAGE_KEY, JSON.stringify({awake: awake.checked, view: view.value}));}
 catch {$('wake-status').textContent = t.storageError;}
}
function render() {
 const elapsed = timer.elapsed(now()); $('elapsed').textContent = formatElapsed(elapsed);
 if (view.value !== 'digital') {
 $('stopwatch-second-hand').setAttribute('transform', `rotate(${(elapsed % 60000) / 60000 * 360} 160 160)`);
 $('stopwatch-minute-hand').setAttribute('transform', `rotate(${(elapsed % 3600000) / 3600000 * 360} 160 107)`);
 }
}
function configureView() {
 $('stopwatch-display').dataset.view = view.value;
 $('analog-stopwatch').hidden = view.value === 'digital';
 $('elapsed').hidden = view.value === 'analog'; render();
}
view.addEventListener('change', () => {configureView(); save();});
function sync() {
 document.querySelectorAll<HTMLButtonElement>('.delete-clock').forEach(button=>button.disabled=clocks.length===1);
 const label = timer.running ? t.pause : timer.elapsed(now()) > 0 ? t.resume : t.start;
 start.setAttribute('aria-label', label); start.title = label;
 $('play-symbol').hidden = timer.running; $('pause-symbol').hidden = !timer.running;
 start.disabled = false; lap.disabled = !timer.running;
 copyLaps.disabled = exportLaps.disabled = displayedLaps().length === 0;
 reset.disabled = timer.running || (timer.elapsed(now()) === 0 && !timer.laps.length);
 const anyRunning=clocks.some(clock=>clock.timer.running);
 ($('lap-all') as HTMLButtonElement).disabled=!anyRunning;
 ($('reset-all') as HTMLButtonElement).disabled=anyRunning || !clocks.some(clock=>clock.timer.elapsed(now())>0 || clock.timer.laps.length);
 ($('pause-all') as HTMLButtonElement).disabled=!anyRunning;
 ($('start-all') as HTMLButtonElement).disabled=clocks.every(clock=>clock.timer.running);
 wake(awake.checked && anyRunning); render(); syncExtras();
}
function toggle() {timer.running ? timer.pause(now()) : timer.start(now()); sync();}
function capture(index=0,stamp=now()) {
 const clock=clocks[index]!;
 const item=clock.timer.lap(stamp); if(!item) return;
 captures.push({clock:index,number:clock.timer.laps.length,...item});
 renderRounds(); sync();
 $('lap-status').textContent = `${clock.name}: ${t.lap} ${clock.timer.laps.length}: ${formatElapsed(item.duration)}`;
}
start.addEventListener('click', toggle); lap.addEventListener('click', () => capture());
const resetDialog = $('reset-dialog') as HTMLDialogElement;
reset.addEventListener('click', () => {
 if (timer.running || reset.disabled || resetDialog.open) return;
 openReset(0);
});
resetDialog.addEventListener('close', () => {
 const targets=resetTarget<0?clocks:[clocks[resetTarget]!];
 if(resetDialog.returnValue!=='reset' || targets.some(clock=>clock.timer.running))return;
 targets.forEach(clock=>clock.timer.reset());
 for(let i=captures.length-1;i>=0;i--)if(resetTarget<0 || captures[i]!.clock===resetTarget)captures.splice(i,1);
 $('lap-status').textContent='';
 renderRounds();sync();
 if(resetTarget<0)($('start-all') as HTMLButtonElement).focus();
 else if(resetTarget===0)start.focus();
 else clocks[resetTarget]!.card!.querySelector<HTMLButtonElement>('[data-action=toggle]')!.focus();

});
awake.addEventListener('change', () => {wake(awake.checked && clocks.some(clock=>clock.timer.running)); save();});
document.addEventListener('storage-enabled', save);
document.addEventListener('preferences-cleared', () => {awake.checked = false; wake(false); view.value = 'analog'; view.dispatchEvent(new Event('change')); });
let ownsFullscreen = false;
function focus(enabled: boolean) {
 document.body.classList.toggle('focus-view', enabled);
 $('stopwatch-focus').setAttribute('aria-pressed', String(enabled));
 $('stopwatch-focus').setAttribute('aria-label', enabled ? t.exitFocus : t.focusMode);
 $('stopwatch-focus').querySelector('span')!.textContent = enabled ? t.exitFocus : t.focusMode;
}
async function leave() {focus(false); if (ownsFullscreen && document.fullscreenElement) {ownsFullscreen=false; await document.exitFullscreen().catch(()=>{});}}
$('stopwatch-focus').addEventListener('click', async () => {
 if (document.body.classList.contains('focus-view')) return leave();
 focus(true);
 if (!document.fullscreenElement) try {await document.documentElement.requestFullscreen(); ownsFullscreen=true; if (!document.body.classList.contains('focus-view')) await leave();} catch {}
});
document.addEventListener('fullscreenchange', () => {if (!document.fullscreenElement) {ownsFullscreen=false; focus(false);}});
document.addEventListener('keydown', e => {
 if (document.querySelector('dialog[open]')) return;
 if (e.key === 'Escape') {void leave(); return;}
 if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || document.querySelector('dialog[open]') || document.querySelector('details.palette-dropdown[open]')) return;
 if ((e.target as HTMLElement).closest('button,a,input,select,textarea,summary,[contenteditable]')) return;
 if (e.code === 'Space') {e.preventDefault(); toggle();}
 if (e.key.toLowerCase() === 'l') {e.preventDefault(); capture();}
});
window.addEventListener('beforeunload', e => {if (clocks.some(clock=>clock.timer.running || clock.timer.elapsed(now())>0 || clock.timer.laps.length)) {e.preventDefault();}});
window.addEventListener('pageshow', sync);
configureView(); sync(); setInterval(() => {if (!document.hidden && clocks.some(clock=>clock.timer.running)) {render(); renderExtras();}}, 30);
document.addEventListener('visibilitychange', () => {if (!document.hidden) {render(); renderExtras();}});

enhanceStopwatchSelects(document.querySelector<HTMLElement>('.stopwatch-options')!);

function exportRows() {
 if(selectedClock>=0) return lapRows(clocks[selectedClock]!.timer.laps,[t.lap,t.duration,t.total]);
 return combinedLapRows(clocks.map(clock=>({name:clock.name,laps:clock.timer.laps})),t.lap);
}
async function copyRounds(formatted:boolean) {
 if (!displayedLaps().length) return;
 const rows=exportRows();
 const snapshot=rows.map(row=>row.join('\t')).join('\n');
 const heading=t.laps+' · '+(selectedClock<0?t.allClocks:clocks[selectedClock]!.name);
 let message=t.copied;
 try {
  if(formatted){
   let richCopied=false;
   if(typeof ClipboardItem!=='undefined' && typeof navigator.clipboard?.write==='function'){
    try{
     await navigator.clipboard.write([new ClipboardItem({
      'text/plain':new Blob([snapshot],{type:'text/plain'}),
      'text/html':new Blob([lapsHtml(rows,heading)],{type:'text/html'})
     })]);
     richCopied=true;
    }catch{/* Unsupported formats or permissions: attempt plain text below. */}
   }
   if(richCopied)message=t.copiedFormatted;
   else{await navigator.clipboard.writeText(snapshot);message=t.copiedPlainFallback;}
  }else await navigator.clipboard.writeText(snapshot);
  if(exportRows().map(row=>row.join('\t')).join('\n')===snapshot)$('export-status').textContent=message;
 }catch{
  if(exportRows().map(row=>row.join('\t')).join('\n')===snapshot)$('export-status').textContent=t.copyError;
 }
}

const copyMenu=$('copy-menu');
function closeCopyMenu(restoreFocus=false){
 copyMenu.hidden=true;copyLaps.setAttribute('aria-expanded','false');
 if(restoreFocus)copyLaps.focus();
}
function openCopyMenu(last=false){
 if(copyLaps.disabled)return;
 copyMenu.hidden=false;copyLaps.setAttribute('aria-expanded','true');
 (last?$('copy-formatted'):$('copy-plain')).focus();
}
copyLaps.addEventListener('click',()=>copyMenu.hidden?openCopyMenu():closeCopyMenu(true));
copyLaps.addEventListener('keydown',event=>{
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openCopyMenu(event.key==='ArrowUp');}
});
$('copy-plain').addEventListener('click',()=>{closeCopyMenu(true);void copyRounds(false);});
$('copy-formatted').addEventListener('click',()=>{closeCopyMenu(true);void copyRounds(true);});
copyMenu.addEventListener('keydown',event=>{
 const items=[$('copy-plain'),$('copy-formatted')];
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeCopyMenu(true);}
 else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
  event.preventDefault();
  const index=items.indexOf(document.activeElement as HTMLElement);
  items[event.key==='Home'?0:event.key==='End'?1:(index+1)%2]!.focus();
 }
});
document.addEventListener('click',event=>{
 if(!(event.target as HTMLElement).closest('.copy-menu-wrapper'))closeCopyMenu();
});
document.querySelector('.copy-menu-wrapper')!.addEventListener('focusout',event=>{
 if(!(event.currentTarget as HTMLElement).contains((event as FocusEvent).relatedTarget as Node|null))closeCopyMenu();
});
exportLaps.addEventListener('click', () => {
 if (!displayedLaps().length) return;
 const blob = new Blob([lapsCsv(exportRows())], {type:'text/csv;charset=utf-8'});
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a'); link.href = url; link.download = 'jacktools-stopwatch-' + new Date().toISOString().replaceAll(':','-').slice(0,19) + '.csv';
 document.body.append(link); link.click(); link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 10000);
 $('export-status').textContent = t.exported;
});


function openReset(index:number){
 resetTarget=index;
 $('reset-title').textContent=index<0?t.resetAllTitle:clocks.length>1?t.resetTitle+' · '+clocks[index]!.name:t.resetTitle;
 $('reset-description').textContent=index<0?t.resetAllBody:t.resetBody;
 resetDialog.returnValue='cancel';resetDialog.showModal();
}
function displayedLaps() {return selectedClock<0 ? captures : clocks[selectedClock]!.timer.laps;}
function renderRounds() {
 const laps=displayedLaps();
 $('laps-body').replaceChildren();
 const rows=selectedClock<0 ? captures : captures.filter(item=>item.clock===selectedClock);
 for(const item of [...rows].reverse()){
  const row=document.createElement('tr');
  const values=[String(item.number),formatElapsed(item.duration),formatElapsed(item.elapsed)];
  if(selectedClock<0) values.unshift(clocks[item.clock]!.name);
  for(const value of values){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
  $('laps-body').append(row);
 }
 $('lap-clock-heading').hidden=selectedClock>=0;
 $('laps-table').hidden=!laps.length; $('empty-laps').hidden=!!laps.length;
 copyLaps.disabled=exportLaps.disabled=!laps.length;
 $('selected-clock').textContent=selectedClock<0 ? t.allClocks : clocks[selectedClock]!.name;
 $('all-clocks').setAttribute('aria-pressed',String(selectedClock<0));
 $('show-all-laps').setAttribute('aria-pressed',String(selectedClock<0));
 $('export-status').textContent='';
 $('lap-insights').querySelector('h3')!.hidden=false;
 $('lap-insights').querySelector<HTMLElement>('.lap-stats')!.hidden=false;
 const legend=$('lap-insights').querySelector<HTMLElement>('.lap-chart-legend')!;
 legend.replaceChildren();
 const dash=document.createElement('span');dash.setAttribute('aria-hidden','true');legend.append(dash,document.createTextNode(t.average+' · '+t.seconds));
 renderLapInsights(selectedClock<0 ? [] : clocks[selectedClock]!.timer.laps,t);
 if(selectedClock<0) renderCombinedChart();
 renderPrintView();
}
function selectClock(index:number) {selectedClock=index;renderRounds();}
function syncExtras(){
 for(const clock of clocks.slice(1)){
  const card=clock.card!;
  const toggle=card.querySelector<HTMLButtonElement>('[data-action=toggle]')!;
  const label=clock.timer.running?t.pause:clock.timer.elapsed(now())>0?t.resume:t.start;
  toggle.setAttribute('aria-label',label);toggle.title=label;
  toggle.querySelector('[data-play]')!.toggleAttribute('hidden',clock.timer.running);
  toggle.querySelector('[data-pause]')!.toggleAttribute('hidden',!clock.timer.running);
  card.querySelector<HTMLButtonElement>('[data-action=lap]')!.disabled=!clock.timer.running;
  card.querySelector<HTMLButtonElement>('[data-action=reset]')!.disabled=clock.timer.running || (!clock.timer.elapsed(now())&&!clock.timer.laps.length);
 }
 renderExtras();
}
function renderExtras(){
 for(const clock of clocks.slice(1)){
  const elapsed=clock.timer.elapsed(now()),card=clock.card!;
  card.querySelector('[data-readout]')!.textContent=formatElapsed(elapsed);
  card.querySelector<HTMLElement>('[data-readout]')!.hidden=view.value==='analog';
  card.querySelector<SVGElement>(':scope > svg')!.style.display=view.value==='digital'?'none':'block';
  card.querySelector('[data-second]')!.setAttribute('transform',`rotate(${elapsed%60000/60000*360} 160 160)`);
  card.querySelector('[data-minute]')!.setAttribute('transform',`rotate(${elapsed%3600000/3600000*360} 160 107)`);
 }
}
view.addEventListener('change',renderExtras);
$('primary-show-laps').addEventListener('click',()=>selectClock(0));
$('clock-primary-name').addEventListener('input',()=>{
 clocks[0]!.name=($('clock-primary-name') as HTMLInputElement).value.trim() || t.clock+' 1';renderRounds();
});
$('previous-clock').addEventListener('click',()=>selectClock(selectedClock<0?clocks.length-1:(selectedClock+clocks.length-1)%clocks.length));
$('next-clock').addEventListener('click',()=>selectClock(selectedClock<0?0:(selectedClock+1)%clocks.length));
$('all-clocks').addEventListener('click',()=>selectClock(-1));
$('reset-all').addEventListener('click',()=>{
 if(($('reset-all') as HTMLButtonElement).disabled || resetDialog.open)return;
 openReset(-1);
});
$('show-all-laps').addEventListener('click',()=>selectClock(-1));
$('lap-all').addEventListener('click',()=>{
 const stamp=now();
 clocks.forEach((clock,index)=>{if(clock.timer.running)capture(index,stamp);});
});
$('start-all').addEventListener('click',()=>{const stamp=now();clocks.forEach(clock=>clock.timer.start(stamp));sync();});
$('pause-all').addEventListener('click',()=>{const stamp=now();clocks.forEach(clock=>clock.timer.pause(stamp));sync();});
$('add-clock').addEventListener('click',()=>{
 const index=clocks.length;
 const clockNumber=nextClockNumber++;
 const card=document.createElement('section');card.className='extra-clock clock-tile';
 const color=colors[index%colors.length]!;
 card.style.setProperty('--clock-color',color);
 const heading=document.createElement('div');heading.className='clock-heading';
 const name=document.createElement('input');name.value=t.clock+' '+clockNumber;name.maxLength=60;name.setAttribute('aria-label',t.clockName);
 const clock={timer:new Stopwatch(),name:name.value,color,card};clocks.push(clock);
 name.addEventListener('input',()=>{clock.name=name.value.trim() || t.clock+' '+clockNumber;renderRounds();});
 heading.append(name);
 const remove=$('delete-primary-clock').cloneNode(true) as HTMLButtonElement;
 remove.removeAttribute('id');remove.disabled=false;
 remove.addEventListener('click',()=>deleteClock(clocks.indexOf(clock)));
 heading.append(remove);
 const button=(action:string,label:string,handler:()=>void)=>{
  const element=document.createElement('button');element.className='secondary';element.dataset.action=action;element.setAttribute('aria-label',label);element.title=label;
  const source=action==='toggle'?'toggle-timing':action==='lap'?'lap':action==='reset'?'reset-timing':'primary-show-laps';
  for(const child of $(source).children)element.append(child.cloneNode(true));
  element.querySelectorAll('[id]').forEach(node=>{
   if(node.id==='play-symbol')node.setAttribute('data-play','');
   if(node.id==='pause-symbol')node.setAttribute('data-pause','');
   node.removeAttribute('id');
  });
  if(action==='toggle')element.className='primary';
  element.addEventListener('click',handler);return element;
 };
 card.append(heading);
 const dial=$('analog-stopwatch').querySelector('svg')!.cloneNode(true) as SVGElement;
 dial.querySelector('#stopwatch-second-hand')!.setAttribute('data-second','');
 dial.querySelector('#stopwatch-minute-hand')!.setAttribute('data-minute','');
 dial.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
 card.append(dial);
 const readout=document.createElement('p');readout.dataset.readout='';readout.className='extra-clock-time';readout.setAttribute('role','timer');readout.setAttribute('aria-live','off');card.append(readout);
 const controls=document.createElement('div');controls.className='extra-clock-controls timer-controls';
 controls.append(button('reset',t.reset,()=>{
  if(clock.timer.running || resetDialog.open)return;
  openReset(clocks.indexOf(clock));
 }),button('toggle',t.start,()=>{clock.timer.running?clock.timer.pause(now()):clock.timer.start(now());sync();}),
 button('lap',t.lap,()=>capture(clocks.indexOf(clock))),button('show',t.showLaps,()=>selectClock(clocks.indexOf(clock))));

 card.append(controls);$('extra-clocks').append(card);
 for(const id of ['clock-primary-heading','start-all','pause-all','reset-all','lap-all','show-all-laps','lap-navigation']) $(id).hidden=false;
 document.body.classList.add('multiple-stopwatches');
 sync();renderRounds();name.focus();
});
function renderCombinedChart(root:ParentNode=document){
 const $=(id:string)=>root.querySelector<HTMLElement>('[id="'+id+'"]')!;
 const active=clocks.filter(clock=>clock.timer.laps.length);
 if(!active.length)return;
 $('lap-insights').hidden=false;
 // A pooled average is deliberately not presented as a per-clock comparison.
 $('lap-insights').querySelector('h3')!.hidden=true;
 $('lap-insights').querySelector<HTMLElement>('.lap-stats')!.hidden=true;
 const legend=$('lap-insights').querySelector<HTMLElement>('.lap-chart-legend')!;
 legend.replaceChildren();
 for(const clock of active){
  const entry=document.createElement('span');entry.className='combined-legend-entry';
  const swatch=document.createElement('i');swatch.style.backgroundColor=clock.color;swatch.setAttribute('aria-hidden','true');
  entry.append(swatch,document.createTextNode(clock.name));legend.append(entry);
 }
 legend.append(document.createTextNode(' · '+t.seconds));
 const group=$('lap-chart-content');group.replaceChildren();
 const maximum=active.reduce((maximum,clock)=>clock.timer.laps.reduce((maximum,lap)=>Math.max(maximum,lap.duration),maximum),10)*1.15;
 const count=active.reduce((maximum,clock)=>Math.max(maximum,clock.timer.laps.length),1);
 const x=(i:number)=>count===1?260:52+i/(count-1)*408,y=(ms:number)=>190-ms/maximum*170;
 const add=(tag:string,attrs:Record<string,string|number>,text?:string,parent:Element=group)=>{
  const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([key,value])=>element.setAttribute(key,String(value)));
  if(text!==undefined)element.textContent=text;parent.append(element);return element;
 };
 for(let i=0;i<=4;i++){
  add('line',{x1:52,x2:460,y1:y(maximum*i/4),y2:y(maximum*i/4),class:'lap-chart-grid'});
  add('text',{x:44,y:y(maximum*i/4)+4,'text-anchor':'end'},(maximum*i/4000).toLocaleString(undefined,{maximumFractionDigits:2}));
 }
 for(const clock of active){
  add('polyline',{points:clock.timer.laps.map((lap,i)=>`${x(i)},${y(lap.duration)}`).join(' '),fill:'none',stroke:clock.color,'stroke-width':2});
  clock.timer.laps.forEach((lap,i)=>{
   const point=add('circle',{cx:x(i),cy:y(lap.duration),r:3,fill:clock.color});
   add('title',{},`${clock.name} · ${t.lap} ${i+1}: ${formatElapsed(lap.duration)}`,point);
  });
 }
 const stride=Math.max(1,Math.ceil(count/8));
 for(let i=0;i<count;i++)if(i%stride===0||i===count-1)add('text',{x:x(i),y:210,'text-anchor':'middle'},String(i+1));
 add('text',{x:260,y:228,'text-anchor':'middle'},t.lap);
 $('lap-chart-description').textContent=active.map(clock=>clock.name+': '+clock.timer.laps.map(lap=>formatElapsed(lap.duration)).join(', ')).join('. ');
}



function renderPrintView(){
 const multiple=clocks.length>1;
 $('print-title').textContent=t.laps+' · '+(multiple?t.allClocks:clocks[0]!.name);
 const fillTable=(table:HTMLTableElement,rows:string[][])=>{
  table.createTHead().replaceChildren();
  const body=table.tBodies[0] || table.createTBody();body.replaceChildren();
  rows.forEach((values,index)=>{
   const row=document.createElement('tr');
   for(const value of values){
    const cell=document.createElement(index===0?'th':'td');
    if(index===0)cell.setAttribute('scope','col');
    cell.textContent=value;row.append(cell);
   }
   (index===0?table.tHead!:body).append(row);
  });
 };
 const makeChart=(index:number|null)=>{
  const root=document.createElement('div');
  root.append($('lap-insights').cloneNode(true));
  if(index===null)renderCombinedChart(root);
  else {
   renderLapInsights(clocks[index]!.timer.laps,t,root);
   const legend=root.querySelector('.lap-chart-legend')!;
   const dash=document.createElement('span');dash.setAttribute('aria-hidden','true');
   legend.replaceChildren(dash,document.createTextNode(t.average+': '+formatElapsed(analyzeLaps(clocks[index]!.timer.laps)!.average)+' · '+t.seconds));
  }
  const chart=root.querySelector('.lap-chart')! as HTMLElement;
  chart.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
  const svg=chart.querySelector('svg')!;
  svg.removeAttribute('aria-labelledby');svg.setAttribute('aria-label',t.chart);
  return chart;
 };
 const overview=$('print-laps') as HTMLTableElement;
 overview.hidden=multiple;
 fillTable(overview,lapRows(clocks[0]!.timer.laps,[t.lap,t.duration,t.total]));
 const sections=$('print-clock-sections');sections.replaceChildren();
 if(multiple)clocks.forEach((clock,index)=>{
  const section=document.createElement('section');section.className='print-clock-section';
  const heading=document.createElement('h3');heading.textContent=clock.name;section.append(heading);
  if(clock.timer.laps.length){
   const table=document.createElement('table');
   fillTable(table,lapRows(clock.timer.laps,[t.lap,t.duration,t.total]));
   section.append(table,makeChart(index));
  }else{
   const empty=document.createElement('p');empty.textContent=t.empty;section.append(empty);
  }
  sections.append(section);
 });
 $('print-chart').replaceChildren();
 if(clocks.some(clock=>clock.timer.laps.length)){
  if(multiple){
   const heading=document.createElement('h3');heading.textContent=t.chart+' · '+t.allClocks;
   $('print-chart').append(heading);
  }
  $('print-chart').append(makeChart(multiple?null:0));
 }
}
window.addEventListener('beforeprint',renderPrintView);
renderPrintView();

$('print-stopwatch').addEventListener('click',()=>{renderPrintView();window.print();});


$('delete-primary-clock').addEventListener('click',()=>deleteClock(0));
function deleteClock(index:number){
 if(clocks.length===1 || index<0 || resetDialog.open)return;
 const clock=clocks[index]!;
 if((clock.timer.running || clock.timer.elapsed(now())>0 || clock.timer.laps.length) &&
  !window.confirm(clock.name+'\n'+t.deleteClockConfirm))return;
 clock.timer.pause(now());
 for(let i=captures.length-1;i>=0;i--){
  if(captures[i]!.clock===index)captures.splice(i,1);
  else if(captures[i]!.clock>index)captures[i]!.clock--;
 }
 clocks.splice(index,1);
 if(index===0){
  const promoted=clocks[0]!;
  promoted.card!.remove();delete promoted.card;
  timer=promoted.timer;
  ($('clock-primary-name') as HTMLInputElement).value=promoted.name;
  $('primary-clock').style.setProperty('--clock-color',promoted.color);
 }else clock.card!.remove();
 if(selectedClock===index)selectedClock=Math.min(index,clocks.length-1);
 else if(selectedClock>index)selectedClock--;
 for(const id of ['start-all','pause-all','reset-all','lap-all','show-all-laps','lap-navigation'])$(id).hidden=clocks.length===1;
 document.body.classList.toggle('multiple-stopwatches',clocks.length>1);
 closeCopyMenu();renderRounds();sync();
 $('add-clock').focus();
}
