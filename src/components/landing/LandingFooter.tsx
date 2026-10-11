import React from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const CONTACT_EMAIL = 'mailto:phantan7211@gmail.com';
const GITHUB_REPO_URL = 'https://github.com/phan-tan-7211/ZNT-EQR';
const ZNTEQR_APP_URL = 'https://eqr.zinitek.com';
const ZNT_WEB_URL = 'https://eqrweb.zinitek.com';

interface FooterLinkItem {
  href: string;
  labelKey?: string;
  label?: string;
  type: 'hash' | 'route' | 'external';
  showIcon?: boolean;
}

interface FooterSection {
  titleKey: string;
  links: FooterLinkItem[];
}

const footerSections: FooterSection[] = [
  {
    titleKey: 'product',
    links: [
      { href: '/#features', labelKey: 'allFeatures', type: 'route' },
      {
        href: '/features/qr-code-integration',
        labelKey: 'qrTracking',
        type: 'route',
      },
      {
        href: '/features/work-order-management',
        labelKey: 'workOrderManagement',
        type: 'route',
      },
      { href: '/features/quickbooks', labelKey: 'quickBooksExport', type: 'route' },
      { href: '/features/inventory', labelKey: 'partsInventory', type: 'route' },
      { href: '/#pricing', labelKey: 'pricing', type: 'route' },
    ],
  },
  {
    titleKey: 'company',
    links: [
      { href: '#about', labelKey: 'about', type: 'hash' },
      {
        href: ZNT_WEB_URL,
        label: 'ZNT',
        type: 'external',
      },
      { href: CONTACT_EMAIL, labelKey: 'contact', type: 'hash' },
    ],
  },
  {
    titleKey: 'legal',
    links: [
      { href: '/terms-of-service', labelKey: 'terms', type: 'route' },
      { href: '/privacy-policy', labelKey: 'privacy', type: 'route' },
      { href: '/do-not-sell-or-share', labelKey: 'doNotSell', type: 'route' },
      { href: '/right-to-repair', labelKey: 'rightToRepair', type: 'route' },
    ],
  },
  {
    titleKey: 'connect',
    links: [
      {
        href: '/support',
        labelKey: 'demo',
        type: 'route',
      },
      { href: ZNTEQR_APP_URL, label: 'eqr.zinitek.com', type: 'external' },
      {
        href: GITHUB_REPO_URL,
        label: 'GitHub',
        type: 'external',
        showIcon: true,
      },
    ],
  },
];

const footerLinkDecorationClassName =
  'text-muted-foreground no-underline transition-colors hover:text-foreground hover:underline motion-reduce:transition-none';

function renderFooterLink(item: FooterLinkItem, className: string, t: ReturnType<typeof useI18n>['t']) {
  const label = item.labelKey ? t(`publicChrome.footer.${item.labelKey}`) : item.label;
  if (item.type === 'route') {
    return (
      <Link to={item.href} className={className}>
        {label}
      </Link>
    );
  }

  if (item.type === 'external') {
    return (
      <ExternalLink
        href={item.href}
        className={className}
        showIcon={item.showIcon ?? false}
      >
        {label}
      </ExternalLink>
    );
  }

  return (
    <a href={item.href} className={className}>
      {label}
    </a>
  );
}

const LandingFooter = () => {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const footerLinkClassName =
    `flex items-center min-h-[44px] py-3 text-sm ${footerLinkDecorationClassName}`;

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <nav
        className="container mx-auto px-4 py-8 sm:py-10"
        aria-label={t('publicChrome.footer.navigation')}
      >
        <p className="text-sm text-muted-foreground max-w-xl mb-8">
          {t('publicChrome.footer.description')}
        </p>
        <div className="sm:hidden">
          <Accordion
            type="multiple"
            className="rounded-2xl border border-border/60 bg-background/30 px-4"
          >
            {footerSections.map((section) => (
              <AccordionItem key={section.titleKey} value={section.titleKey}>
                <AccordionTrigger className="min-h-13 py-4 text-sm font-semibold text-foreground hover:no-underline">
                  {t(`publicChrome.footer.${section.titleKey}`)}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="pb-2">
                    {section.links.map((item) => (
                      <li key={`${section.titleKey}-${item.href}`}>
                        {renderFooterLink(item, footerLinkClassName, t)}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="hidden grid-cols-2 gap-8 sm:grid sm:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.titleKey}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t(`publicChrome.footer.${section.titleKey}`)}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((item) => (
                  <li key={`${section.titleKey}-${item.href}`}>
                    {renderFooterLink(item, footerLinkDecorationClassName, t)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
          <span>© {currentYear} ZNTEQR™</span>
          <ExternalLink
            href={ZNT_WEB_URL}
            className={footerLinkDecorationClassName}
            showIcon={false}
          >
            ZNT LLC
          </ExternalLink>
        </div>
      </nav>
    </footer>
  );
};

export default LandingFooter;
