import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, QrCode, Search, Upload, Wrench } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ToolingStatusBadges } from '@/features/tooling/components/ToolingStatusBadges';
import { ProductPartsCatalog } from '@/features/tooling/components/compatibility/ProductPartsCatalog';
import { ProductionOperationsCatalog } from '@/features/tooling/components/compatibility/ProductionOperationsCatalog';
import { ToolingDesignsCatalog } from '@/features/tooling/components/master/ToolingDesignsCatalog';
import { ToolingFormDialog } from '@/features/tooling/components/master/ToolingFormDialog';
import { ToolingImportDialog } from '@/features/tooling/components/import/ToolingImportDialog';
import { ToolingExportMenu } from '@/features/tooling/components/reports/ToolingExportMenu';
import { ToolingQrLabelsDialog } from '@/features/tooling/components/reports/ToolingQrLabelsDialog';
import { ToolingLifeBar } from '@/features/tooling/components/master/ToolingOverviewTab';
import { useToolingList } from '@/features/tooling/hooks/useTooling';
import { useToolingPermissions } from '@/features/tooling/hooks/useToolingPermissions';
import {
  TOOLING_TYPES,
  TOOLING_USABILITY_STATES,
  type ToolingOverview,
  type ToolingType,
  type ToolingUsabilityState,
} from '@/features/tooling/types';
import { useI18n } from '@/i18n';

const VIEWS = ['tools', 'products', 'operations', 'designs'] as const;
type ListView = (typeof VIEWS)[number];
const ALL = 'all';

type IssueFilter = typeof ALL | 'issued' | 'storage';
type AttentionFilter = typeof ALL | 'attention';

function isListView(value: string | null): value is ListView {
  return value !== null && (VIEWS as readonly string[]).includes(value);
}

function needsAttention(tool: ToolingOverview): boolean {
  return tool.warning_reached || tool.life_limit_reached || tool.maintenance_due || tool.inspection_overdue;
}

function matchesSearch(tool: ToolingOverview, query: string): boolean {
  if (!query) return true;
  return [tool.name, tool.management_code, tool.serial_number, tool.storage_location, tool.issued_to_name].some(
    (value) => value?.toLowerCase().includes(query),
  );
}

function ToolLocation({ tool }: { tool: ToolingOverview }) {
  const { t } = useI18n();
  if (tool.is_issued) {
    return <span>{t('toolingMaster.list.heldBy', { name: tool.issued_to_name ?? t('tooling.none') })}</span>;
  }
  return tool.storage_location ? (
    <span>{tool.storage_location}</span>
  ) : (
    <span className="text-muted-foreground">{t('toolingMaster.list.noLocation')}</span>
  );
}

function ToolsView({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: tools = [], isLoading, error } = useToolingList(organizationId);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<typeof ALL | ToolingType>(ALL);
  const [usabilityFilter, setUsabilityFilter] = useState<typeof ALL | ToolingUsabilityState>(ALL);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>(ALL);
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  const query = search.trim().toLowerCase();
  const filtersActive =
    query !== '' || typeFilter !== ALL || usabilityFilter !== ALL || issueFilter !== ALL || attentionFilter !== ALL;

  const filtered = useMemo(
    () =>
      tools.filter(
        (tool) =>
          matchesSearch(tool, query) &&
          (typeFilter === ALL || tool.tooling_type === typeFilter) &&
          (usabilityFilter === ALL || tool.usability_state === usabilityFilter) &&
          (issueFilter === ALL || (issueFilter === 'issued' ? tool.is_issued : !tool.is_issued)) &&
          (attentionFilter === ALL || needsAttention(tool)),
      ),
    [tools, query, typeFilter, usabilityFilter, issueFilter, attentionFilter],
  );

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(ALL);
    setUsabilityFilter(ALL);
    setIssueFilter(ALL);
    setAttentionFilter(ALL);
  };

  const openTool = (tool: ToolingOverview) => navigate(`/dashboard/tooling/${tool.id}`);
  const onRowKeyDown = (event: KeyboardEvent, tool: ToolingOverview) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTool(tool);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full space-y-1.5 sm:max-w-md">
          <Label htmlFor="tooling-search">{t('toolingMaster.list.searchLabel')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="tooling-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('toolingMaster.list.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToolingExportMenu tools={filtered} />
          <Button variant="outline" onClick={() => setLabelsOpen(true)} disabled={filtered.length === 0}>
            <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('toolingReports.labels.open')}
          </Button>
          {canManage && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingImport.trigger')}
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingMaster.list.register')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="tooling-filter-type">{t('toolingMaster.list.filterType')}</Label>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger id="tooling-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('toolingMaster.list.allTypes')}</SelectItem>
              {TOOLING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`tooling.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tooling-filter-usability">{t('toolingMaster.list.filterUsability')}</Label>
          <Select value={usabilityFilter} onValueChange={(value) => setUsabilityFilter(value as typeof usabilityFilter)}>
            <SelectTrigger id="tooling-filter-usability">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('toolingMaster.list.allStates')}</SelectItem>
              {TOOLING_USABILITY_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {t(`tooling.usability.${state}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tooling-filter-issue">{t('toolingMaster.list.filterIssue')}</Label>
          <Select value={issueFilter} onValueChange={(value) => setIssueFilter(value as IssueFilter)}>
            <SelectTrigger id="tooling-filter-issue">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('toolingMaster.list.issueAll')}</SelectItem>
              <SelectItem value="issued">{t('toolingMaster.list.issuedOnly')}</SelectItem>
              <SelectItem value="storage">{t('toolingMaster.list.storageOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tooling-filter-attention">{t('toolingMaster.list.filterAttention')}</Label>
          <Select value={attentionFilter} onValueChange={(value) => setAttentionFilter(value as AttentionFilter)}>
            <SelectTrigger id="tooling-filter-attention" aria-describedby="tooling-filter-attention-hint">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('toolingMaster.list.attentionAll')}</SelectItem>
              <SelectItem value="attention">{t('toolingMaster.list.attentionOnly')}</SelectItem>
            </SelectContent>
          </Select>
          <p id="tooling-filter-attention-hint" className="sr-only">
            {t('toolingMaster.list.attentionHint')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label={t('tooling.loading')}>
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{t('tooling.loadFailed')}</AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        tools.length > 0 ? (
          <EmptyState
            icon={Search}
            title={t('toolingMaster.list.noMatchTitle')}
            description={t('toolingMaster.list.noMatchDescription')}
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  {t('toolingMaster.list.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={Wrench}
            title={t('toolingMaster.list.emptyTitle')}
            description={
              canManage ? t('toolingMaster.list.emptyDescription') : t('toolingMaster.list.emptyDescriptionReadOnly')
            }
            action={
              canManage ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('toolingMaster.list.register')}
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span data-testid="tooling-list-count">
              {t('toolingMaster.list.count', { shown: filtered.length, total: tools.length })}
            </span>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('toolingMaster.list.clearFilters')}
              </Button>
            )}
          </div>

          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('toolingMaster.list.columns.code')}</TableHead>
                    <TableHead>{t('toolingMaster.list.columns.name')}</TableHead>
                    <TableHead>{t('toolingMaster.list.columns.type')}</TableHead>
                    <TableHead>{t('toolingMaster.list.columns.status')}</TableHead>
                    <TableHead>{t('toolingMaster.list.columns.location')}</TableHead>
                    <TableHead className="w-56">{t('toolingMaster.list.columns.life')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tool) => (
                    <TableRow
                      key={tool.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="link"
                      aria-label={t('toolingMaster.list.openTool', { name: tool.name })}
                      onClick={() => openTool(tool)}
                      onKeyDown={(event) => onRowKeyDown(event, tool)}
                      data-testid="tooling-row"
                    >
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {tool.management_code ?? t('tooling.none')}
                      </TableCell>
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{t(`tooling.types.${tool.tooling_type}`)}</TableCell>
                      <TableCell>
                        <ToolingStatusBadges tool={tool} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <ToolLocation tool={tool} />
                      </TableCell>
                      <TableCell>
                        <ToolingLifeBar tool={tool} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <ul className="space-y-3 md:hidden">
            {filtered.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  onClick={() => openTool(tool)}
                  aria-label={t('toolingMaster.list.openTool', { name: tool.name })}
                  className="w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="tooling-card"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tool.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {tool.management_code ?? t('tooling.none')} · {t(`tooling.types.${tool.tooling_type}`)}
                      </p>
                    </div>
                  </div>
                  <ToolingStatusBadges tool={tool} className="mt-2" />
                  <p className="mt-2 break-words text-sm">
                    <ToolLocation tool={tool} />
                  </p>
                  <ToolingLifeBar tool={tool} className="mt-2" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage && <ToolingFormDialog open={createOpen} onOpenChange={setCreateOpen} organizationId={organizationId} />}
      {canManage && <ToolingImportDialog open={importOpen} onOpenChange={setImportOpen} organizationId={organizationId} />}
      <ToolingQrLabelsDialog open={labelsOpen} onOpenChange={setLabelsOpen} tools={filtered} />
    </div>
  );
}

export default function ToolingListPage() {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { canManage } = useToolingPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const viewParam = searchParams.get('view');
  const view: ListView = isListView(viewParam) ? viewParam : 'tools';
  const setView = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'tools') next.delete('view');
    else next.set('view', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-4">
        <PageHeader
          title={t('tooling.title')}
          description={t('tooling.description')}
          icon={<Wrench className="h-5 w-5" aria-hidden="true" />}
        />
        <p className="px-4 text-xs text-muted-foreground">{t('tooling.complianceNote')}</p>

        {!organizationId ? (
          <Alert>
            <AlertDescription>{t('tooling.selectOrganization')}</AlertDescription>
          </Alert>
        ) : (
          <Tabs value={view} onValueChange={setView} className="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="inline-flex h-auto w-max min-w-full justify-start sm:min-w-0" aria-label={t('toolingMaster.list.tabsLabel')}>
                {VIEWS.map((item) => (
                  <TabsTrigger key={item} value={item} className="whitespace-nowrap" data-testid={`tooling-view-${item}`}>
                    {t(`toolingMaster.list.tabs.${item}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="tools">
              <ToolsView organizationId={organizationId} canManage={canManage} />
            </TabsContent>
            <TabsContent value="products">
              <ProductPartsCatalog organizationId={organizationId} canManage={canManage} />
            </TabsContent>
            <TabsContent value="operations">
              <ProductionOperationsCatalog organizationId={organizationId} canManage={canManage} />
            </TabsContent>
            <TabsContent value="designs">
              <ToolingDesignsCatalog organizationId={organizationId} canManage={canManage} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Page>
  );
}
