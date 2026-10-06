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
const endButton = el('end-session') as HTMLButtonElement;
const skipButton = el('skip-hold') as HTMLButtonElement;
const firstDialog = el('first-start-dialog') as HTMLDialogElement;
const safetyDialog = el('safety-dialog') as HTMLDialogElement;
const progress = document.getElementById('session-progress') as unknown as SVGSVGElement;
const ring = el('session-ring-progress');
function sessionProgress(time: number, total: number) {
 progress.style.display = total ? '' : 'none';
 progress.setAttribute('aria-valuemax',String(total || 1));
 progress.setAttribute('aria-valuenow',String(Math.min(time,total)));
 ring.style.strokeDashoffset = String(total ? 100*(1-Math.min(time/total,1)) : 100);
}
const KEY = 'jacktools.breathe.settings.v1';
let settings: Settings = normalize(defaults);
try { if (storageAllowed()) settings = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch {}
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (reduced.matches) settings.motion = false;
let running = false, elapsed = 0, anchor = 0, frame = 0, lastPhase = -1, finished = false;
let audio: AudioContext | null = null;
let soundGeneration = 0;
const wake = screenWakeLock(el('wake-status'), '', t.awakeOff);
function save() {
 if (!storageAllowed()) return;
 try { localStorage.setItem(KEY,JSON.stringify(settings)); } catch { el('storage-status').textContent = document.querySelector<HTMLElement>('#clear-storage')!.dataset.error!; }
}
function syncForm() {
 input('preset').value = settings.preset;
 el('preset-selected').textContent = t.presets[Object.keys(presets).indexOf(settings.preset)]!;
 document.querySelectorAll<HTMLInputElement>('[name="breathing-preset"]').forEach(radio => { radio.checked = radio.value === settings.preset; });
 settings.durations.forEach((n,i) => input('duration-'+i).value = String(n));
 input('minutes').value = String(settings.minutes);
 input('count-seconds').value = String(settings.countSeconds);
 for (const key of ['sound','chime','awake','motion'] as const) input(key).checked = settings[key];
 el('preset-description').textContent = t.descriptions[Object.keys(presets).indexOf(settings.preset)]!;
 el('holds-hint').hidden = settings.durations[1] === 0 && settings.durations[3] === 0;
 el('pattern-name').textContent = t.presets[Object.keys(presets).indexOf(settings.preset)]!;
}
async function prepareAudio() {
 if (!settings.sound && !settings.chime) return;
 try {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') await audio.resume();
  el('audio-status').textContent = audio.state === 'running' ? '' : t.audioError;
 } catch { el('audio-status').textContent = t.audioError; }
}
const activeSounds = new Set<AudioScheduledSourceNode>();
function silence() {
 for(const source of activeSounds) { try { source.stop(); } catch {} }
 activeSounds.clear();
}
function tone(phase: number, duration = settings.durations[phase]!*settings.countSeconds) {
 if (!(phase === 0 || phase === 2 ? settings.sound : settings.chime) || !audio || audio.state !== 'running' || document.hidden) return;
 try {
  const now = audio.currentTime, gain = audio.createGain();
  let source: AudioScheduledSourceNode;
  let filter: BiquadFilterNode | null = null;
  if (phase === 0 || phase === 2) {
   // Filtered noise follows the whole inhale/exhale rather than a short beep.
   const buffer = audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
   const data = buffer.getChannelData(0);
   // Correlated noise softens the sharp, hissy high-frequency texture.
   let previous=0;
   for (let i=0;i<data.length;i++) {
    previous=.55*previous+.45*(Math.random()*2-1);
    data[i]=previous;
   }
   const noise = audio.createBufferSource(); noise.buffer=buffer; noise.loop=true;
   filter=audio.createBiquadFilter(); filter.type='lowpass'; filter.Q.value=.5;
   filter.frequency.setValueAtTime(phase===0?800:1150,now);
   filter.frequency.linearRampToValueAtTime(phase===0?1150:700,now+duration);
   noise.connect(filter); filter.connect(gain); source=noise;
   // Softer overall level; volume follows the direction of the breath.
   const peak = .16;
   const edge = Math.min(.08,duration/10);
   const release = Math.min(.35,duration*.3);
   gain.gain.setValueAtTime(0,now);
   if (phase === 0) {
    gain.gain.linearRampToValueAtTime(.008,now+edge);
    gain.gain.linearRampToValueAtTime(peak,now+duration-release);
    gain.gain.linearRampToValueAtTime(0,now+duration);
   } else {
    gain.gain.linearRampToValueAtTime(peak,now+edge);
    gain.gain.linearRampToValueAtTime(0,now+duration);
   }
  } else {
   const oscillator=audio.createOscillator(); oscillator.type='sine';
   oscillator.frequency.value=phase===1?523.25:261.63;
   oscillator.connect(gain); source=oscillator; duration=.6;
   gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(.08,now+.06);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  }
  gain.connect(audio.destination); activeSounds.add(source);
  source.onended=()=>{ source.disconnect(); filter?.disconnect(); gain.disconnect(); activeSounds.delete(source); };
  source.start(now); source.stop(now+duration);
 } catch { el('audio-status').textContent=t.audioError; }
}
async function playCurrentSound(preview?: 'sound' | 'chime') {
 const generation=++soundGeneration;
 await prepareAudio();
 if(generation!==soundGeneration) return;
 silence();
 if(running) {
  const state=breathAt(nowElapsed(),settings.durations,settings.countSeconds);
  tone(state.phase,state.remaining*settings.countSeconds);
  if(state.phase === 0 || state.phase === 2) tone(1);
 } else if(preview) tone(preview === 'sound' ? 0 : 1,1.2);
}
function nowElapsed() { return running ? elapsed+(performance.now()-anchor)/1000 : elapsed; }
function render(time = elapsed) {
 const state = breathAt(time,settings.durations,settings.countSeconds);
 const total = settings.minutes*60;
 const tile = document.querySelector<HTMLElement>('.breath-caption')!;
 tile.dataset.phase = running ? String(state.phase) : 'ready';
 el('tile-phase').textContent = finished ? t.ended : !running && elapsed ? t.paused : t.phases[state.phase]!.split(' · ')[0]!;

 if (running && total && time >= total) {
  endSession(total,true);
  return;
 }
 endButton.disabled = !running && !elapsed || finished;
 (el('reset') as HTMLButtonElement).hidden = running;
 skipButton.hidden = !running || (state.phase !== 1 && state.phase !== 3);
 el('session-status').textContent = finished ? t.natural : '';
 if (state.phase !== lastPhase) {
  el('phase').textContent = finished ? t.done : running ? t.phases[state.phase]! : elapsed ? t.paused : t.ready;
  if (running && time > 0.05) {
   silence(); tone(state.phase);
   if(state.phase === 0 || state.phase === 2) tone(1);
  }
  lastPhase = state.phase;
 }
 el('count').textContent = finished ? '–' : String(Math.ceil(state.remaining));
 el('breath-circle').style.transform = 'scale('+(finished ? .48 : settings.motion ? state.scale : .75)+')';
 el('round').textContent = t.round+' '+state.round;
 const left = Math.max(0,Math.ceil(total-time));
 el('session').textContent = total ? t.remaining+' '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0') : '∞';
 sessionProgress(time,total);
}
function tick() { render(nowElapsed()); if (running) frame=requestAnimationFrame(tick); }
function startLabel(label: string, paused = false) {
 start.setAttribute('aria-label',label); start.title=label;
 el('start-icon').setAttribute('d',paused ? 'M7 5h4v14H7Zm6 0h4v14h-4Z' : 'm8 5 11 7-11 7Z');
}
function stop() {
 running=false; soundGeneration++; silence(); cancelAnimationFrame(frame); wake(false);
 startLabel(elapsed && !finished ? t.resume : t.start);
}
function reset() { stop(); elapsed=0; finished=false; lastPhase=-1; startLabel(t.start); render(); }
function pauseSession() {
 if (!running) return;
 elapsed=nowElapsed(); stop(); lastPhase=-1; render();
}
function beginSession() {
 if (!form.reportValidity() || document.hidden) return;
 if (finished) { elapsed=0; finished=false; }
 running=true; anchor=performance.now(); lastPhase=-1; startLabel(t.pause,true);
 wake(settings.awake); void playCurrentSound(); tick();
}
function completionTone() {
 if (!settings.chime || !audio || audio.state !== 'running' || document.hidden) return;
 try {
  const now=audio.currentTime;
  // A quiet resolving chord, not a reward or a prompt to continue.
  for(const frequency of [261.63,392]) {
   const oscillator=audio.createOscillator(), gain=audio.createGain();
   oscillator.type='sine'; oscillator.frequency.value=frequency;
   gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(.035,now+.12);
   gain.gain.exponentialRampToValueAtTime(.0001,now+1.4);
   oscillator.connect(gain); gain.connect(audio.destination);
   activeSounds.add(oscillator);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();activeSounds.delete(oscillator);};
   oscillator.start(now); oscillator.stop(now+1.45);
  }
 } catch { el('audio-status').textContent=t.audioError; }
}
function endSession(time = nowElapsed(), completed = false) {
 elapsed=time; finished=true; stop(); lastPhase=-1; render();
 if(completed) completionTone();
}
start.addEventListener('click',() => {
 if (running) { pauseSession(); return; }
 if (!form.reportValidity()) { if (document.body.classList.contains('focus-view')) void leaveFocus(); return; }
 if (!settings.safetySeen) { soundGeneration++; silence(); firstDialog.showModal(); return; }
 beginSession();
});
el('safety-continue').addEventListener('click',() => {
 settings.safetySeen=true; save(); firstDialog.close(); beginSession();
});
firstDialog.addEventListener('close',() => start.focus());
el('safety-open').addEventListener('click',() => {
 // Guidance never hides a running exercise; resuming always needs a user action.
 pauseSession(); soundGeneration++; silence(); safetyDialog.showModal();
});
safetyDialog.addEventListener('close',() => el('safety-open').focus());
endButton.addEventListener('click',() => { endSession(); start.focus(); });
skipButton.addEventListener('click',() => {
 if (!running) return;
 const time=nowElapsed();
 const state=breathAt(time,settings.durations,settings.countSeconds);
 if(state.phase !== 1 && state.phase !== 3) return;
 elapsed=time+state.remaining*settings.countSeconds+0.000001;
 anchor=performance.now(); lastPhase=-1; render(elapsed); start.focus();
});
el('reset').addEventListener('click',reset);
form.addEventListener('submit',e => e.preventDefault());
const picker = el('preset-picker') as HTMLDetailsElement;
document.querySelectorAll<HTMLInputElement>('[name="breathing-preset"]').forEach(radio => radio.addEventListener('change',() => {
 input('preset').value=radio.value;
 input('preset').dispatchEvent(new Event('change',{bubbles:true}));
 picker.open=false; picker.querySelector('summary')!.focus();
}));
document.addEventListener('click',e => { if (!picker.contains(e.target as Node)) picker.open=false; });
picker.addEventListener('keydown',e => { if (e.key==='Escape') { picker.open=false; picker.querySelector('summary')!.focus(); } });
form.addEventListener('change',e => {
 const target=e.target as HTMLInputElement;
 if (!form.checkValidity()) return;
 if (target.id==='preset') {
  settings.preset=input('preset').value as Preset;
  settings.durations=[...presets[settings.preset]] as Durations;
  reset();
 } else if (target.id.startsWith('duration-') || target.id==='minutes' || target.id==='count-seconds') {
  settings.durations=[0,1,2,3].map(i=>Number(input('duration-'+i).value)) as Durations;
  settings.minutes=Number(input('minutes').value);
  settings.countSeconds=Number(input('count-seconds').value);
  if (target.id.startsWith('duration-')) settings.preset='custom';
  settings=normalize(settings); reset();
 } else {
  settings.sound=input('sound').checked; settings.chime=input('chime').checked; settings.awake=input('awake').checked;
  settings.motion=input('motion').checked;
  wake(running && settings.awake);
  if (target.id==='sound' || target.id==='chime') {
   soundGeneration++; silence();
   if(settings.sound || settings.chime) void playCurrentSound(settings[target.id] ? target.id : undefined);
   else el('audio-status').textContent='';
  }
 }
 syncForm(); save(); render(nowElapsed());
});
function setFocus(enabled: boolean) {
 document.body.classList.toggle('focus-view',enabled);
 focus.querySelector('span')!.textContent=enabled?t.leave:t.focus;
 focus.setAttribute('aria-label',enabled?t.leave:t.focus); focus.title=enabled?t.leave:t.focus; focus.setAttribute('aria-pressed',String(enabled));
 focus.focus();
}
let ownsFullscreen = false;
let requestingFullscreen = false;
async function leaveFocus() {
 setFocus(false);
 if (ownsFullscreen && document.fullscreenElement) {
  try { await document.exitFullscreen(); } catch { /* Browser controls can still exit fullscreen. */ }
 }
}
async function toggleFocus() {
 if (document.body.classList.contains('focus-view')) { await leaveFocus(); return; }
 setFocus(true);
 // Do not take ownership of fullscreen entered through another browser control.
 if (document.fullscreenElement || requestingFullscreen || !document.documentElement.requestFullscreen) return;
 requestingFullscreen=true;
 try {
  await document.documentElement.requestFullscreen();
  ownsFullscreen=document.fullscreenElement === document.documentElement;
  if (!document.body.classList.contains('focus-view') && ownsFullscreen) await document.exitFullscreen();
 } catch { /* Keep in-page focus usable when fullscreen is denied or unsupported. */ }
 finally { requestingFullscreen=false; }
}
focus.addEventListener('click',() => { void toggleFocus(); });
document.addEventListener('fullscreenchange',() => {
 if (requestingFullscreen && document.fullscreenElement === document.documentElement) ownsFullscreen=true;
 if (!document.fullscreenElement && ownsFullscreen) { ownsFullscreen=false; setFocus(false); }
});
document.addEventListener('keydown',e => {
 if (e.key==='Escape' && !firstDialog.open && !safetyDialog.open) void leaveFocus();
});
// A hidden tab pauses the exercise: never jump ahead or replay missed signals.
document.addEventListener('visibilitychange',() => {
 if (document.hidden) { pauseSession(); soundGeneration++; silence(); }
});
window.addEventListener('pagehide',() => { stop(); void audio?.close(); });
document.addEventListener('storage-enabled',save);
document.addEventListener('preferences-cleared',() => { try { localStorage.removeItem(KEY); } catch {} });
reduced.addEventListener('change',e => { if (e.matches) { settings.motion=false; syncForm(); render(nowElapsed()); } });
syncForm(); render();
