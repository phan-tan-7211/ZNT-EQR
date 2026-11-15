import type { ReactNode } from 'react';
import { AlertCircle, ShieldAlert, type LucideIcon } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OrganizationPageAlertProps {
  title: ReactNode;
  description: ReactNode;
}

function OrganizationPageAlert({
  icon: Icon,
  variant,
  title,
  description,
}: OrganizationPageAlertProps & { icon: LucideIcon; variant?: 'destructive' }) {
  return (
    <Page maxWidth="full" padding="workspace">
      <Alert variant={variant}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </Page>
  );
}

/** Full-page notice for organization-scoped pages when no organization is active. */
export function NoOrganizationPageAlert(props: OrganizationPageAlertProps) {
  return <OrganizationPageAlert icon={AlertCircle} {...props} />;
}

/** Full-page notice for owner/admin-only organization pages viewed by any other role. */
export function AdminOnlyPageAlert(props: OrganizationPageAlertProps) {
  return <OrganizationPageAlert icon={ShieldAlert} variant="destructive" {...props} />;
}
