export const CONSENT_KEY = 'jacktools.breathe.storage-consent.v1';
export function storageAllowed(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
  catch { return false; }
}
