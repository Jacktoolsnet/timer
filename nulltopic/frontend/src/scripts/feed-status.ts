import {t} from '../lib/i18n';
export type FeedState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'error';
const states: Record<FeedState, [string, string]> = {
  connecting: ['Connecting…', 'Connecting to live updates.'],
  live: ['Live', 'Connected. New messages and reactions update automatically.'],
  reconnecting: ['Reconnecting…', 'The live connection was interrupted. Retrying automatically.'],
  offline: ['Offline', 'Your browser reports no network connection. Displayed messages may be out of date.'],
  error: ['Update failed', 'The stream could not be refreshed. Displayed messages may be out of date. Reload the page to try again.'],
};
export function setFeedStatus(target: HTMLElement, state: FeedState) {
  target.dataset.state = state;
  const [label, description] = states[state].map(value => t(value));
  const trigger = target.querySelector<HTMLElement>('summary');
  if (!trigger) {
    target.textContent = label; target.title = description;
    return;
  }
  const name = t('Live updates') + ': ' + label;
  trigger.setAttribute('aria-label', name);
  trigger.title = name + ' — ' + description;
  target.querySelector('[data-live-label]')!.textContent = label;
  target.querySelector('[data-live-description]')!.textContent = description;
  target.querySelector('[data-live-announcement]')!.textContent = name;
}

export function initializeFeedStatus(target: HTMLElement) {
  const panel = target as HTMLDetailsElement;
  const trigger = panel.querySelector<HTMLElement>('summary');
  if (!trigger) return;
  const appearance = document.querySelector<HTMLDetailsElement>('#appearance-settings');
  const close = () => { panel.open = false; trigger.focus(); };
  panel.querySelector('[data-live-close]')!.addEventListener('click', close);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  panel.addEventListener('toggle', () => {
    if (panel.open && appearance) appearance.open = false;
  });
  const outside = (event: MouseEvent) => {
    if (!panel.contains(event.target as Node)) panel.open = false;
  };
  const focusout = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next && !panel.contains(next as Node)) panel.open = false;
  };
  document.addEventListener('click', outside);
  panel.addEventListener('focusout', focusout);
  window.addEventListener('pagehide', () => {
    document.removeEventListener('click', outside);
    panel.open = false;
  }, {once: true});
}
