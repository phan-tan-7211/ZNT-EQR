import { useI18n } from '@/i18n';
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';

interface NotificationsFilterPopoverProps {
  filterType: string;
  filterRead: string;
  activeFilterCount: number;
  onFilterTypeChange: (value: string) => void;
  onFilterReadChange: (value: string) => void;
  onClearFilters: () => void;
}

const NotificationsFilterPopover: React.FC<NotificationsFilterPopoverProps> = ({
  filterType,
  filterRead,
  activeFilterCount,
  onFilterTypeChange,
  onFilterReadChange,
  onClearFilters,
}) => {
  const { t } = useI18n();
  return (
    <FilterPopoverShell ariaSubject={t('notificationPage.title')} activeFilterCount={activeFilterCount} triggerLabel={t('notificationPage.filter')} triggerAriaLabel={t('notificationPage.filterAria', { count: activeFilterCount })} headerLabel={t('notificationPage.filters')}>
      {({ close }) => (
        <>
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t('notificationPage.type')}</span>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="h-8 text-sm" aria-label={t('notificationPage.filterType')}>
                <SelectValue placeholder={t('notificationPage.allTypesPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('notificationPage.allTypes')}</SelectItem>
                <SelectItem value="work_order_submitted">{t('notificationPage.work_order_submitted')}</SelectItem>
                <SelectItem value="work_order_accepted">{t('notificationPage.work_order_accepted')}</SelectItem>
                <SelectItem value="work_order_assigned">{t('notificationPage.work_order_assigned')}</SelectItem>
                <SelectItem value="work_order_in_progress">{t('notificationPage.work_order_in_progress')}</SelectItem>
                <SelectItem value="work_order_on_hold">{t('notificationPage.work_order_on_hold')}</SelectItem>
                <SelectItem value="work_order_completed">{t('notificationPage.work_order_completed')}</SelectItem>
                <SelectItem value="work_order_cancelled">{t('notificationPage.work_order_cancelled')}</SelectItem>
                <SelectItem value="ownership_transfer_request">{t('notificationPage.ownership_transfer_request')}</SelectItem>
                <SelectItem value="ownership_transfer_accepted">{t('notificationPage.ownership_transfer_accepted')}</SelectItem>
                <SelectItem value="ownership_transfer_rejected">{t('notificationPage.ownership_transfer_rejected')}</SelectItem>
                <SelectItem value="workspace_merge_request">{t('notificationPage.workspace_merge_request')}</SelectItem>
                <SelectItem value="workspace_merge_accepted">{t('notificationPage.workspace_merge_accepted')}</SelectItem>
                <SelectItem value="workspace_merge_rejected">{t('notificationPage.workspace_merge_rejected')}</SelectItem>
                <SelectItem value="member_added">{t('notificationPage.member_added')}</SelectItem>
                <SelectItem value="member_role_changed">{t('notificationPage.member_role_changed')}</SelectItem>
                <SelectItem value="team_member_added">{t('notificationPage.team_member_added')}</SelectItem>
                <SelectItem value="team_member_role_changed">{t('notificationPage.team_member_role_changed')}</SelectItem>
                <SelectItem value="audit_export">{t('notificationPage.audit_export')}</SelectItem>
                <SelectItem value="tooling_life_warning">{t('notificationPage.tooling_life_warning')}</SelectItem>
                <SelectItem value="tooling_life_limit">{t('notificationPage.tooling_life_limit')}</SelectItem>
                <SelectItem value="tooling_quarantined">{t('notificationPage.tooling_quarantined')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Read status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t('notificationPage.readStatus')}</span>
            <Select value={filterRead} onValueChange={onFilterReadChange}>
              <SelectTrigger className="h-8 text-sm" aria-label={t('notificationPage.filterRead')}>
                <SelectValue placeholder={t('notificationPage.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('notificationPage.all')}</SelectItem>
                <SelectItem value="unread">{t('notificationPage.unread')}</SelectItem>
                <SelectItem value="read">{t('notificationPage.read')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClearFilters();
                  close();
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                {t('notificationPage.clearAllFilters')}
              </Button>
            </>
          )}
        </>
      )}
    </FilterPopoverShell>
  );
};

export default NotificationsFilterPopover;
