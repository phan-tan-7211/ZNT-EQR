import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en';
import vi from './locales/vi';
import ko from './locales/ko';
import { coreResources } from './coreResources';
import { dashboardWidgetResources } from './dashboardWidgetResources';
import { equipmentResources } from './equipmentResources';
import { equipmentFormResources } from './equipmentFormResources';
import { equipmentBulkResources } from './equipmentBulkResources';
import { equipmentAuxResources } from './equipmentAuxResources';
import { equipmentImportResources } from './equipmentImportResources';
import { equipmentLocationResources } from './equipmentLocationResources';
import { equipmentCustomAttributeResources } from './equipmentCustomAttributeResources';
import { equipmentDeleteResources } from './equipmentDeleteResources';
import { equipmentDetailsResources } from './equipmentDetailsResources';
import { equipmentPMResources } from './equipmentPMResources';
import { equipmentInsightsResources } from './equipmentInsightsResources';
import { equipmentQRScanResources } from './equipmentQRScanResources';
import { equipmentScanResources } from './equipmentScanResources';
import { equipmentGroupResources } from './equipmentGroupResources';
import { equipmentMediaResources } from './equipmentMediaResources';
import { equipmentMutationResources } from './equipmentMutationResources';
import { equipmentScannerResources } from './equipmentScannerResources';
import { equipmentPartsResources } from './equipmentPartsResources';
import { equipmentInlineResources } from './equipmentInlineResources';
import { equipmentListResources } from './equipmentListResources';
import { equipmentMobileResources } from './equipmentMobileResources';
import { equipmentFinalizeResources } from './equipmentFinalizeResources';
import { equipmentResidualResources } from './equipmentResidualResources';
import { inventoryListResources } from './inventoryListResources';
import { inventoryDetailResources } from './inventoryDetailResources';
import { workOrderResources } from './workOrderResources';
import { teamsListResources } from './teamsListResources';

import { pmTemplateResources } from './pmTemplateResources';
import { workOrderMobileResources } from './workOrderMobileResources';
import { operatorCheckinPublicResources } from './operatorCheckinPublicResources';
import { operatorCheckinAdminResources } from './operatorCheckinAdminResources';
import { workOrderFormResources } from './workOrderFormResources';
import { workOrderDetailResources } from './workOrderDetailResources';
import { workOrderOperationsResources } from './workOrderOperationsResources';
import { workOrderResidualResources } from './workOrderResidualResources';
import { workOrderActivityResources } from './workOrderActivityResources';
import { inventoryFormBulkResources } from './inventoryFormBulkResources';
import { alternateGroupListResources } from './alternateGroupListResources';
import { alternateGroupDetailResources } from './alternateGroupDetailResources';
import { organizationHubResources } from './organizationHubResources';
import { organizationMembersResources } from './organizationMembersResources';
import { organizationIntegrationsResources } from './organizationIntegrationsResources';
import { organizationAdminResources } from './organizationAdminResources';
import { teamsDetailResources } from './teamsDetailResources';
import { teamsCardsResources } from './teamsCardsResources';
import { teamsCustomerResources } from './teamsCustomerResources';
import { teamsFeedbackResources } from './teamsFeedbackResources';
import { fleetMapResources } from './fleetMapResources';
import { organizationImportResources } from './organizationImportResources';
import { workspaceOnboardingResources } from './workspaceOnboardingResources';
import { organizationNoticesResources } from './organizationNoticesResources';
import { partLookupResources } from './partLookupResources';
import { inventoryListAuxResources } from './inventoryListAuxResources';
import { workOrderTimelineNoteResources } from './workOrderTimelineNoteResources';
import { reportsResources } from './reportsResources';
import { quickFormsResources } from './quickFormsResources';
import { dsrResources } from './dsrResources';
import { ticketsResources } from './ticketsResources';
import { supportPrivacyResources } from './supportPrivacyResources';
import { workOrderExportUiResources } from './workOrderExportUiResources';
import { inventoryMutationResources } from './inventoryMutationResources';
import { productOnboardingResources } from './productOnboardingResources';
import { operatorCheckinDetailResources } from './operatorCheckinDetailResources';
import { operatorEquipmentResources } from './operatorEquipmentResources';
import { workOrderCalendarResources } from './workOrderCalendarResources';
import { notificationPageResources } from './notificationPageResources';
import { settingsPageResources } from './settingsPageResources';
import { offlineQueueResources } from './offlineQueueResources';
import { settingsFormsResources } from './settingsFormsResources';
import { settingsSecurityResources } from './settingsSecurityResources';
import { publicChromeResources } from './publicChromeResources';
import { invitationAcceptResources } from './invitationAcceptResources';
import { pmTemplateMutationResources } from './pmTemplateMutationResources';
import { landingSectionsResources } from './landingSectionsResources';
import { workOrderQRResources } from './workOrderQRResources';
import { marketingTrustResources } from './marketingTrustResources';
import { landingDetailResources } from './landingDetailResources';
import { authRouteResources } from './authRouteResources';
import { landingAnimationResources } from './landingAnimationResources';
import { publicFeaturePagesResources } from './publicFeaturePagesResources';
import { auditLogControlsResources } from './auditLogControlsResources';
import { workOrderFieldActionResources } from './workOrderFieldActionResources';
import { publicFeatureFleetBooksResources } from './publicFeatureFleetBooksResources';
import { notificationExtrasResources } from './notificationExtrasResources';
import { workOrderMobileSummaryResources } from './workOrderMobileSummaryResources';
import { authFlowResources } from './authFlowResources';
import { publicFeatureOpsResources } from './publicFeatureOpsResources';
import { auditExplorerResources } from './auditExplorerResources';
import { publicFeaturePmTeamsResources } from './publicFeaturePmTeamsResources';
import { workOrderAssignmentResources } from './workOrderAssignmentResources';
import { i18nAuditResources } from './i18nAuditResources';
import { termsOfServiceResources } from './termsOfServiceResources';
import { publicLegalResources } from './publicLegalResources';
import { privacyPolicyContentResources } from './privacyPolicyContentResources';
import { facilityMapResources } from './facilityMapResources';
import { toolingResources } from './toolingResources';
import { toolingMasterResources } from './toolingMasterResources';
import { toolingCompatibilityResources } from './toolingCompatibilityResources';
import { toolingOperationsResources } from './toolingOperationsResources';


export type Language = 'vi' | 'en' | 'ko';

const STORAGE_KEY = 'znteqr-language';

const resources = {

  vi: { ...vi, ...coreResources.vi, ...dashboardWidgetResources.vi, ...equipmentResources.vi, ...equipmentFormResources.vi, ...equipmentBulkResources.vi, ...equipmentAuxResources.vi, ...equipmentImportResources.vi, ...equipmentLocationResources.vi, ...equipmentCustomAttributeResources.vi, ...equipmentDeleteResources.vi, ...equipmentDetailsResources.vi, ...equipmentPMResources.vi, ...equipmentInsightsResources.vi, ...equipmentQRScanResources.vi, ...equipmentScanResources.vi, ...equipmentGroupResources.vi, ...equipmentMediaResources.vi, ...equipmentMutationResources.vi, ...equipmentScannerResources.vi, ...equipmentPartsResources.vi, ...equipmentInlineResources.vi, ...equipmentListResources.vi, ...equipmentMobileResources.vi, ...equipmentFinalizeResources.vi, ...equipmentResidualResources.vi, ...inventoryListResources.vi, ...inventoryDetailResources.vi, ...workOrderResources.vi, ...teamsListResources.vi, ...workOrderMobileResources.vi, ...pmTemplateResources.vi, ...operatorCheckinPublicResources.vi, ...operatorCheckinAdminResources.vi, ...workOrderFormResources.vi, ...workOrderDetailResources.vi, ...workOrderOperationsResources.vi, ...workOrderResidualResources.vi, ...workOrderActivityResources.vi, ...inventoryFormBulkResources.vi, ...alternateGroupListResources.vi, ...alternateGroupDetailResources.vi, ...organizationHubResources.vi, ...organizationMembersResources.vi, ...organizationIntegrationsResources.vi, ...organizationAdminResources.vi, ...teamsDetailResources.vi, ...teamsCardsResources.vi, ...teamsCustomerResources.vi, ...teamsFeedbackResources.vi, ...fleetMapResources.vi, ...organizationImportResources.vi, ...workspaceOnboardingResources.vi, ...organizationNoticesResources.vi, ...partLookupResources.vi, ...inventoryListAuxResources.vi, ...workOrderTimelineNoteResources.vi, ...reportsResources.vi, ...quickFormsResources.vi, ...dsrResources.vi, ...ticketsResources.vi, ...supportPrivacyResources.vi, ...workOrderExportUiResources.vi, ...inventoryMutationResources.vi, ...productOnboardingResources.vi, ...operatorCheckinDetailResources.vi, ...operatorEquipmentResources.vi, ...workOrderCalendarResources.vi, ...notificationPageResources.vi, ...settingsPageResources.vi, ...offlineQueueResources.vi, ...settingsFormsResources.vi, ...settingsSecurityResources.vi, ...publicChromeResources.vi, ...invitationAcceptResources.vi, ...pmTemplateMutationResources.vi, ...landingSectionsResources.vi, ...workOrderQRResources.vi, ...marketingTrustResources.vi, ...landingDetailResources.vi, ...authRouteResources.vi, ...landingAnimationResources.vi, ...auditLogControlsResources.vi, ...workOrderFieldActionResources.vi, ...notificationExtrasResources.vi, ...workOrderMobileSummaryResources.vi, ...authFlowResources.vi, ...auditExplorerResources.vi, ...workOrderAssignmentResources.vi, ...termsOfServiceResources.vi, ...publicLegalResources.vi, ...privacyPolicyContentResources.vi, ...facilityMapResources.vi, ...toolingResources.vi, ...toolingMasterResources.vi, ...toolingCompatibilityResources.vi, ...toolingOperationsResources.vi, publicFeatures: { ...publicFeaturePagesResources.vi.publicFeatures, ...publicFeatureFleetBooksResources.vi.publicFeatures, ...publicFeatureOpsResources.vi.publicFeatures, ...publicFeaturePmTeamsResources.vi.publicFeatures } },
  en: { ...en, ...coreResources.en, ...dashboardWidgetResources.en, ...equipmentResources.en, ...equipmentFormResources.en, ...equipmentBulkResources.en, ...equipmentAuxResources.en, ...equipmentImportResources.en, ...equipmentLocationResources.en, ...equipmentCustomAttributeResources.en, ...equipmentDeleteResources.en, ...equipmentDetailsResources.en, ...equipmentPMResources.en, ...equipmentInsightsResources.en, ...equipmentQRScanResources.en, ...equipmentScanResources.en, ...equipmentGroupResources.en, ...equipmentMediaResources.en, ...equipmentMutationResources.en, ...equipmentScannerResources.en, ...equipmentPartsResources.en, ...equipmentInlineResources.en, ...equipmentListResources.en, ...equipmentMobileResources.en, ...equipmentFinalizeResources.en, ...equipmentResidualResources.en, ...inventoryListResources.en, ...inventoryDetailResources.en, ...workOrderResources.en, ...teamsListResources.en, ...workOrderMobileResources.en, ...pmTemplateResources.en, ...operatorCheckinPublicResources.en, ...operatorCheckinAdminResources.en, ...workOrderFormResources.en, ...workOrderDetailResources.en, ...workOrderOperationsResources.en, ...workOrderResidualResources.en, ...workOrderActivityResources.en, ...inventoryFormBulkResources.en, ...alternateGroupListResources.en, ...alternateGroupDetailResources.en, ...organizationHubResources.en, ...organizationMembersResources.en, ...organizationIntegrationsResources.en, ...organizationAdminResources.en, ...teamsDetailResources.en, ...teamsCardsResources.en, ...teamsCustomerResources.en, ...teamsFeedbackResources.en, ...fleetMapResources.en, ...organizationImportResources.en, ...workspaceOnboardingResources.en, ...organizationNoticesResources.en, ...partLookupResources.en, ...inventoryListAuxResources.en, ...workOrderTimelineNoteResources.en, ...reportsResources.en, ...quickFormsResources.en, ...dsrResources.en, ...ticketsResources.en, ...supportPrivacyResources.en, ...workOrderExportUiResources.en, ...inventoryMutationResources.en, ...productOnboardingResources.en, ...operatorCheckinDetailResources.en, ...operatorEquipmentResources.en, ...workOrderCalendarResources.en, ...notificationPageResources.en, ...settingsPageResources.en, ...offlineQueueResources.en, ...settingsFormsResources.en, ...settingsSecurityResources.en, ...publicChromeResources.en, ...invitationAcceptResources.en, ...pmTemplateMutationResources.en, ...landingSectionsResources.en, ...workOrderQRResources.en, ...marketingTrustResources.en, ...landingDetailResources.en, ...authRouteResources.en, ...landingAnimationResources.en, ...auditLogControlsResources.en, ...workOrderFieldActionResources.en, ...notificationExtrasResources.en, ...workOrderMobileSummaryResources.en, ...authFlowResources.en, ...auditExplorerResources.en, ...workOrderAssignmentResources.en, ...termsOfServiceResources.en, ...publicLegalResources.en, ...privacyPolicyContentResources.en, ...facilityMapResources.en, ...toolingResources.en, ...toolingMasterResources.en, ...toolingCompatibilityResources.en, ...toolingOperationsResources.en, publicFeatures: { ...publicFeaturePagesResources.en.publicFeatures, ...publicFeatureFleetBooksResources.en.publicFeatures, ...publicFeatureOpsResources.en.publicFeatures, ...publicFeaturePmTeamsResources.en.publicFeatures } },
  ko: { ...ko, ...coreResources.ko, ...dashboardWidgetResources.ko, ...equipmentResources.ko, ...equipmentFormResources.ko, ...equipmentBulkResources.ko, ...equipmentAuxResources.ko, ...equipmentImportResources.ko, ...equipmentLocationResources.ko, ...equipmentCustomAttributeResources.ko, ...equipmentDeleteResources.ko, ...equipmentDetailsResources.ko, ...equipmentPMResources.ko, ...equipmentInsightsResources.ko, ...equipmentQRScanResources.ko, ...equipmentScanResources.ko, ...equipmentGroupResources.ko, ...equipmentMediaResources.ko, ...equipmentMutationResources.ko, ...equipmentScannerResources.ko, ...equipmentPartsResources.ko, ...equipmentInlineResources.ko, ...equipmentListResources.ko, ...equipmentMobileResources.ko, ...equipmentFinalizeResources.ko, ...equipmentResidualResources.ko, ...inventoryListResources.ko, ...inventoryDetailResources.ko, ...workOrderResources.ko, ...teamsListResources.ko, ...workOrderMobileResources.ko, ...pmTemplateResources.ko, ...operatorCheckinPublicResources.ko, ...operatorCheckinAdminResources.ko, ...workOrderFormResources.ko, ...workOrderDetailResources.ko, ...workOrderOperationsResources.ko, ...workOrderResidualResources.ko, ...workOrderActivityResources.ko, ...inventoryFormBulkResources.ko, ...alternateGroupListResources.ko, ...alternateGroupDetailResources.ko, ...organizationHubResources.ko, ...organizationMembersResources.ko, ...organizationIntegrationsResources.ko, ...organizationAdminResources.ko, ...teamsDetailResources.ko, ...teamsCardsResources.ko, ...teamsCustomerResources.ko, ...teamsFeedbackResources.ko, ...fleetMapResources.ko, ...organizationImportResources.ko, ...workspaceOnboardingResources.ko, ...organizationNoticesResources.ko, ...partLookupResources.ko, ...inventoryListAuxResources.ko, ...workOrderTimelineNoteResources.ko, ...reportsResources.ko, ...quickFormsResources.ko, ...dsrResources.ko, ...ticketsResources.ko, ...supportPrivacyResources.ko, ...workOrderExportUiResources.ko, ...inventoryMutationResources.ko, ...productOnboardingResources.ko, ...operatorCheckinDetailResources.ko, ...operatorEquipmentResources.ko, ...workOrderCalendarResources.ko, ...notificationPageResources.ko, ...settingsPageResources.ko, ...offlineQueueResources.ko, ...settingsFormsResources.ko, ...settingsSecurityResources.ko, ...publicChromeResources.ko, ...invitationAcceptResources.ko, ...pmTemplateMutationResources.ko, ...landingSectionsResources.ko, ...workOrderQRResources.ko, ...marketingTrustResources.ko, ...landingDetailResources.ko, ...authRouteResources.ko, ...landingAnimationResources.ko, ...auditLogControlsResources.ko, ...workOrderFieldActionResources.ko, ...notificationExtrasResources.ko, ...workOrderMobileSummaryResources.ko, ...authFlowResources.ko, ...auditExplorerResources.ko, ...workOrderAssignmentResources.ko, ...termsOfServiceResources.ko, ...publicLegalResources.ko, ...privacyPolicyContentResources.ko, ...facilityMapResources.ko, ...toolingResources.ko, ...toolingMasterResources.ko, ...toolingCompatibilityResources.ko, ...toolingOperationsResources.ko, publicFeatures: { ...publicFeaturePagesResources.ko.publicFeatures, ...publicFeatureFleetBooksResources.ko.publicFeatures, ...publicFeatureOpsResources.ko.publicFeatures, ...publicFeaturePmTeamsResources.ko.publicFeatures } },

} as const;

const localizedResources = {
  ...resources,
  vi: { ...resources.vi, ...i18nAuditResources.vi },
  en: { ...resources.en, ...i18nAuditResources.en },
  ko: { ...resources.ko, ...i18nAuditResources.ko },
} as const;

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'vi' || saved === 'en' || saved === 'ko') return saved;
  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith('vi')) return 'vi';
  if (browserLanguage.startsWith('ko')) return 'ko';
  return 'en';
}

function getNestedValue(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/{{\s*([^}\s]+)\s*}}/g, (_match, token: string) => {
    const replacement = params[token];
    return replacement === undefined ? `{{${token}}}` : String(replacement);
  });
}

function translateEnglish(key: string, params?: TranslationParams): string {
  const fallback = getNestedValue(localizedResources.en, key);
  const value = typeof fallback === 'string' ? fallback : key;
  return interpolate(value, params);
}

const fallbackI18nContext: I18nContextValue = {
  language: 'en',
  setLanguage: () => undefined,
  t: translateEnglish,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(resolveInitialLanguage);
  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, params?: TranslationParams) => {
    const localized = getNestedValue(localizedResources[language], key);
    const fallback = getNestedValue(localizedResources.en, key);
    const value = typeof localized === 'string' ? localized : typeof fallback === 'string' ? fallback : key;
    return interpolate(value, params);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? fallbackI18nContext;
}
