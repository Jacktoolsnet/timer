export function renderPlayButton(button: HTMLElement, running: boolean, label: string) {
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = running
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" stroke-width="4"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/></svg>';
}
