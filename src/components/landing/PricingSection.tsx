import { useI18n } from '@/i18n/I18nProvider';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { PricingCollageBackground } from '@/components/landing/pricing-collage/PricingCollageBackground';

const CONTACT_EMAIL = 'mailto:phantan7211@gmail.com';

const PricingSection = () => {
  const { t } = useI18n();
  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden py-24">
      <PricingCollageBackground />
      <div className="relative z-10 container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('landingSections.pricing.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landingSections.pricing.subtitle')}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="text-center mb-8 pb-6 border-b border-border">
              <div className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">{t('landingSections.pricing.free')}</div>
              <p className="text-muted-foreground mt-2">{t('landingSections.pricing.card')}</p>
            </div>
            <ul className="space-y-3 mb-8 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                {t('landingSections.pricing.seats')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                {t('landingSections.pricing.storage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                {t('landingSections.pricing.isolation')}
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-6 py-6 w-full sm:w-auto">
                <Link to="/auth?tab=signup">
                  {t('landingSections.hero.start')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-6 py-6 w-full sm:w-auto">
                <Link to="/support">
                  <Calendar className="mr-2 h-5 w-5" aria-hidden />
                  {t('landingSections.pricing.demo')}
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center mt-4">
              {t('landingSections.pricing.questions')}{' '}
              <a
                href={CONTACT_EMAIL}
                className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                {t('landingSections.pricing.email')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
