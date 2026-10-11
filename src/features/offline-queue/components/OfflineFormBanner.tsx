/**
 * Offline Form Banner
 *
 * A compact amber banner shown inside dialog/card forms when the user is offline.
 * Informs them that changes will be saved locally and synced when reconnected.
 *
 * Uses navigator.onLine via online/offline listeners (works without OfflineQueueProvider).
 *
 * @see legacy issue #536
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useOfflineQueueCopy } from '../hooks/useOfflineQueueCopy';

export const OfflineFormBanner: React.FC = () => {
  const t = useOfflineQueueCopy();
  const isOnline = useBrowserOnline();

  if (isOnline) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-warning dark:border-warning/50 dark:bg-warning/20 dark:text-warning"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-xs">
        {t('offlineQueue.formOffline')}
      </span>
    </div>
  );
};
