import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import WorkOrderFilterPopover from './WorkOrderFilterPopover';
import WorkOrderSortPopover from './WorkOrderSortPopover';
import type { WorkOrderFiltersToolbarProps } from '@/features/work-orders/types/workOrderFiltersToolbarTypes';
import {
  getWorkOrderListPriorityLabels,
  getWorkOrderListStatusLabels,
} from '@/features/work-orders/utils/workOrderListLabels';
import { useI18n } from '@/i18n';

type WorkOrderToolbarProps = Omit<
  WorkOrderFiltersToolbarProps,
  'showMobileFilters' | 'onShowMobileFiltersChange'
>;

const WorkOrderToolbar: React.FC<WorkOrderToolbarProps> = ({
  filters,
  activeFilterCount,
  activePresets,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  sortField,
  sortDirection,
  onSortChange,
  hideDueDateFilter = false,
  showSearchAndSort = true,
  rangeToggle,
  viewToggle,
}) => {
  const { t } = useI18n();
  const hasActiveFilters = activeFilterCount > 0 || filters.searchQuery.length > 0;
  const statusLabels = getWorkOrderListStatusLabels(t);
  const priorityLabels = getWorkOrderListPriorityLabels(t);
  const dueDateLabels: Record<string, string> = {
    overdue: t('workOrders.list.overdue'),
    today: t('workOrders.list.dueToday'),
    this_week: t('workOrders.list.thisWeek'),
  };
  const invoiceLabels: Record<string, string> = {
    paid: t('workOrders.list.paid'),
    unpaid: t('workOrders.list.unpaid'),
    overdue: t('workOrders.list.overdue'),
    not_exported: t('workOrders.list.notExported'),
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {showSearchAndSort ? (
          <>
            <div className="relative flex-1 max-w-65">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('workOrders.list.searchPlaceholder')}
                value={filters.searchQuery}
                onChange={(event) => onFilterChange('searchQuery', event.target.value)}
                className="h-8 pl-8 text-sm bg-transparent"
                aria-label={t('workOrders.list.searchAria')}
              />
              {filters.searchQuery && (
                <button
                  onClick={() => onFilterChange('searchQuery', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t('workOrders.list.clearSearchAria')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Separator orientation="vertical" className="h-5" />
          </>
        ) : null}

        <WorkOrderFilterPopover
          filters={filters}
          activeFilterCount={activeFilterCount}
          activePresets={activePresets}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          onQuickFilter={onQuickFilter}
          hideDueDateFilter={hideDueDateFilter}
        />

        {showSearchAndSort ? (
          <WorkOrderSortPopover
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        ) : null}

        {rangeToggle}

        <div className="flex-1" />

        {viewToggle ? (
          <>
            <Separator orientation="vertical" className="h-5 hidden md:block" />
            {viewToggle}
          </>
        ) : null}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">{t('workOrders.list.active')}</span>

          {filters.statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {t('workOrders.list.status')}: {statusLabels[filters.statusFilter] ?? filters.statusFilter}
              <button
                onClick={() => onFilterChange('statusFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label={t('workOrders.list.clearStatusFilterAria')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.assigneeFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {t('workOrders.list.assignee')}:{' '}
              {filters.assigneeFilter === 'mine'
                ? t('workOrders.list.mine')
                : filters.assigneeFilter === 'unassigned'
                  ? t('workOrders.list.unassigned')
                  : filters.assigneeFilter}
              <button
                onClick={() => onFilterChange('assigneeFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label={t('workOrders.list.clearAssigneeFilterAria')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.priorityFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {t('workOrders.list.priority')}:{' '}
              {priorityLabels[filters.priorityFilter] ?? filters.priorityFilter}
              <button
                onClick={() => onFilterChange('priorityFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label={t('workOrders.list.clearPriorityFilterAria')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {!hideDueDateFilter && filters.dueDateFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {t('workOrders.list.due')}: {dueDateLabels[filters.dueDateFilter] ?? filters.dueDateFilter}
              <button
                onClick={() => onFilterChange('dueDateFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label={t('workOrders.list.clearDueDateFilterAria')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.invoiceFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {t('workOrders.list.invoice')}:{' '}
              {invoiceLabels[filters.invoiceFilter] ?? filters.invoiceFilter}
              <button
                onClick={() => onFilterChange('invoiceFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label={t('workOrders.list.clearInvoiceFilterAria')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            {t('workOrders.list.clearAll')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkOrderToolbar;
