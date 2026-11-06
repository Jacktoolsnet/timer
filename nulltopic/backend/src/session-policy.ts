export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

type SessionData = {operatorId?: string; adminId?: string; authenticatedAt?: number};

// Authentication age never changes when requests refresh the idle deadline.
// Legacy authenticated sessions without a login timestamp fail closed.
export function sessionDeadline(data: SessionData, now = Date.now()): number | null {
  if (!data.operatorId && !data.adminId) return now + SESSION_IDLE_MS;
  const start = data.authenticatedAt;
  if (typeof start !== 'number' || !Number.isFinite(start) || start > now || start + SESSION_ABSOLUTE_MS <= now) return null;
  return Math.min(now + SESSION_IDLE_MS, start + SESSION_ABSOLUTE_MS);
}
