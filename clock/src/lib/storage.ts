export const CONSENT_KEY = 'jacktools.clock.storage-consent.v1';
export function storageAllowed(): boolean {
  if(typeof document!=='undefined'&&document.documentElement.dataset.castReceiver==='true')return false;
  try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
  catch { return false; }
}
