import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { PageSEO } from '@/components/seo/PageSEO';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';

const SECTION_PATH = 'termsOfService.sections';

export default function TermsOfService() {
  const { t } = useI18n();
  const section = (key: string) => `${SECTION_PATH}.${key}`;
  const paragraph = (key: string): ReactNode => <p>{t(key)}</p>;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PageSEO
        title={t('termsOfService.seoTitle')}
        description={t('termsOfService.seoDescription')}
        path="/terms-of-service"
      />

      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="mb-8">
        <PageBackButton className="mb-4" />
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">{t('termsOfService.title')}</h1>
          <p className="text-muted-foreground">{t('termsOfService.lastUpdated')}</p>
        </div>
      </div>

      <div className="space-y-8">
        <LegalPolicySection title={t(`${section('intro')}.title`)}>
          {paragraph(`${section('intro')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('service')}.title`)}>
          {paragraph(`${section('service')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('accounts')}.title`)}>
          {paragraph(`${section('accounts')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('acceptableUse')}.title`)}>
          <p>{t(`${section('acceptableUse')}.intro`)}</p>
          <ul className="list-disc pl-5">
            {Array.from({ length: 7 }, (_, index) => (
              <li key={index}>{t(`${section('acceptableUse')}.item${index + 1}`)}</li>
            ))}
          </ul>
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('customerData')}.title`)}>
          {paragraph(`${section('customerData')}.p1`)}
          <p>
            {t(`${section('customerData')}.privacyPrefix`)}{' '}
            <Link to="/privacy-policy" className="underline">
              {t('termsOfService.privacyLink')}
            </Link>
            . {t(`${section('customerData')}.privacySuffix`)}
          </p>
          {paragraph(`${section('customerData')}.p3`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('thirdParty')}.title`)}>
          {paragraph(`${section('thirdParty')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('billing')}.title`)}>
          {paragraph(`${section('billing')}.p1`)}
          {paragraph(`${section('billing')}.p2`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('security')}.title`)}>
          {paragraph(`${section('security')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('termination')}.title`)}>
          {paragraph(`${section('termination')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('intellectualProperty')}.title`)}>
          {paragraph(`${section('intellectualProperty')}.p1`)}
          {paragraph(`${section('intellectualProperty')}.p2`)}
          {paragraph(`${section('intellectualProperty')}.p3`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('indemnification')}.title`)}>
          {paragraph(`${section('indemnification')}.p1`)}
          {paragraph(`${section('indemnification')}.p2`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('disclaimers')}.title`)}>
          {paragraph(`${section('disclaimers')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('liability')}.title`)}>
          {paragraph(`${section('liability')}.p1`)}
          {paragraph(`${section('liability')}.p2`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('changes')}.title`)}>
          {paragraph(`${section('changes')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('governingLaw')}.title`)}>
          {paragraph(`${section('governingLaw')}.p1`)}
          <p>
            {t(`${section('governingLaw')}.noticesPrefix`)}{' '}
            <a href="mailto:legal@zinitek.com" className="underline">
              legal@zinitek.com
            </a>{' '}
            {t(`${section('governingLaw')}.noticesSuffix`)}
          </p>
          {paragraph(`${section('governingLaw')}.p3`)}
          {paragraph(`${section('governingLaw')}.p4`)}
          {paragraph(`${section('governingLaw')}.p5`)}
          {paragraph(`${section('governingLaw')}.p6`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('entireAgreement')}.title`)}>
          {paragraph(`${section('entireAgreement')}.p1`)}
        </LegalPolicySection>

        <LegalPolicySection title={t(`${section('contact')}.title`)}>
          <p>
            <strong>ZNT LLC</strong> • {t('termsOfService.emailLabel')}:{' '}
            <a href="mailto:phantan7211@gmail.com" className="underline">
              phantan7211@gmail.com
            </a>{' '}
            • {t('termsOfService.websiteLabel')}:{' '}
            <a
              href="https://eqr.zinitek.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              aria-label={t('termsOfService.websiteAria')}
            >
              https://eqr.zinitek.com
            </a>
          </p>
        </LegalPolicySection>
      </div>
    </div>
  );
}
