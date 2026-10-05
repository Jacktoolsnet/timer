import { screenWakeLock } from '../lib/wake-lock';
import { renderPlayButton } from '../lib/play-button';
import { storageAllowed } from '../lib/storage';
import { Timer, defaults, sanitizeSettings, formatTime, STORAGE_KEY, type Settings, type Mode, type ColorScheme } from '../lib/engine';
const app = document.querySelector<HTMLElement>('#timer-app')!;
const t = JSON.parse(app.dataset.translations!) as Record<string, string>;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings = { ...defaults };
try {
  const saved = sanitizeSettings(JSON.parse(storageAllowed() ? localStorage.getItem(STORAGE_KEY) || 'null' : 'null'));
  settings = saved;
} catch { /* Storage is optional. */ }
settings.dark = document.documentElement.dataset.theme === 'dark';
settings.colorScheme = (document.documentElement.dataset.palette || 'terracotta') as ColorScheme;
const timer = new Timer(app.dataset.mode as Mode, settings);
const form = $<HTMLFormElement>('settings-form');
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
const status = $('settings-status');
const originalTitle = document.title;
const wakeStatus = $('wake-status');
const setWake = screenWakeLock(wakeStatus, wakeStatus.dataset.active!, wakeStatus.dataset.unavailable!);
let audio: AudioContext | undefined;
function prepareAudio() {
  if (!settings.sound) return;
  try { audio ??= new AudioContext(); void audio.resume().catch(() => {}); } catch { /* Silent fallback. */ }
}
function chime() {
  if (!settings.sound || !audio || audio.state !== 'running') return;
  for (const [i, frequency] of [660, 880, 660].entries()) {
    const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + i * .22;
    osc.type = 'sine'; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.12, start + .02); gain.gain.exponentialRampToValueAtTime(.001, start + .5);
    osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .55);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}
function fillForm() {
  if (timer.mode === 'timer') {
    field('hours').value = String(Math.floor(settings.countdown / 3600));
    field('minutes').value = String(Math.floor(settings.countdown % 3600 / 60));
    field('seconds').value = String(settings.countdown % 60);
  } else for (const key of ['focus', 'short', 'long', 'rounds'] as const) field(key).value = String(settings[key]);
  field('sound').checked = settings.sound;
  field('awake').checked = settings.awake;
}
function persist(value: Settings = settings) {
  if (!storageAllowed()) { status.textContent = t.applied; return false; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch { status.textContent = t.storageError; return false; }
}
function render() {
  const running = timer.deadline !== null;
  setWake(running && settings.awake);
  const display = formatTime(timer.remaining);
  $('time').textContent = display;
  $('time').classList.toggle('has-hours', display.length > 5);
  renderPlayButton($('start'), running, running ? t.pause : timer.remaining < timer.total && !timer.completed ? t.resume : t.start);
  $('phase-label').textContent = timer.mode === 'timer' ? t.ready : t[timer.phase];
  app.dataset.phase = timer.mode === 'pomodoro' ? timer.phase : 'focus';
  $('ring-progress').style.strokeDashoffset = String(100 * (1 - timer.remaining / timer.total));
  if (timer.mode === 'pomodoro') {
    $('round-label').textContent = t.round + ' ' + timer.round + ' ' + t.of + ' ' + settings.rounds;
    $('round-dots').replaceChildren(...Array.from({ length: settings.rounds }, (_, i) => {
      const dot = document.createElement('i'); dot.className = i + 1 === timer.round ? 'current' : i + 1 < timer.round ? 'done' : ''; return dot;
    }));
    for (const key of ['focus','short','long'] as const) $('summary-' + key).textContent = String(settings[key]);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-minutes]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.minutes) * 60 === settings.countdown)));
  document.title = running || timer.completed || timer.remaining < timer.total ? display + ' · ' + (timer.mode === 'timer' ? t.countdown : t[timer.phase]) + ' · Jacktools' : originalTitle;
}
function finish() {
  $('timer-status').textContent = timer.mode === 'timer' ? t.finished : t.phaseFinished;
  chime();
}
$('start').removeAttribute('disabled');
$('start').addEventListener('click', () => {
  prepareAudio();
  if (timer.deadline !== null) { if (timer.pause(Date.now())) finish(); }
  else {
    if (timer.completed && timer.mode === 'pomodoro') timer.next();
    timer.start(Date.now()); $('timer-status').textContent = '';
  }
  render();
});
$('reset').addEventListener('click', () => { timer.reset(); $('timer-status').textContent = ''; render(); });
$('next')?.addEventListener('click', () => { timer.next(); $('timer-status').textContent = ''; render(); });
function restartWithSettings() {
  timer.settings = settings; timer.phase = 'focus'; timer.round = 1; timer.reset();
  $('timer-status').textContent = ''; render();
}
function readFormSettings(): Settings | null {
  if (!form.checkValidity()) return null;
  const next = { ...settings, sound: field('sound').checked, awake: field('awake').checked };
  if (timer.mode === 'timer') {
    next.countdown = Number(field('hours').value) * 3600 + Number(field('minutes').value) * 60 + Number(field('seconds').value);
    if (next.countdown < 1) return null;
  } else for (const key of ['focus','short','long','rounds'] as const) next[key] = Number(field(key).value);
  return sanitizeSettings(next);
}
form.addEventListener('input', () => {
  // Sound applies immediately; edited durations only affect a timer after Apply.
  settings.sound = field('sound').checked;
  const next = readFormSettings();
  if (!next) { status.textContent = t.invalid; return; }
  if (persist(next)) status.textContent = t.autoSaved;
});
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const next = readFormSettings();
  if (!next) { status.textContent = t.invalid; field('seconds')?.focus(); return; }
  settings = next;
  if (persist()) status.textContent = t.saved;
  prepareAudio(); restartWithSettings();
});
document.querySelectorAll<HTMLButtonElement>('[data-minutes]').forEach(button => button.addEventListener('click', () => {
  settings.countdown = Number(button.dataset.minutes) * 60;
  fillForm(); persist(); restartWithSettings();
}));
document.addEventListener('palette-change', ((e: CustomEvent<ColorScheme>) => {
  settings.colorScheme = e.detail;
}) as EventListener);
document.addEventListener('theme-change', ((e: CustomEvent<boolean>) => { settings.dark = e.detail; }) as EventListener);
document.addEventListener('preferences-cleared', () => { status.textContent = ''; });
const focusButton = $('focus-view');
let ownsFullscreen = false;
let requestingFullscreen = false;
function setFocusView(focused: boolean) {
  document.body.classList.toggle('focus-view', focused);
  focusButton.setAttribute('aria-pressed', String(focused));
  focusButton.setAttribute('aria-label', focused ? t.exitFocus : t.focusMode);
  focusButton.querySelector('span')!.textContent = focused ? t.exitFocus : t.focusMode;
}
async function leaveFocus() {
  setFocusView(false);
  if (ownsFullscreen && document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* Browser controls can still exit fullscreen. */ }
  }
}
async function toggleFocus() {
  if (document.body.classList.contains('focus-view')) {
    await leaveFocus();
    return;
  }
  setFocusView(true);
  // Keep pre-existing fullscreen (e.g. another browser control) untouched.
  if (document.fullscreenElement || requestingFullscreen || !document.documentElement.requestFullscreen) return;
  requestingFullscreen = true;
  try {
    await document.documentElement.requestFullscreen();
    ownsFullscreen = document.fullscreenElement === document.documentElement;
    // The user may already have left focus while the browser was responding.
    if (!document.body.classList.contains('focus-view') && ownsFullscreen) await document.exitFullscreen();
  } catch { /* Unsupported or denied: the in-page focus view still works. */ }
  finally { requestingFullscreen = false; }
}
focusButton.addEventListener('click', () => { void toggleFocus(); });
document.addEventListener('fullscreenchange', () => {
  if (requestingFullscreen && document.fullscreenElement === document.documentElement) ownsFullscreen = true;
  if (!document.fullscreenElement && ownsFullscreen) {
    ownsFullscreen = false;
    setFocusView(false);
    focusButton.focus();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('focus-view')) void leaveFocus();
});
function tick() { if (timer.tick(Date.now())) finish(); render(); }
setInterval(() => { if (timer.deadline !== null) tick(); }, 200);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
fillForm(); render();

document.addEventListener('storage-enabled', () => persist(readFormSettings() || settings));

field('awake').addEventListener('change', () => { settings.awake = field('awake').checked; persist(); render(); });
