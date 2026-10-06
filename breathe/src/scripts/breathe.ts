import { breathAt, defaults, normalize, presets, type Settings, type Durations, type Preset } from '../lib/breathing';
import { dictionaries } from '../lib/breathe-i18n';
import { storageAllowed } from '../lib/storage';
import { screenWakeLock } from '../lib/wake-lock';
const t = dictionaries[document.documentElement.lang as keyof typeof dictionaries] || dictionaries.en;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const el = (id: string) => document.getElementById(id)!;
const start = el('start') as HTMLButtonElement;
const focus = el('focus') as HTMLButtonElement;
const form = el('breath-form') as HTMLFormElement;
const progress = el('session-progress') as HTMLProgressElement;
const KEY = 'jacktools.breathe.settings.v1';
let settings: Settings = normalize(defaults);
try { if (storageAllowed()) settings = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch {}
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (reduced.matches) settings.motion = false;
let running = false, elapsed = 0, anchor = 0, frame = 0, lastPhase = -1, finished = false;
let audio: AudioContext | null = null;
let soundGeneration = 0;
const wake = screenWakeLock(el('wake-status'), t.awakeOn, t.awakeOff);
function save() {
 if (!storageAllowed()) return;
 try { localStorage.setItem(KEY,JSON.stringify(settings)); } catch { el('storage-status').textContent = document.querySelector<HTMLElement>('#clear-storage')!.dataset.error!; }
}
function syncForm() {
 input('preset').value = settings.preset;
 settings.durations.forEach((n,i) => input('duration-'+i).value = String(n));
 input('minutes').value = String(settings.minutes);
 input('volume').value = String(settings.volume);
 for (const key of ['sound','awake','motion'] as const) input(key).checked = settings[key];
 el('preset-description').textContent = t.descriptions[Object.keys(presets).indexOf(settings.preset)]!;
 el('pattern-name').textContent = t.presets[Object.keys(presets).indexOf(settings.preset)]!;
}
async function prepareAudio() {
 if (!settings.sound) return;
 try {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') await audio.resume();
  el('audio-status').textContent = audio.state === 'running' ? '' : t.audioError;
 } catch { el('audio-status').textContent = t.audioError; }
}
function tone(phase: number) {
 if (!settings.sound || !audio || audio.state !== 'running' || document.hidden) return;
 try {
  const now = audio.currentTime;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime([392,523.25,293.66,261.63][phase]!,now);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(settings.volume/100*.14,now+.06);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.7);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); oscillator.stop(now+.75);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
 } catch { el('audio-status').textContent = t.audioError; }
}
function nowElapsed() { return running ? elapsed+(performance.now()-anchor)/1000 : elapsed; }
function render(time = elapsed) {
 const state = breathAt(time,settings.durations);
 const total = settings.minutes*60;
 if (running && total && time >= total) {
  elapsed = total; finished = true; stop();
  el('phase').textContent = t.done; el('count').textContent = '✓'; progress.value=total;
  el('session').textContent=t.remaining+' 0:00'; return;
 }
 if (state.phase !== lastPhase) {
  el('phase').textContent = finished ? t.done : running ? t.phases[state.phase]! : elapsed ? t.paused : t.ready;
  if (running && time > 0.05) tone(state.phase);
  lastPhase = state.phase;
 }
 el('count').textContent = finished ? '✓' : String(Math.ceil(state.remaining));
 el('breath-circle').style.transform = 'scale('+(settings.motion ? state.scale : .75)+')';
 el('round').textContent = t.round+' '+state.round;
 const left = Math.max(0,Math.ceil(total-time));
 el('session').textContent = total ? t.remaining+' '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0') : '∞';
 progress.hidden = !total; progress.max = total || 1; progress.value = Math.min(time,total);
}
function tick() { render(nowElapsed()); if (running) frame=requestAnimationFrame(tick); }
function stop() {
 running=false; soundGeneration++; cancelAnimationFrame(frame); wake(false);
 start.textContent = elapsed && !finished ? t.resume : t.start;
}
function reset() { stop(); elapsed=0; finished=false; lastPhase=-1; start.textContent=t.start; render(); }
start.addEventListener('click',() => {
 if (running) { elapsed=nowElapsed(); stop(); lastPhase=-1; render(); return; }
 if (!form.reportValidity()) { if (document.body.classList.contains('focus-view')) setFocus(false); return; }
 if (finished) { elapsed=0; finished=false; }
 running=true; anchor=performance.now(); lastPhase=-1; start.textContent=t.pause;
 wake(settings.awake); const generation=++soundGeneration;
 void prepareAudio().then(() => { if (generation===soundGeneration && running) tone(breathAt(nowElapsed(),settings.durations).phase); });
 tick();
});
el('reset').addEventListener('click',reset);
form.addEventListener('submit',e => e.preventDefault());
form.addEventListener('change',e => {
 const target=e.target as HTMLInputElement;
 if (!form.checkValidity()) return;
 if (target.id==='preset') {
  settings.preset=input('preset').value as Preset;
  settings.durations=[...presets[settings.preset]] as Durations;
  reset();
 } else if (target.id.startsWith('duration-') || target.id==='minutes') {
  settings.durations=[0,1,2,3].map(i=>Number(input('duration-'+i).value)) as Durations;
  settings.minutes=Number(input('minutes').value);
  if (target.id.startsWith('duration-')) settings.preset='custom';
  settings=normalize(settings); reset();
 } else {
  settings.sound=input('sound').checked; settings.awake=input('awake').checked;
  settings.motion=input('motion').checked; settings.volume=Number(input('volume').value);
  wake(running && settings.awake);
  if (settings.sound && target.id==='sound') void prepareAudio();
 }
 syncForm(); save(); render(nowElapsed());
});
function setFocus(enabled: boolean) {
 document.body.classList.toggle('focus-view',enabled);
 focus.textContent=enabled?t.leave:t.focus; focus.setAttribute('aria-pressed',String(enabled));
 focus.focus();
}
focus.addEventListener('click',() => setFocus(!document.body.classList.contains('focus-view')));
document.addEventListener('keydown',e => { if (e.key==='Escape') setFocus(false); });
// A hidden tab pauses the exercise: never jump ahead or replay missed signals.
document.addEventListener('visibilitychange',() => {
 if (document.hidden && running) { elapsed=nowElapsed(); stop(); lastPhase=-1; render(); }
});
window.addEventListener('pagehide',() => { stop(); void audio?.close(); });
document.addEventListener('storage-enabled',save);
document.addEventListener('preferences-cleared',() => { try { localStorage.removeItem(KEY); } catch {} });
reduced.addEventListener('change',e => { if (e.matches) { settings.motion=false; syncForm(); render(nowElapsed()); } });
syncForm(); render();
