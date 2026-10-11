/**
 * Pending Sync Banner
 *
 * A persistent alert banner shown at the top of the dashboard when there
 * are offline-queued items pending sync, or when the device is offline.
 *
 * States:
 * - Offline with items  → amber warning with item count
 * - Offline (no items)  → subtle offline indicator
 * - Online with pending → green call-to-action with "Sync Now"
 * - Syncing             → spinner with progress message
 * - Failed items        → red alert with "Retry" option
 *
 * @see legacy issue #536
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { useOfflineQueueCopy } from '../hooks/useOfflineQueueCopy';

export const PendingSyncBanner: React.FC = () => {
  const t = useOfflineQueueCopy();
  const {
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    syncNow,
    retryFailed,
    clearQueue,
  } = useOfflineQueue();

  const totalActionable = pendingCount + failedCount;

  // Nothing to show — fully synced and online
  if (isOnline && totalActionable === 0 && !isSyncing) {
    return null;
  }

  // ── Syncing state ──────────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <BannerWrapper variant="info">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">{t('offlineQueue.syncing')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t(pendingCount === 1 ? 'offlineQueue.syncingItem' : 'offlineQueue.syncingItems', { count: pendingCount })}
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Offline with queued items ──────────────────────────────────────────
  if (!isOnline && totalActionable > 0) {
    return (
      <BannerWrapper variant="warning">
        <WifiOff className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">{t('offlineQueue.offline')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t(totalActionable === 1 ? 'offlineQueue.savedLocallyOne' : 'offlineQueue.savedLocally', { count: totalActionable })}
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Offline (no items) ─────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <BannerWrapper variant="muted">
        <WifiOff className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertDescription className="text-xs">
            {t('offlineQueue.offlineEmpty')}
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Failed items ───────────────────────────────────────────────────────
  if (failedCount > 0) {
    return (
      <BannerWrapper variant="destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">{t('offlineQueue.syncIssue')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t(failedCount === 1 ? 'offlineQueue.failedItem' : 'offlineQueue.failedItems', { count: failedCount })}
            {pendingCount > 0 && t('offlineQueue.morePending', { count: pendingCount })}
          </AlertDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => retryFailed()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('offlineQueue.retry')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearQueue}
          >
            {t('offlineQueue.dismiss')}
          </Button>
        </div>
      </BannerWrapper>
    );
  }

  // ── Online with pending items ──────────────────────────────────────────
  if (pendingCount > 0) {
    return (
      <BannerWrapper variant="success">
        <Wifi className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">{t('offlineQueue.backOnline')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t(pendingCount === 1 ? 'offlineQueue.pendingItem' : 'offlineQueue.pendingItems', { count: pendingCount })}
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={() => syncNow()}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('offlineQueue.syncNow')}
        </Button>
      </BannerWrapper>
    );
  }

  return null;
};

// ─── Styled wrapper ──────────────────────────────────────────────────────────

type BannerVariant = 'info' | 'warning' | 'muted' | 'destructive' | 'success';

const variantStyles: Record<BannerVariant, string> = {
  info: 'border-info/30 bg-info/10 text-info dark:border-info/40 dark:bg-info/20 dark:text-info',
  warning: 'border-warning/30 bg-warning/10 text-warning dark:border-warning/50 dark:bg-warning/20 dark:text-warning',
  muted: 'border-muted bg-muted/50 text-muted-foreground',
  destructive: 'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/20',
  success: 'border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/20 dark:text-success',
};

const BannerWrapper: React.FC<{
  variant: BannerVariant;
  children: React.ReactNode;
}> = ({ variant, children }) => (
  <Alert
    className={`mx-2 mt-2 mb-0 flex items-center gap-3 py-2.5 px-4 ${variantStyles[variant]}`}
    role="status"
    aria-live="polite"
  >
    {children}
  </Alert>
);
