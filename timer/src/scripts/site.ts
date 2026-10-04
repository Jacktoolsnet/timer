import { STORAGE_KEY, sanitizeSettings, type ColorScheme } from '../lib/engine';
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
function syncTheme() { theme.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark')); }
syncTheme();
theme.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  syncTheme();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.remember === true) { saved.dark = dark; localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }
  } catch { /* Theme remains available without browser storage. */ }
  document.dispatchEvent(new CustomEvent('theme-change', { detail: dark }));
});
document.querySelector<HTMLSelectElement>('#language')?.addEventListener('change', e => {
  window.location.assign((e.target as HTMLSelectElement).value);
});
const dialog = document.querySelector<HTMLDialogElement>('#privacy-dialog')!;
document.querySelector('#privacy-open')?.addEventListener('click', () => dialog.showModal());
document.querySelector('#clear-storage')?.addEventListener('click', e => {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
const activePalette = document.querySelector<HTMLElement>('#active-palette')!;
function syncPalette() {
  const selected = document.documentElement.dataset.palette || 'terracotta';
  activePalette.dataset.color = selected;
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
    try {
      const saved = sanitizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
      if (saved.remember) {
        saved.colorScheme = color;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    } catch {
      const status = document.querySelector('#settings-status');
      const clearButton = document.querySelector<HTMLElement>('#clear-storage');
      if (status) status.textContent = clearButton?.dataset.error || '';
    }
  });
});
paletteInputs.forEach(input => input.addEventListener('click', event => {
  if (event.detail === 0) return; // Arrow-key selection keeps the picker open.
  paletteDropdown.open = false;
  paletteTrigger.focus();
}));
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
  if (!paletteDropdown.contains(event.relatedTarget as Node | null)) paletteDropdown.open = false;
});
