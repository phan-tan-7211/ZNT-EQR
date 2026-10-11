import type { JSX } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ExternalLink } from '@/components/ui/external-link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { APP_VERSION } from '@/lib/version';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';

const linkClassName =
  'whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors no-underline hover:underline';

const legalLinks = [
  { to: '/releases', labelKey: 'releases' },
  { to: '/terms-of-service', labelKey: 'terms' },
  { to: '/security', labelKey: 'security' },
  { to: '/right-to-repair', labelKey: 'repair' },
  { to: '/privacy-policy', labelKey: 'privacy' },
  { to: '/do-not-sell-or-share', labelKey: 'doNotSell' },
] as const;

type LegalFooterProps = {
  contextAware?: boolean;
};

type LegalFooterViewProps = {
  canManageDsr: boolean;
};

function LegalFooterView({ canManageDsr }: LegalFooterViewProps): JSX.Element {
  const { t } = useI18n();
  return (
    <footer className="hidden h-8 shrink-0 border-t border-border bg-background/50 backdrop-blur-sm md:block">
      <div className="container mx-auto h-full px-4">
        <div className="flex h-full min-w-0 flex-nowrap items-center justify-between gap-x-4 text-xs leading-none text-muted-foreground">
          <p className="inline-flex min-w-0 truncate items-center gap-x-1">
            <span className="whitespace-nowrap font-medium">ZNTEQR</span>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <span className="whitespace-nowrap">{t('publicChrome.legalFooter.byline')}</span>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <Link
              to="/releases"
              className={`${linkClassName} font-medium`}
              aria-label={t('publicChrome.legalFooter.releaseVersion', { version: APP_VERSION })}
            >
              v{APP_VERSION}
            </Link>
          </p>

          <nav
            aria-label={t('publicChrome.legalFooter.navigation')}
            className="flex shrink-0 flex-nowrap items-center gap-x-2 whitespace-nowrap"
          >
            <ExternalLink
              href="https://eqrdocs.zinitek.com/support"
              className={linkClassName}
              showIcon={false}
            >
              {t('publicChrome.legalFooter.help')}
            </ExternalLink>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-sm text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={t('publicChrome.legalFooter.legalLinks')}
              >
                {t('publicChrome.legalFooter.legal')}
                <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {legalLinks.map(({ to, labelKey }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link to={to} className="cursor-pointer">
                      {t(`publicChrome.legalFooter.${labelKey}`)}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {canManageDsr ? (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/dsr" className="cursor-pointer">
                      {t('publicChrome.legalFooter.dsr')}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function ContextAwareLegalFooter(): JSX.Element {
  const organization = useSimpleOrganizationSafe();
  const role = organization?.currentOrganization?.userRole;
  const canManageDsr = role === 'owner' || role === 'admin';

  return <LegalFooterView canManageDsr={canManageDsr} />;
}

export default function LegalFooter({ contextAware = true }: LegalFooterProps): JSX.Element {
  if (!contextAware) {
    return <LegalFooterView canManageDsr={false} />;
  }

  return <ContextAwareLegalFooter />;
}
