import { renderPlayButton } from '../lib/play-button';
import { TRAINING_KEY, sanitizeTraining, trainingPhases } from '../lib/training';
import { storageAllowed } from '../lib/storage';
import { formatTime } from '../lib/engine';
const el = (id: string) => document.getElementById(id)!;
const t = JSON.parse(el('training-app').dataset.translations!);
const form = el('training-form') as HTMLFormElement;
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
let settings = sanitizeTraining(null);
try { if (storageAllowed()) settings = sanitizeTraining(JSON.parse(localStorage.getItem(TRAINING_KEY) || 'null')); } catch {}
for (const [key,value] of Object.entries(settings)) { if (typeof value === 'boolean') field(key).checked = value; else field(key).value = String(value); }
let phases = trainingPhases(settings), index = 0, remaining = phases[0].seconds * 1000, deadline: number | null = null;
let audio: AudioContext | undefined;
let lastSecond = -1, halfPlayed = false;
let wake: WakeLockSentinel | null = null, requesting = false;
async function syncWake() {
  const wanted = settings.awake && deadline !== null && document.visibilityState === 'visible';
  if (!wanted) { if (wake) { const old = wake; wake = null; await old.release().catch(() => {}); } el('wake-status').textContent = ''; return; }
  if (wake || requesting) return;
  requesting = true;
  try {
    if (!navigator.wakeLock) throw new Error('unsupported');
    const lock = await navigator.wakeLock.request('screen');
    if (!settings.awake || deadline === null || document.visibilityState !== 'visible') { await lock.release(); return; }
    wake = lock; el('wake-status').textContent = t.active;
    lock.addEventListener('release', () => { if (wake === lock) { wake = null; el('wake-status').textContent = deadline !== null ? t.unavailable : ''; } });
  } catch { el('wake-status').textContent = t.unavailable; } finally { requesting = false; }
}
function beep(frequency: number, count = 1) {
  if (!settings.sound || !audio || audio.state !== 'running' || document.hidden) return;
  for (let i=0;i<count;i++) { const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime+i*.22; osc.frequency.value=frequency; gain.gain.setValueAtTime(.08,at); gain.gain.exponentialRampToValueAtTime(.001,at+.18); osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.2);osc.onended=()=>{osc.disconnect();gain.disconnect();}; }
}
function render() {
  const phase = phases[index];
  el('training-phase').textContent = phase ? t[phase.kind] : t.done;
  el('training-time').textContent = formatTime(remaining);
  el('ring-progress').style.strokeDashoffset = String(100 * (1 - (phase ? Math.min(1, Math.max(0, remaining / (phase.seconds * 1000))) : 0)));
  el('training-time').classList.toggle('has-hours', formatTime(remaining).length > 5);
  el('training-round').textContent = `${t.round} ${phase?.round || settings.rounds} ${t.of} ${settings.rounds}`;
  const totalRemaining = remaining + phases.slice(index+1).reduce((a,p)=>a+p.seconds*1000,0);
  const totalDuration = phases.reduce((a,p)=>a+p.seconds*1000,0);
  el('training-total-progress').style.strokeDashoffset = String(100 * (1 - Math.min(1, Math.max(0, totalRemaining / totalDuration))));
  el('training-total').textContent = t.total + ': ' + formatTime(totalRemaining);
  renderPlayButton(el('training-start'), deadline !== null, deadline !== null ? t.pause : remaining < (phase?.seconds || 0) * 1000 ? t.resume : t.start);
  (el('training-next') as HTMLButtonElement).disabled = !phase;
  document.title = formatTime(remaining) + ' · ' + (phase ? t[phase.kind] : t.done) + ' · Jacktools';
}
function tick() {
  if (deadline === null) return;
  const now = Date.now(); let changed = false;
  while (deadline !== null && now >= deadline) {
    index++; changed = true; halfPlayed = false; lastSecond = -1;
    if (index >= phases.length) { remaining=0;deadline=null;beep(1040,3);void syncWake(); }
    else deadline += phases[index].seconds*1000;
  }
  if (deadline !== null) {
    remaining = deadline-now;
    const phase=phases[index], second=Math.ceil(remaining/1000);
    if (changed) beep(phase.kind === 'work' ? 880 : 440,2);
    else if (second !== lastSecond && second <= settings.countdown) beep(660);
    else if (settings.halfway && phase.kind === 'work' && !halfPlayed && remaining <= phase.seconds*500 && remaining > phase.seconds*500-1000) beep(550,2);
    if (remaining <= phase.seconds*500) halfPlayed = true;
    lastSecond=second;
  }
  render();
}
function reset() { deadline=null; phases=trainingPhases(settings);index=0;remaining=phases[0].seconds*1000;lastSecond=-1;halfPlayed=false;void syncWake();render(); }
function save() {
  if (!storageAllowed()) { el('training-settings-status').textContent=t.applied;return; }
  try { localStorage.setItem(TRAINING_KEY,JSON.stringify(read())); el('training-settings-status').textContent=t.saved; } catch {el('training-settings-status').textContent=t.storageError;}
}
function read() {return sanitizeTraining(Object.fromEntries(Object.keys(settings).map(key=>[key,field(key).type==='checkbox'?field(key).checked:Number(field(key).value)])));}
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;settings=read();save();reset();});
form.addEventListener('change',()=>{if(!form.checkValidity())return;settings.sound=field('sound').checked;settings.awake=field('awake').checked;save();void syncWake();});
document.addEventListener('storage-enabled',()=>{if(form.checkValidity())save();});
document.addEventListener('preferences-cleared',()=>{el('training-settings-status').textContent='';});
el('training-start').addEventListener('click',()=>{
  if(deadline!==null){tick();deadline=null;void syncWake();render();return;}
  if(index>=phases.length)reset();
  try { audio ??= new AudioContext();void audio.resume().catch(()=>{}); } catch {}
  deadline=Date.now()+remaining;void syncWake();render();
});
(el('training-start') as HTMLButtonElement).disabled=false;
el('training-reset').addEventListener('click',reset);
el('training-next').addEventListener('click',()=>{if(index>=phases.length)return;const running=deadline!==null;index++;halfPlayed=false;lastSecond=-1;remaining=(phases[index]?.seconds||0)*1000;deadline=running&&remaining?Date.now()+remaining:null;beep(index>=phases.length?1040:phases[index].kind==='work'?880:440,2);void syncWake();render();});
let ownsFullscreen=false;
function focus(on:boolean){document.body.classList.toggle('focus-view',on);el('training-focus').setAttribute('aria-pressed',String(on));el('training-focus').setAttribute('aria-label',on?t.exitFocus:t.focusMode);el('training-focus').querySelector('span')!.textContent=on?t.exitFocus:t.focusMode;}
el('training-focus').addEventListener('click',async()=>{const on=!document.body.classList.contains('focus-view');focus(on);if(on&&!document.fullscreenElement){try{await document.documentElement.requestFullscreen();ownsFullscreen=true;}catch{}}else if(!on&&ownsFullscreen){ownsFullscreen=false;await document.exitFullscreen().catch(()=>{});}});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){ownsFullscreen=false;focus(false);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')focus(false);});
document.addEventListener('visibilitychange',()=>{tick();void syncWake();});
window.addEventListener('pagehide',()=>{deadline=null;void syncWake();});
setInterval(tick,100);render();
