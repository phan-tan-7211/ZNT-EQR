import { Fragment, useMemo, useState } from 'react';
import { Check, Info, Minus, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AdminOnlyPageAlert, NoOrganizationPageAlert } from '@/components/common/OrganizationPageAlerts';
import { OrganizationSubnav } from '@/features/organization/components/OrganizationSubnav';
import { TeamPermissionSettings } from '../permissions/TeamPermissionSettings';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import {
  ORGANIZATION_LEVEL_ROLES,
  PERMISSION_MATRIX,
  PERMISSION_MATRIX_ROLES,
  permissionMatrixCopy,
  type PermissionCell,
} from '../permissions/permissionMatrix';

const TEAM_LEVEL_ROLE_COUNT = PERMISSION_MATRIX_ROLES.length - ORGANIZATION_LEVEL_ROLES.length;

function CellIcon({ value, label }: { value: PermissionCell; label: string }) {
  if (value === 'yes') return <Check role="img" aria-label={label} className="mx-auto h-4 w-4 text-emerald-500" />;
  if (value === 'limited') return <TriangleAlert role="img" aria-label={label} className="mx-auto h-4 w-4 text-amber-500" />;
  return <Minus role="img" aria-label={label} className="mx-auto h-4 w-4 text-muted-foreground/60" />;
}

export default function PermissionMatrix() {
  const { language } = useI18n();
  const copy = permissionMatrixCopy[language];
  const { currentOrganization } = useOrganization();
  const [search, setSearch] = useState('');

  const cellLabel = (value: PermissionCell) =>
    value === 'yes' ? copy.legendYes : value === 'limited' ? copy.legendLimited : copy.legendNo;

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return PERMISSION_MATRIX
      .map((section) => ({
        ...section,
        rows: term && !copy.sections[section.id].toLowerCase().includes(term)
          ? section.rows.filter((row) => copy.actions[row.id].toLowerCase().includes(term))
          : section.rows,
      }))
      .filter((section) => section.rows.length > 0);
  }, [copy, search]);

  if (!currentOrganization) {
    return <NoOrganizationPageAlert title={copy.title} description={copy.noOrganization} />;
  }

  const isAdmin = currentOrganization.userRole === 'owner' || currentOrganization.userRole === 'admin';
  if (!isAdmin) {
    return <AdminOnlyPageAlert title={copy.accessDenied} description={copy.adminOnly} />;
  }

  return (
    <Page maxWidth="full" padding="workspace">
      <OrganizationSubnav />
      <div className="space-y-5">
        <PageHeader title={copy.title} icon={<ShieldCheck className="h-5 w-5" />} description={copy.description} />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{copy.readOnlyNotice}</AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label={copy.searchAria}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(['yes', 'limited', 'no'] as const).map((value) => (
              <span key={value} className="inline-flex items-center gap-1.5">
                <CellIcon value={value} label={cellLabel(value)} />
                {cellLabel(value)}
              </span>
            ))}
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{copy.noMatches}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" rowSpan={2} className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium">
                    {copy.actionColumn}
                  </th>
                  <th scope="colgroup" colSpan={ORGANIZATION_LEVEL_ROLES.length} className="border-l px-2 py-2 text-center font-medium">
                    {copy.organizationRoles}
                  </th>
                  <th scope="colgroup" colSpan={TEAM_LEVEL_ROLE_COUNT} className="border-l px-2 py-2 text-center font-medium">
                    {copy.teamRoles}
                  </th>
                </tr>
                <tr className="border-b bg-muted/40">
                  {PERMISSION_MATRIX_ROLES.map((role, index) => (
                    <th
                      key={role}
                      scope="col"
                      className={cn('px-2 py-2 text-center font-medium', (index === 0 || index === ORGANIZATION_LEVEL_ROLES.length) && 'border-l')}
                    >
                      {copy.roles[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <Fragment key={section.id}>
                    <tr className="border-b bg-muted/20">
                      <th
                        scope="rowgroup"
                        colSpan={PERMISSION_MATRIX_ROLES.length + 1}
                        className="sticky left-0 px-3 py-2 text-left font-semibold"
                      >
                        {copy.sections[section.id]}
                      </th>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <th scope="row" className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-normal">
                          <span>{copy.actions[row.id]}</span>
                          {row.note ? <span className="mt-0.5 block text-xs text-muted-foreground">{copy.notes[row.note]}</span> : null}
                        </th>
                        {PERMISSION_MATRIX_ROLES.map((role, index) => (
                          <td
                            key={role}
                            className={cn('px-2 py-2 text-center', (index === 0 || index === ORGANIZATION_LEVEL_ROLES.length) && 'border-l')}
                          >
                            <CellIcon value={row.cells[role]} label={`${copy.roles[role]}: ${cellLabel(row.cells[role])}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{copy.inventoryGrantNote}</p>

        <TeamPermissionSettings
          organizationId={currentOrganization.id}
          canEdit={currentOrganization.userRole === 'owner'}
        />
      </div>
    </Page>
  );
}
