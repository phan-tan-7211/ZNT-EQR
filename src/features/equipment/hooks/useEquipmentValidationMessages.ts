import { useMemo } from 'react';
import type { EquipmentValidationMessages } from '@/features/equipment/types/equipment';
import { useI18n } from '@/i18n';

/**
 * Localized messages for the equipment zod schemas (`createEquipmentFormSchema`,
 * `createEquipmentValidationSchema`, `createQuickEquipmentSchema`). The object is
 * memoized on the active translator so schemas built from it stay stable.
 */
export const useEquipmentValidationMessages = (): EquipmentValidationMessages => {
  const { t } = useI18n();

  return useMemo<EquipmentValidationMessages>(() => ({
    equipmentNameRequired: t('equipmentForm.validationEquipmentNameRequired'),
    manufacturerRequired: t('equipmentForm.validationManufacturerRequired'),
    modelRequired: t('equipmentForm.validationModelRequired'),
    serialRequired: t('equipmentForm.validationSerialRequired'),
    locationRequired: t('equipmentForm.validationLocationRequired'),
    workingHoursNonNegative: t('equipmentForm.validationWorkingHoursNonNegative'),
    teamRequired: t('equipmentForm.validationTeamRequired'),
    nameRequired: t('equipmentForm.validationNameRequired'),
    nameMax: t('equipmentForm.validationNameMax'),
    teamCreatePermission: t('equipmentForm.validationTeamCreatePermission'),
  }), [t]);
};
