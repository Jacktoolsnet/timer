import {Stopwatch, formatElapsed} from '../lib/stopwatch';
import {screenWakeLock} from '../lib/wake-lock';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
const $ = (id: string) => document.getElementById(id)!;
const t = JSON.parse($('stopwatch-app').dataset.text!);
const timer = new Stopwatch();
const start = $('toggle-timing') as HTMLButtonElement;
const lap = $('lap') as HTMLButtonElement;
const reset = $('reset-timing') as HTMLButtonElement;
const awake = $('awake') as HTMLInputElement;
const wake = screenWakeLock($('wake-status'), t.wakeActive, t.unavailable);
// Wall-clock timestamps include time spent in background tabs and device sleep.
// Device clock adjustments remain a documented limitation.
const now = () => Date.now();
try { if (storageAllowed()) awake.checked = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.awake === true; } catch {}
function save() {
 if (!storageAllowed()) return;
 try {localStorage.setItem(STORAGE_KEY, JSON.stringify({awake: awake.checked}));}
 catch {$('wake-status').textContent = t.storageError;}
}
function render() {$('elapsed').textContent = formatElapsed(timer.elapsed(now()));}
function sync() {
 start.textContent = timer.running ? t.pause : timer.elapsed(now()) > 0 ? t.resume : t.start;
 start.disabled = false; lap.disabled = !timer.running;
 reset.disabled = timer.running || (timer.elapsed(now()) === 0 && !timer.laps.length);
 $('measurement-status').textContent = timer.running ? t.running : timer.elapsed(now()) > 0 ? t.paused : t.ready;
 wake(awake.checked && timer.running); render();
}
function toggle() {timer.running ? timer.pause(now()) : timer.start(now()); sync();}
function capture() {
 const item = timer.lap(now()); if (!item) return;
 const row = document.createElement('tr');
 for (const value of [String(timer.laps.length),formatElapsed(item.duration),formatElapsed(item.elapsed)]) {
 const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
 }
 $('laps-body').prepend(row); $('laps-table').hidden = false; $('empty-laps').hidden = true;
 $('lap-status').textContent = `${t.lap} ${timer.laps.length}: ${formatElapsed(item.duration)}`;
}
start.addEventListener('click', toggle); lap.addEventListener('click', capture);
reset.addEventListener('click', () => {
 if (timer.running || !window.confirm(t.confirm)) return;
 timer.reset(); $('laps-body').replaceChildren(); $('laps-table').hidden = true; $('empty-laps').hidden = false; $('lap-status').textContent = ''; sync();
});
awake.addEventListener('change', () => {wake(awake.checked && timer.running); save();});
document.addEventListener('storage-enabled', save);
document.addEventListener('preferences-cleared', () => {awake.checked = false; wake(false);});
let ownsFullscreen = false;
function focus(enabled: boolean) {
 document.body.classList.toggle('focus-view', enabled);
 $('stopwatch-focus').setAttribute('aria-pressed', String(enabled));
 $('stopwatch-focus').textContent = enabled ? t.exitFocus : t.focusMode;
}
async function leave() {focus(false); if (ownsFullscreen && document.fullscreenElement) {ownsFullscreen=false; await document.exitFullscreen().catch(()=>{});}}
$('stopwatch-focus').addEventListener('click', async () => {
 if (document.body.classList.contains('focus-view')) return leave();
 focus(true);
 if (!document.fullscreenElement) try {await document.documentElement.requestFullscreen(); ownsFullscreen=true; if (!document.body.classList.contains('focus-view')) await leave();} catch {}
});
document.addEventListener('fullscreenchange', () => {if (!document.fullscreenElement) {ownsFullscreen=false; focus(false);}});
document.addEventListener('keydown', e => {
 if (e.key === 'Escape') {void leave(); return;}
 if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || document.querySelector('dialog[open]') || document.querySelector('details.palette-dropdown[open]')) return;
 if ((e.target as HTMLElement).closest('button,a,input,select,textarea,summary,[contenteditable]')) return;
 if (e.code === 'Space') {e.preventDefault(); toggle();}
 if (e.key.toLowerCase() === 'l') {e.preventDefault(); capture();}
});
window.addEventListener('beforeunload', e => {if (timer.running || timer.elapsed(now()) > 0 || timer.laps.length) {e.preventDefault();}});
window.addEventListener('pageshow', sync);
sync(); setInterval(() => {if (!document.hidden && timer.running) render();}, 30);
document.addEventListener('visibilitychange', () => {if (!document.hidden) render();});
