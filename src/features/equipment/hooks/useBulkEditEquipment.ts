import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { equipment as equipmentKeys } from '@/lib/queryKeys';
import {
  EquipmentService,
  type EquipmentUpdateData,
} from '@/features/equipment/services/EquipmentService';
import {
  createEquipmentFormSchema,
  type EquipmentRecord,
} from '@/features/equipment/types/equipment';
import { useEquipmentValidationMessages } from '@/features/equipment/hooks/useEquipmentValidationMessages';
import {
  useBulkEditCommitResult,
  type BulkEditCommitHookResult,
} from '@/hooks/useBulkEditCommitResult';
import { useBulkEditRowState } from '@/hooks/useBulkEditRowState';
import { useI18n } from '@/i18n';

export type EquipmentRowDelta = Partial<EquipmentRecord>;

export type UseBulkEditEquipmentResult = BulkEditCommitHookResult<
  EquipmentRecord,
  EquipmentRowDelta
>;

export const useBulkEditEquipment = (
  initialRows: EquipmentRecord[]
): UseBulkEditEquipmentResult => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const rowState = useBulkEditRowState<EquipmentRecord, EquipmentRowDelta>(initialRows);
  const { dirtyRows, clearSucceededDirtyFields } = rowState;

  const validationMessages = useEquipmentValidationMessages();

  const partialSchema = useMemo(
    () => createEquipmentFormSchema(validationMessages).partial(),
    [validationMessages],
  );

  const commitMutation = useMutation({
    mutationFn: async () => {
      const orgId = currentOrganization?.id;
      if (!orgId) {
        throw new Error(t('equipmentBulk.organizationNotSelected'));
      }

      const validUpdates: Array<{ id: string; data: EquipmentUpdateData }> = [];
      const validationFailures: Array<{ id: string; error: string }> = [];

      for (const [id, delta] of dirtyRows) {
        const parsed = partialSchema.safeParse(delta);
        if (!parsed.success) {
          const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ');
          validationFailures.push({ id, error: message || t('equipmentBulk.invalidValue') });
        } else {
          validUpdates.push({ id, data: parsed.data as EquipmentUpdateData });
        }
      }

      const result = await EquipmentService.batchUpdate(orgId, validUpdates);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? t('equipmentBulk.bulkUpdateFailed'));
      }

      const submittedById = new Map(
        validUpdates.map((u) => [u.id, u.data as Record<string, unknown>])
      );

      return {
        succeeded: result.data.succeeded,
        failed: [...validationFailures, ...result.data.failed],
        attempted: dirtyRows.size,
        submittedById,
      };
    },
    onSuccess: (summary) => {
      const { succeeded, failed, attempted, submittedById } = summary;
      if (failed.length === 0) {
        toast.success(t('equipmentBulk.updatedCount', { count: succeeded.length }));
      } else if (succeeded.length === 0) {
        toast.error(t('equipmentBulk.failedCount', { failed: failed.length, attempted }));
      } else {
        toast.warning(t('equipmentBulk.partialCount', {
          succeeded: succeeded.length,
          attempted,
          failed: failed.length,
        }));
      }

      if (succeeded.length > 0) {
        clearSucceededDirtyFields(succeeded, submittedById);
      }

      const orgId = currentOrganization?.id;
      if (orgId && succeeded.length > 0) {
        queryClient.invalidateQueries({ queryKey: equipmentKeys.list(orgId) });
        for (const id of succeeded) {
          queryClient.invalidateQueries({ queryKey: equipmentKeys.byId(orgId, id) });
        }
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('equipmentBulk.bulkUpdateFailed'));
    },
  });

  return useBulkEditCommitResult(rowState, commitMutation);
};
