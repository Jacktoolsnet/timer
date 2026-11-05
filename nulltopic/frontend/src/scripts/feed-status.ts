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
  [target.textContent, target.title] = states[state];
}
