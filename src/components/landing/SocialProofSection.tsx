import { useI18n } from '@/i18n/I18nProvider';
import React from 'react';
import { Shield, Smartphone, Building2, Receipt } from 'lucide-react';
import LandingReveal from './LandingReveal';

const trustBadges = [
  { icon: Shield, labelKey: 'private' },
  { icon: Smartphone, labelKey: 'offline' },
  { icon: Building2, labelKey: 'google' },
  { icon: Receipt, labelKey: 'quickbooks' },
];

const SocialProofSection = () => {
  const { t } = useI18n();
  return (
    <section id="customers" className="scroll-mt-20 py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('landingDetails.social.heading')}
          </h2>
          <p className="mx-auto max-w-2xl text-left text-xl text-muted-foreground sm:text-center">
            {t('landingDetails.social.intro')}
          </p>
        </div>

        {/* Qualitative trust badges - verifiable feature claims */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {trustBadges.map(({ icon: Icon, labelKey }, index) => (
            <LandingReveal key={labelKey} delayMs={index * 60}>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
                <Icon className="h-6 w-6 text-primary shrink-0" aria-hidden />
                <span className="text-sm font-medium text-foreground">{t(`landingDetails.social.${labelKey}`)}</span>
              </div>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;