/** Requests a screen lock only on state changes, not on every timer tick. */
export function screenWakeLock(status: HTMLElement, active: string, unavailable: string) {
  let wanted = false;
  let lock: WakeLockSentinel | null = null;
  let pending = false;
  async function sync() {
    if (!wanted || document.hidden) {
      const old = lock; lock = null;
      status.textContent = '';
      if (old) await old.release().catch(() => {});
      return;
    }
    if (lock || pending) return;
    pending = true;
    try {
      if (!navigator.wakeLock) throw new Error('unsupported');
      const next = await navigator.wakeLock.request('screen');
      if (!wanted || document.hidden) { await next.release(); return; }
      lock = next;
      status.textContent = active;
      next.addEventListener('release', () => {
        if (lock === next) { lock = null; status.textContent = wanted && !document.hidden ? unavailable : ''; }
      });
    } catch { status.textContent = wanted && !document.hidden ? unavailable : ''; }
    finally { pending = false; }
  }
  document.addEventListener('visibilitychange', () => { void sync(); });
  window.addEventListener('pagehide', () => { wanted = false; void sync(); });
  return (enabled: boolean) => {
    if (wanted === enabled) return;
    wanted = enabled;
    void sync();
  };
}
