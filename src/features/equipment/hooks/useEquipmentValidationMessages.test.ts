import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { I18nProvider, useI18n, type Language } from '@/i18n';
import { equipmentFormResources } from '@/i18n/equipmentFormResources';
import { defaultEquipmentValidationMessages } from '@/features/equipment/types/equipment';
import { useEquipmentValidationMessages } from './useEquipmentValidationMessages';

const expectedMessages = (language: Language) => {
  const copy = equipmentFormResources[language].equipmentForm;
  return {
    equipmentNameRequired: copy.validationEquipmentNameRequired,
    manufacturerRequired: copy.validationManufacturerRequired,
    modelRequired: copy.validationModelRequired,
    serialRequired: copy.validationSerialRequired,
    locationRequired: copy.validationLocationRequired,
    workingHoursNonNegative: copy.validationWorkingHoursNonNegative,
    teamRequired: copy.validationTeamRequired,
    nameRequired: copy.validationNameRequired,
    nameMax: copy.validationNameMax,
    teamCreatePermission: copy.validationTeamCreatePermission,
  };
};

describe('useEquipmentValidationMessages', () => {
  it('falls back to the English copy, which matches the schema defaults, without a provider', () => {
    const { result } = renderHook(() => useEquipmentValidationMessages());

    expect(result.current).toEqual(expectedMessages('en'));
    expect(result.current).toEqual(defaultEquipmentValidationMessages);
  });

  it('maps every message to its equipmentForm.validation* key in the active language', () => {
    window.localStorage.setItem('znteqr-language', 'vi');
    const { result } = renderHook(() => useEquipmentValidationMessages(), { wrapper: I18nProvider });

    expect(result.current).toEqual(expectedMessages('vi'));
  });

  it('keeps the same object across re-renders and rebuilds it when the language changes', () => {
    window.localStorage.setItem('znteqr-language', 'en');
    const { result, rerender } = renderHook(
      () => ({ messages: useEquipmentValidationMessages(), i18n: useI18n() }),
      { wrapper: I18nProvider },
    );
    const initial = result.current.messages;

    rerender();
    expect(result.current.messages).toBe(initial);

    act(() => {
      result.current.i18n.setLanguage('ko');
    });
    expect(result.current.messages).not.toBe(initial);
    expect(result.current.messages).toEqual(expectedMessages('ko'));
  });
});
