import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { localizeDocsUrl } from '@/lib/localizeDocsUrl';
import HCaptchaComponent from '@/components/ui/HCaptcha';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicFormFieldInput } from '@/features/public-forms/PublicFormFieldInput';
import {
  PublicFormErrorState,
  PublicFormLoadingState,
  PublicFormSuccessCard,
} from '@/features/public-forms/PublicFormStates';
import {
  formatPublicSubmittedAt,
  usePublicFormSubmission,
} from '@/features/public-forms/usePublicFormClientContext';
import {
  loadOperatorCheckinForm,
  submitOperatorCheckin,
} from '@/features/operator-check-ins/services/operatorCheckinPublicService';
import type {
  CapturedFieldValue,
  OperatorChecklistAnswer,
  OperatorChecklistDataField,
  OperatorChecklistTemplateItem,
} from '@/features/operator-check-ins/types/operatorChecklist';
import {
  formatCapturedFieldValue,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
} from '@/features/operator-check-ins/types/operatorChecklist';
import { groupChecklistItemsBySection } from '@/utils/pmChecklistHelpers';
import { OperatorCheckinChecklistItemRow } from '@/features/operator-check-ins/components/OperatorCheckinChecklistItemRow';

export default function OperatorCheckInPublicPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [dataFields, setDataFields] = useState<OperatorChecklistDataField[]>([]);
  const [items, setItems] = useState<OperatorChecklistTemplateItem[]>([]);
  const [equipmentPreviewFields, setEquipmentPreviewFields] = useState<CapturedFieldValue[]>([]);
  const [locationCollectionEnabled, setLocationCollectionEnabled] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [complianceNotice, setComplianceNotice] = useState('');
  const [operatorValues, setOperatorValues] = useState<Record<string, unknown>>({});
  const [answers, setAnswers] = useState<Record<string, OperatorChecklistAnswer>>({});

  const {
    submitting,
    setSubmitting,
    submitted,
    setSubmitted,
    submittedAt,
    setSubmittedAt,
    hcaptchaToken,
    setHcaptchaToken,
    showCaptcha,
    captchaMisconfigured,
    coords,
    gpsStatus,
  } = usePublicFormSubmission({
    captchaRequired,
    collectGps: locationCollectionEnabled && Boolean(token),
  });

  const grouped = useMemo(() => groupChecklistItemsBySection(items), [items]);
  const operatorFields = useMemo(
    () => dataFields.filter((field) => field.source === 'operator_input'),
    [dataFields],
  );
  const readOnlyFields = useMemo(
    () => dataFields.filter((field) => field.source !== 'operator_input'),
    [dataFields],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await loadOperatorCheckinForm(token);
        if (cancelled) return;
        setTemplateName(data.template.name);
        setDataFields(data.template.dataFields);
        setItems(data.template.checklistItems);
        setEquipmentPreviewFields(data.equipmentPreviewFields);
        setLocationCollectionEnabled(data.locationCollectionEnabled);
        setCaptchaRequired(data.captchaRequired);
        setComplianceNotice(data.complianceNotice);
        if (data.alreadySubmittedToday) {
          setSubmitted(true);
          setSubmittedAt(data.lastSubmittedAt ?? null);
        }
      } catch {
        if (!cancelled) setLoadError(t('operatorCheckinPublic.unavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const answerList = useMemo(() => Object.values(answers), [answers]);
  const checklistValidation = useMemo(
    () => validateOperatorChecklistAnswers(items, answerList),
    [items, answerList],
  );
  const fieldValidation = useMemo(
    () => validateOperatorInputFields(dataFields, operatorValues),
    [dataFields, operatorValues],
  );

  const canSubmit =
    !captchaMisconfigured &&
    fieldValidation.isComplete &&
    checklistValidation.isComplete &&
    (!captchaRequired || hcaptchaToken !== null);

  const validationMessages = useMemo(
    () => [...fieldValidation.errors, ...checklistValidation.errors],
    [fieldValidation.errors, checklistValidation.errors],
  );

  const hasFormProgress = useMemo(() => {
    const hasOperatorInput = Object.values(operatorValues).some((value) => {
      if (value === undefined || value === null || value === '') return false;
      if (value === false) return false;
      return true;
    });
    return Object.keys(answers).length > 0 || hasOperatorInput || hcaptchaToken !== null;
  }, [answers, operatorValues, hcaptchaToken]);

  function getReadOnlyValue(field: OperatorChecklistDataField): string {
    if (field.source === 'equipment_snapshot') {
      const preview = equipmentPreviewFields.find((item) => item.field_id === field.id);
      return formatCapturedFieldValue(preview?.value);
    }
    if (field.source === 'client_context' && field.clientKey === 'gps_location') {
      if (gpsStatus === 'pending') return t('operatorCheckinPublic.requestingLocation');
      if (gpsStatus === 'granted' && coords) return `${coords.lat}, ${coords.lng}`;
      if (gpsStatus === 'denied') return t('operatorCheckinPublic.notProvided');
      return t('operatorCheckinPublic.notRequested');
    }
    if (field.source === 'client_context' && field.clientKey === 'browser_timezone') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (field.source === 'client_context' && field.clientKey === 'submitted_timestamp') {
      return t('operatorCheckinPublic.recordedOnSubmit');
    }
    return '—';
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitOperatorCheckin({
        token,
        operatorFieldValues: operatorValues,
        checklistAnswers: answerList,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location: coords ? `${coords.lat}, ${coords.lng}` : null,
        captchaToken: hcaptchaToken ?? undefined,
      });
      setSubmittedAt(result.submittedAt);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('operatorCheckinPublic.submitError');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleAnswer(itemId: string, passed: boolean) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { item_id: itemId, passed },
    }));
  }

  function updateOperatorValue(fieldId: string, value: unknown) {
    setOperatorValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleResetForm() {
    setOperatorValues({});
    setAnswers({});
    setHcaptchaToken(null);
  }

  if (loading) {
    return <PublicFormLoadingState message={t('operatorCheckinPublic.loading')} />;
  }

  if (loadError) {
    return <PublicFormErrorState message={loadError} />;
  }

  if (submitted) {
    return (
      <PublicFormSuccessCard title={t('operatorCheckinPublic.complete')}>
        <p>
          {t('operatorCheckinPublic.saved', { name: templateName, time: submittedAt ? t('operatorCheckinPublic.savedAt', { time: formatPublicSubmittedAt(submittedAt) }) : '' })}
        </p>
        <p>{complianceNotice}</p>
        <p className="text-xs">{t('operatorCheckinPublic.closePage')}</p>
      </PublicFormSuccessCard>
    );
  }

  return (
    <>
      <PageSEO title={t('operatorCheckinPublic.seoTitle', { name: templateName })} noindex />
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{templateName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('operatorCheckinPublic.subtitle')}</p>
          <p className="text-sm mt-2">
            <ExternalLink href={localizeDocsUrl(OPERATOR_DAILY_CHECK_INS_DOCS_URL, language)}>
              {t('operatorCheckinPublic.documentation')}
            </ExternalLink>
          </p>
        </div>

        <Alert>
          <AlertDescription>{complianceNotice}</AlertDescription>
        </Alert>

        {captchaMisconfigured && (
          <Alert variant="destructive">
            <AlertDescription>
              {t('operatorCheckinPublic.captchaUnavailable')}
            </AlertDescription>
          </Alert>
        )}

        {(operatorFields.length > 0 || readOnlyFields.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('operatorCheckinPublic.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {operatorFields.map((field) => (
                <PublicFormFieldInput
                  key={field.id}
                  fieldId={`operator-field-${field.id}`}
                  label={field.label}
                  inputType={field.inputType ?? 'text'}
                  required={field.required === true}
                  helpText={field.helpText}
                  value={operatorValues[field.id]}
                  onChange={(value) => updateOperatorValue(field.id, value)}
                />
              ))}
              {readOnlyFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <p className="text-sm font-medium">{field.label}</p>
                  {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                  <p className="text-sm text-muted-foreground">{getReadOnlyValue(field)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t('operatorCheckinPublic.swipeInstructions')}
          </p>
        )}

        {Object.entries(grouped).map(([section, sectionItems]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionItems.map((item) => (
                <OperatorCheckinChecklistItemRow
                  key={item.id}
                  item={item}
                  answer={answers[item.id]}
                  onAnswer={(passed) => toggleAnswer(item.id, passed)}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {showCaptcha && (
          <HCaptchaComponent
            onSuccess={(token) => setHcaptchaToken(token)}
            onExpire={() => setHcaptchaToken(null)}
          />
        )}

        {validationMessages.length > 0 && (
          <Alert>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {captchaRequired && !hcaptchaToken && !captchaMisconfigured && (
          <p className="text-xs text-muted-foreground text-center">{t('operatorCheckinPublic.captchaPrompt')}</p>
        )}

        {hasFormProgress && (
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px] touch-manipulation"
            onClick={handleResetForm}
          >
            {t('operatorCheckinPublic.reset')}
          </Button>
        )}

        <Button className="w-full" size="lg" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
          {submitting ? t('operatorCheckinPublic.submitting') : t('operatorCheckinPublic.submit')}
        </Button>
      </div>
    </>
  );
}
