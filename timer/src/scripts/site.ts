import { STORAGE_KEY } from '../lib/engine';
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
