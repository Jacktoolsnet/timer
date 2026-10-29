export type ThemeMode = 'auto' | 'light' | 'dark';
/** Keep the selected preference separate from the currently resolved theme. */
export function initializeTheme(onChoice: () => void) {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const buttons = {auto:document.getElementById('theme-auto'),light:document.getElementById('theme-light'),dark:document.getElementById('theme')};
  function apply() {
    const mode = root.dataset.themeMode as ThemeMode;
    const dark = mode === 'dark' || (mode === 'auto' && system.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    for (const [key, button] of Object.entries(buttons)) button?.setAttribute('aria-pressed',String(key === mode));
    document.dispatchEvent(new CustomEvent('theme-change',{detail:dark}));
  }
  if (!['auto','light','dark'].includes(root.dataset.themeMode || '')) root.dataset.themeMode = 'auto';
  apply();
  for (const [mode,button] of Object.entries(buttons)) button?.addEventListener('click',() => {
    root.dataset.themeMode = mode;
    apply();
    onChoice();
  });
  system.addEventListener('change',() => { if (root.dataset.themeMode === 'auto') apply(); });
}
