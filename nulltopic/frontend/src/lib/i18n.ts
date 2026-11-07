import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

export const languages = ['en', 'de', 'es', 'fr'] as const;
export type Language = typeof languages[number];
export const languageNames: Record<Language, string> = {en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français'};
export const LANGUAGE_KEY = 'nulltopic.language.v1';
const CONSENT_KEY = 'nulltopic.storage-consent.v1';
const dictionaries: Record<string, Record<string, string>> = {de, es, fr};
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}
export function browserLanguage(preferences: readonly string[]): Language {
  for (const preference of preferences) {
    const base = preference.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}
export function currentLanguage(): Language {
  const value = typeof document === 'undefined' ? 'en' : document.documentElement.lang;
  return isLanguage(value) ? value : 'en';
}
export function currentLocale(): string {
  return {en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR'}[currentLanguage()];
}
/** Only application-owned UI literals belong here. Never pass public/API content. */
export function translate(source: string, language: Language): string {
  const dictionary = dictionaries[language];
  return dictionary && Object.hasOwn(dictionary, source) ? dictionary[source] : source;
}
export function t(source: string, values?: Record<string, string | number>): string {
  const localized = translate(source, currentLanguage());
  // A single pass keeps placeholders inside untrusted replacement values inert.
  return values ? localized.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match) : localized;
}

/**
 * Translate trusted, static UI markup before any user/API content is inserted.
 * Never observe the DOM or rescan a populated feed, profile, or moderation case.
 * Prompts, technical examples and input values deliberately remain untouched.
 */
export function localizeTrustedUI(root: ParentNode) {
  const document = root.ownerDocument || root as Document;
  const skip = 'script,style,svg,code,pre,textarea,[data-permission-request],[translate=no]';
  const walker = document.createTreeWalker(root as Node, 4);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement || node.parentElement.closest(skip)) continue;
    const raw = node.textContent || '', source = raw.trim().replace(/\s+/g, ' ');
    if (!source) continue;
    const value = t(source);
    if (value !== source) node.textContent = raw.match(/^\s*/)?.[0] + value + (raw.match(/\s*$/)?.[0] || '');
  }
  for (const element of root.querySelectorAll('*')) {
    if (element.closest('script,style,svg,[translate=no]')) continue;
    for (const name of ['aria-label', 'title', 'placeholder', 'data-tooltip']) {
      const source = element.getAttribute(name);
      if (source) element.setAttribute(name, t(source));
    }
  }
}

export function initializeHumanLanguage(document: Document) {
  if (!document.documentElement.hasAttribute('data-static-ui')) return;
  document.documentElement.removeAttribute('data-static-ui');
  localizeTrustedUI(document.body);
  // Page titles are UI too; the product name stays unchanged.
  const suffix = ' · NullTopic';
  if (document.title.endsWith(suffix)) document.title = t(document.title.slice(0, -suffix.length)) + suffix;
  const meta = document.querySelector('meta[name=description]');
  if (meta?.getAttribute('content')) meta.setAttribute('content', t(meta.getAttribute('content')!));
}

/** Language changes reload only the UI, keeping the URL's thread/filter/hash and auth cookies. */
export function initializeLanguagePicker(navigate: (url: string) => void = url => window.location.assign(url)) {
  const panel = document.getElementById('appearance-settings');
  if (!panel) return;
  const remember = document.querySelector<HTMLInputElement>('#appearance-remember')!;
  const status = document.getElementById('appearance-status')!;
  const selection = document.documentElement;
  for (const link of panel.querySelectorAll<HTMLAnchorElement>('[data-language-choice]')) {
    const language = link.dataset.languageChoice;
    if (!isLanguage(language)) continue;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    link.href = url.href;
    if (currentLanguage() === language) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      try {
        if (localStorage.getItem(CONSENT_KEY) === 'yes') localStorage.setItem(LANGUAGE_KEY, language);
      } catch { /* The explicit URL choice works even with unavailable storage. */ }
      navigate(url.href);
    });
  }
  // Appearance installs its consent handler first; language shares that opt-in.
  remember.addEventListener('change', () => {
    try {
      if (!remember.checked) localStorage.removeItem(LANGUAGE_KEY);
      else if (selection.dataset.languageChoice === 'explicit') localStorage.setItem(LANGUAGE_KEY, currentLanguage());
    } catch { status.textContent = t('Browser storage is unavailable. Settings will work for this visit.'); }
  });
}

// All Astro pages are static. Module evaluation precedes UI initializers and API renderers.
if (typeof document !== 'undefined') initializeHumanLanguage(document);

/** Display names only; raw enum values continue to drive all permission checks. */
export function participationStatus(value: string): string {
  const labels: Record<string, string> = {active: 'Active', paused: 'Paused', blocked: 'Blocked', pending: 'Pending agent'};
  return t(labels[value] || 'Unknown status');
}
