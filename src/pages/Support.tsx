import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  Clock,
  ArrowRight,
  Bug,
  Activity,
  BookOpen,
} from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import LandingHeader from "@/components/landing/LandingHeader";
import LegalFooter from "@/components/layout/LegalFooter";
import Page from "@/components/layout/Page";
import PageHeader from "@/components/layout/PageHeader";
import MyTickets from "@/features/tickets/components/MyTickets";
import { useBugReport } from "@/features/tickets/context/BugReportContext";
import { SUPPORT_DOCS_URL } from "@/lib/documentationUrl";
import { useI18n } from '@/i18n';

interface ContactSectionProps {
  /**
   * When true, show the dashboard-only bug report CTA.
   */
  withBugReport?: boolean;
  /**
   * Callback used by the dashboard variant to open the ticket dialog.
   */
  onReportIssue?: () => void;
}

/**
 * Shared "Get Help" card with channels, response time, and (optionally) the
 * Report an Issue CTA that only exists on the dashboard variant.
 */
const ContactSection: React.FC<ContactSectionProps> = ({
  withBugReport = false,
  onReportIssue,
}) => {
  const { t } = useI18n();
  return (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="h-5 w-5" />
        {t('support.getHelp')}
      </CardTitle>
      <CardDescription>
        {t('support.emailHelp')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span>{t('support.checkOur')} </span>
            <ExternalLink href="https://eqr.zinitek.com/support" className="text-primary">
              {t('support.statusPage')}
            </ExternalLink>
            <span> {t('support.statusPageHelp')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>{t('support.emailSupport')}: </span>
            <a
              href="mailto:phantan7211@gmail.com"
              className="text-primary hover:underline"
            >
              phantan7211@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{t('support.responseTime')}</span>
          </div>
        </div>
        {withBugReport && onReportIssue ? (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              {t('support.reportHelp')}
            </p>
            <Button variant="outline" onClick={onReportIssue}>
              <Bug className="mr-2 h-4 w-4" />
              {t('support.reportIssue')}
            </Button>
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
  );
};

const HelpCenterCard: React.FC = () => {
  const { t } = useI18n();
  return (
  <Card className="border-primary/20 bg-linear-to-r from-primary/5 to-accent/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        {t('support.helpCenter')}
      </CardTitle>
      <CardDescription>
        {t('support.guidesDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button asChild>
        <ExternalLink
          href={SUPPORT_DOCS_URL}
          className="inline-flex items-center gap-2"
          showIcon={false}
        >
          {t('support.browseGuides')}
          <ArrowRight className="h-4 w-4" />
        </ExternalLink>
      </Button>
    </CardContent>
  </Card>
  );
};

/**
 * Dashboard variant. Ticket hub for signed-in users (report issue, my tickets).
 * Documentation lives on eqrdocs.zinitek.com.
 */
export const DashboardSupport: React.FC = () => {
  const { t } = useI18n();
  const { openBugReport } = useBugReport();

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-6">
        <PageHeader
          title={t('support.title')}
          description={t('support.dashboardDescription')}
        />

        <HelpCenterCard />

        <ContactSection withBugReport onReportIssue={openBugReport} />

        <MyTickets />
      </div>
    </Page>
  );
};

/**
 * Public variant at /support. Contact channels and link to the Help Center;
 * no ticket controls (those require a signed-in account).
 */
const Support: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <div className="container mx-auto p-6 max-w-4xl mt-16">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{t('support.title')}</h1>
            <p className="text-muted-foreground">
              {t('support.publicDescription')}
            </p>
          </div>

          <HelpCenterCard />

          <ContactSection />

          <Card className="bg-linear-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">{t('support.createAccount')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('support.createAccountHelp')}
              </p>
              <Button asChild>
                <a href="/auth?tab=signup" className="inline-flex items-center gap-2">
                  {t('support.createAccount')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
};

export default Support;
