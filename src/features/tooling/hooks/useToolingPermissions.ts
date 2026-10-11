import { useMemo } from 'react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

/**
 * UI gating that mirrors the database tiers in `tooling_lock_for_actor`:
 * - canManage: org owner/admin (registration, approvals, limits, corrections,
 *   dispositions, return-to-service, master data).
 * - canOperate: owner/admin or team roles with `equipment.update` on the
 *   tool's team (issue, return, transfer, usage entry, inspection, quarantine).
 * The RPCs re-check every action; this only hides controls.
 */
export function useToolingPermissions(teamId?: string | null) {
  const { hasRole, hasPermission } = useUnifiedPermissions();
  return useMemo(() => {
    const canManage = hasRole(['owner', 'admin']);
    const canOperate = canManage || hasPermission('equipment.edit', { teamId: teamId ?? undefined });
    return { canManage, canOperate };
  }, [hasRole, hasPermission, teamId]);
}
