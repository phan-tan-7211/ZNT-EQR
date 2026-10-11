/**
 * Shared "your change was not saved" signal for Facility Map persistence.
 *
 * Plans, plan history and sketch documents all live in localStorage, whose
 * ~5-10MB per-origin quota fills up with plan images. A quota error must not
 * crash the page (these writes run inside state updaters and effects), but a
 * save that silently didn't happen means work lost on the next reload. So
 * writers swallow the error and call `reportSaveFailure()`; the mounted page
 * registers a notifier (it owns i18n and the toast). The notice is deferred
 * out of render and throttled so one burst of failing writes shows once.
 */

export const isQuotaExceeded = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

const SAVE_FAILURE_NOTICE_INTERVAL_MS = 5000;
let saveFailureNotifier: (() => void) | null = null;
let lastSaveFailureNoticeAt = 0;

export function setSaveFailureNotifier(notifier: (() => void) | null): void {
  saveFailureNotifier = notifier;
}

export function reportSaveFailure(): void {
  const now = Date.now();
  if (!saveFailureNotifier || now - lastSaveFailureNoticeAt < SAVE_FAILURE_NOTICE_INTERVAL_MS) return;
  lastSaveFailureNoticeAt = now;
  const notify = saveFailureNotifier;
  setTimeout(notify, 0);
}
