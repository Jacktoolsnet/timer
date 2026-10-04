import { STORAGE_KEY, type ColorScheme } from '../lib/engine';
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
function syncTheme() { theme.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark')); }
syncTheme();
theme.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  syncTheme();
  persistAppearance();
  document.dispatchEvent(new CustomEvent('theme-change', { detail: dark }));
});
const dialog = document.querySelector<HTMLDialogElement>('#privacy-dialog')!;
document.querySelector('#privacy-open')?.addEventListener('click', () => dialog.showModal());
document.querySelector('#clear-storage')?.addEventListener('click', e => {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
    persistAppearance();
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

const languageDropdown = document.querySelector<HTMLDetailsElement>('#language-dropdown')!;
const languageTrigger = languageDropdown.querySelector('summary')!;
const languageLinks = [...languageDropdown.querySelectorAll<HTMLAnchorElement>('.language-menu a')];
document.addEventListener('click', event => {
  if (!languageDropdown.contains(event.target as Node)) languageDropdown.open = false;
});
languageDropdown.addEventListener('focusout', event => {
  if (!languageDropdown.contains(event.relatedTarget as Node | null)) languageDropdown.open = false;
});
languageDropdown.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    languageDropdown.open = false;
    languageTrigger.focus();
    event.preventDefault();
  }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    languageDropdown.open = true;
    const current = languageLinks.indexOf(document.activeElement as HTMLAnchorElement);
    let next = event.key === 'ArrowUp' ? (current <= 0 ? languageLinks.length - 1 : current - 1) : (current + 1) % languageLinks.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = languageLinks.length - 1;
    languageLinks[next]?.focus();
  }
});
for (const [dropdown, other] of [[languageDropdown, paletteDropdown], [paletteDropdown, languageDropdown]]) {
  dropdown.addEventListener('toggle', () => {
    if (dropdown.open) other.open = false;
  });
}

const APPEARANCE_KEY = 'jacktools.timer.appearance.v1';
function persistAppearance(language?: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({
      language: language || (['en','de','es','fr'].includes(saved?.language) ? saved.language : document.documentElement.lang),
      dark: document.documentElement.dataset.theme === 'dark',
      colorScheme: document.documentElement.dataset.palette || 'terracotta',
      style: document.documentElement.dataset.style || 'warm',
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
