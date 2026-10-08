import './focus-cursor';
import { storageAllowed, CONSENT_KEY } from '../lib/storage';
import { STORAGE_KEY, type ColorScheme } from '../lib/engine';
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
const lightTheme = document.querySelector<HTMLButtonElement>('#theme-light')!;
function syncTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  theme.setAttribute('aria-pressed', String(dark));
  lightTheme.setAttribute('aria-pressed', String(!dark));
}
function setTheme(dark: boolean) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  syncTheme();
  persistAppearance();
  document.dispatchEvent(new CustomEvent('theme-change', { detail: dark }));
}
syncTheme();
theme.addEventListener('click', () => setTheme(true));
lightTheme.addEventListener('click', () => setTheme(false));
const dialog = document.querySelector<HTMLDialogElement>('#privacy-dialog')!;
document.querySelector('#privacy-open')?.addEventListener('click', () => dialog.showModal());
document.querySelector('#clear-storage')?.addEventListener('click', e => {
  try {
    localStorage.removeItem(CONSENT_KEY);
    remember.checked = false;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('jacktools.stopwatch.training.v1');
    localStorage.removeItem(APPEARANCE_KEY);
    document.querySelector('#privacy-status')!.textContent = (e.currentTarget as HTMLElement).dataset.message!;
    document.dispatchEvent(new Event('preferences-cleared'));
  } catch {
    document.querySelector('#privacy-status')!.textContent = (e.currentTarget as HTMLElement).dataset.error!;
  }
});

// Native details + radios retain keyboard and screen-reader support.
const paletteDropdown = document.querySelector<HTMLDetailsElement>('#palette-dropdown')!;
const paletteTrigger = paletteDropdown.querySelector('summary')!;
const paletteInputs = paletteDropdown.querySelectorAll<HTMLInputElement>('[name=colorScheme]');
function syncPalette() {
  const selected = document.documentElement.dataset.palette || 'terracotta';
  paletteInputs.forEach(input => { input.checked = input.value === selected; });
}
syncPalette();
paletteInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    const color = input.value as ColorScheme;
    document.documentElement.dataset.palette = color;
    syncPalette();
    document.dispatchEvent(new CustomEvent('palette-change', { detail: color }));
    persistAppearance();
  });
});
document.addEventListener('click', event => {
  if (!paletteDropdown.contains(event.target as Node)) paletteDropdown.open = false;
});
paletteDropdown.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    paletteDropdown.open = false;
    paletteTrigger.focus();
    event.preventDefault();
  }
  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
    paletteDropdown.open = false;
    paletteTrigger.focus();
    event.preventDefault();
  }
});
paletteDropdown.addEventListener('focusout', event => {
  // A pointer press on non-focusable menu space has relatedTarget=null.
  // Keep the panel mounted so the following click cannot hit a link below it.
  if (event.relatedTarget instanceof Node && !paletteDropdown.contains(event.relatedTarget)) {
    paletteDropdown.open = false;
  }
});

const languageLinks = [...document.querySelectorAll<HTMLAnchorElement>('.language-menu a')];
document.querySelector('#preferences-close')?.addEventListener('click', () => {
  paletteDropdown.open = false;
  paletteTrigger.focus();
});

const APPEARANCE_KEY = 'jacktools.stopwatch.appearance.v1';
function persistAppearance(language?: string) {
  if (!storageAllowed()) return;
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({
      language: language || (['en','de','es','fr'].includes(saved?.language) ? saved.language : document.documentElement.lang),
      dark: document.documentElement.dataset.theme === 'dark',
      colorScheme: document.documentElement.dataset.palette || 'terracotta',
      style: document.documentElement.dataset.style || 'warm',
      fontSize: Number(document.documentElement.dataset.fontSize || 0),
    }));
  } catch {
    const status = document.querySelector('#settings-status') || document.querySelector('#privacy-status');
    if (status) status.textContent = document.querySelector<HTMLElement>('#clear-storage')?.dataset.error || '';
  }
}
languageLinks.forEach(link => link.addEventListener('click', () => persistAppearance(link.lang)));
const styleInputs = paletteDropdown.querySelectorAll<HTMLInputElement>('[name=visualStyle]');
styleInputs.forEach(input => {
  input.checked = input.value === document.documentElement.dataset.style;
  input.addEventListener('change', () => {
    if (!input.checked) return;
    document.documentElement.dataset.style = input.value;
    persistAppearance();
  });
});

const fontSize = document.querySelector<HTMLInputElement>('#font-size')!;
const fontSizeValue = document.querySelector<HTMLOutputElement>('#font-size-value')!;
function syncFontSize() {
  const level = Number(document.documentElement.dataset.fontSize || 0);
  fontSize.value = String(level);
  const label = (100 + level * 10) + ' %';
  fontSizeValue.value = label;
  fontSize.setAttribute('aria-valuetext', label);
}
syncFontSize();
fontSize.addEventListener('input', () => {
  document.documentElement.dataset.fontSize = fontSize.value;
  syncFontSize();
  persistAppearance();
});

const remember = document.querySelector<HTMLInputElement>('#remember-preferences')!;
remember.checked = storageAllowed();
remember.addEventListener('change', () => {
  try {
    if (remember.checked) {
      localStorage.setItem(CONSENT_KEY, 'yes');
      persistAppearance();
      document.dispatchEvent(new Event('storage-enabled'));
    } else {
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('jacktools.stopwatch.training.v1');
      localStorage.removeItem(APPEARANCE_KEY);
      document.dispatchEvent(new Event('preferences-cleared'));
    }
  } catch {
    remember.checked = storageAllowed();
    document.querySelector('#storage-status')!.textContent = document.querySelector<HTMLElement>('#clear-storage')!.dataset.error!;
  }
});
