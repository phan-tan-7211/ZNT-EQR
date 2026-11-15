import React from 'react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock3, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { SUPPORT_DOCS_URL } from '@/lib/documentationUrl';
import { localizeDocsUrl } from '@/lib/localizeDocsUrl';
import { useI18n } from '@/i18n';
import { useAuthFlowCopy } from './useAuthFlowCopy';

type WorkspaceAccessGateMode = 'blocked' | 'pending' | 'rejected' | 'error';

interface WorkspaceAccessGateProps {
  mode: WorkspaceAccessGateMode;
  domain: string | null;
  onRetry?: () => void;
  onResubmit?: () => void;
  isResubmitting?: boolean;
  resubmitFailed?: boolean;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedByName?: string | null;
}

const WorkspaceAccessGate: React.FC<WorkspaceAccessGateProps> = ({
  mode,
  domain,
  onRetry,
  onResubmit,
  isResubmitting = false,
  resubmitFailed = false,
  rejectionReason,
  reviewedAt,
  reviewedByName,
}) => {
  const t = useAuthFlowCopy();
  const { t: translate, language } = useI18n();
  const { signOut } = useAuth();
  const { formatDateTime } = useFormatTimestamp();
  const isPending = mode === 'pending';
  const isRejected = mode === 'rejected';
  const isError = mode === 'error';

  return (
    <Page maxWidth="full" padding="workspace">
      <PageHeader
        title={
          isError
            ? t('authFlow.workspaceVerifyTitle')
            : isRejected
              ? t('authFlow.workspaceRejectedTitle')
            : isPending
              ? t('authFlow.workspacePendingTitle')
              : t('authFlow.workspaceRequiredTitle')
        }
        description={
          isError
            ? t('authFlow.workspaceVerifyDescription')
            : domain
              ? t('authFlow.claimedDomainDescription', { domain })
              : t('authFlow.workspaceDomainDescription')
        }
      />

      <Alert variant={isError || isRejected || !isPending ? 'destructive' : 'default'}>
        {isPending ? <Clock3 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <AlertTitle>
          {isError
            ? t('authFlow.accessCheckFailed')
            : isRejected
              ? t('authFlow.accessRejected')
            : isPending
              ? t('authFlow.awaitingApproval')
              : t('authFlow.noAccessYet')}
        </AlertTitle>
        <AlertDescription className="space-y-3">
          {isError ? (
            <p>
              {t('authFlow.workspaceRetryHelp')}
            </p>
          ) : isRejected ? (
            <div className="space-y-2">
              <p>{t('authFlow.workspaceRejectedHelp')}</p>
              {rejectionReason ? <p><span className="font-medium">{t('authFlow.rejectionReason')}:</span> {rejectionReason}</p> : null}
              {reviewedByName ? <p><span className="font-medium">{t('authFlow.reviewedBy')}:</span> {reviewedByName}</p> : null}
              {reviewedAt ? <p><span className="font-medium">{t('authFlow.reviewedAt')}:</span> {formatDateTime(reviewedAt)}</p> : null}
            </div>
          ) : isPending ? (
            <p>
              {t('authFlow.workspacePendingHelp')}
            </p>
          ) : (
            <p>
              {t('authFlow.workspaceBlockedHelp')}
            </p>
          )}
          {isRejected && resubmitFailed ? <p role="alert">{t('authFlow.resubmitAccessFailed')}</p> : null}
          <div className="flex flex-wrap gap-2">
            {isError && onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t('authFlow.tryAgain')}
              </Button>
            ) : null}
            {isRejected && onResubmit ? (
              <Button size="sm" disabled={isResubmitting} onClick={onResubmit}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {isResubmitting ? t('authFlow.resubmittingAccess') : t('authFlow.resubmitAccess')}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <a href={localizeDocsUrl(SUPPORT_DOCS_URL, language)} target="_blank" rel="noopener noreferrer">
                {translate('profileMenu.helpCenter')}
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut();
              }}
            >
              {translate('profileMenu.signOut')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </Page>
  );
};

export default WorkspaceAccessGate;
