import type { SeasonalLocation } from '../lib/seasonal-location';

export function createSeasonalLocation(root: HTMLElement, changed: () => void) {
  const toggle = root.querySelector<HTMLInputElement>('#seasonal-location')!;
  const hemisphere = root.querySelector<HTMLSelectElement>('select[name=hemisphere]')!;
  const manual = [...root.querySelectorAll<HTMLInputElement>('input[name=seasonalMode]:not(#seasonal-location)')];
  const status = root.querySelector<HTMLElement>('#seasonal-location-status')!;
  const text = JSON.parse(root.dataset.locationText!);
  let location: SeasonalLocation | undefined, request = 0;
  function clear() {
    request++; location = undefined; toggle.checked = false; status.textContent = '';
    manual.forEach(radio => radio.checked = radio.value === hemisphere.value);
  }
  manual.forEach(radio => radio.addEventListener('change', () => {
    if(!radio.checked) return;
    hemisphere.value=radio.value; clear(); changed();
  }));
  clear();
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    clear();
    if (!enabled) { changed(); return; }
    toggle.checked = true;
    if (!window.isSecureContext || !navigator.geolocation) {
      toggle.checked = false; status.textContent = text.unavailable; changed(); return;
    }
    const token = request;
    status.textContent = text.pending;
    navigator.geolocation.getCurrentPosition(position => {
      if (token !== request || !toggle.checked) return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        clear(); status.textContent = text.failed; changed(); return;
      }
      location = { latitude, longitude };
      status.textContent = ''; changed();
    }, error => {
      if (token !== request) return;
      clear(); status.textContent = error.code === 1 ? text.denied : error.code === 3 ? text.timeout : text.failed;
      changed();
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
    changed();
  });
  return { get location() { return location; }, clear, setActive(active: boolean) { if (!active) clear(); } };
}
