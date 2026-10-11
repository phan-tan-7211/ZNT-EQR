import React, { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getWidget } from '@/features/dashboard/registry/widgetRegistry';
import { useI18n } from '@/i18n';

interface WidgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onSave: (newOrder: string[]) => void;
  onOpenCatalog: () => void;
}

const WIDGET_TITLE_KEYS: Record<string, string> = {
  'stats-grid': 'dashboard.widgets.statsGridTitle',
  'fleet-efficiency': 'dashboard.widgets.fleetEfficiencyTitle',
  'recent-equipment': 'dashboard.widgets.recentEquipmentTitle',
  'recent-work-orders': 'dashboard.widgets.recentWorkOrdersTitle',
  'high-priority-wo': 'dashboard.widgets.highPriorityWoTitle',
  'pm-compliance': 'dashboard.widgets.pmComplianceTitle',
  'equipment-by-status': 'dashboard.widgets.equipmentByStatusTitle',
  'cost-trend': 'dashboard.widgets.costTrendTitle',
  'quick-actions': 'dashboard.widgets.quickActionsTitle',
  'tooling-attention': 'dashboard.widgets.toolingAttentionTitle',
};

export const WidgetManager: React.FC<WidgetManagerProps> = ({
  open,
  onOpenChange,
  activeWidgetIds,
  onSave,
  onOpenCatalog,
}) => {
  const { t } = useI18n();
  const [order, setOrder] = useState<string[]>(activeWidgetIds);

  React.useEffect(() => {
    if (open) setOrder(activeWidgetIds);
  }, [open, activeWidgetIds]);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const removeFromOrder = useCallback((widgetId: string) => {
    setOrder((prev) => prev.filter((id) => id !== widgetId));
  }, []);

  const handleSave = () => {
    onSave(order);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOrder(activeWidgetIds);
    onOpenChange(false);
  };

  const handleOpenCatalog = () => {
    onOpenChange(false);
    onOpenCatalog();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col pb-safe">
        <SheetHeader className="text-left shrink-0">
          <SheetTitle>{t('dashboard.customizeDashboard')}</SheetTitle>
          <SheetDescription>{t('dashboard.customizeDashboardDescription')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {order.map((widgetId, index) => {
            const widget = getWidget(widgetId);
            if (!widget) return null;
            const Icon = widget.icon;
            const title = WIDGET_TITLE_KEYS[widgetId] ? t(WIDGET_TITLE_KEYS[widgetId]) : widget.title;

            return (
              <div key={widgetId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => moveUp(index)} aria-label={t('dashboard.moveWidgetUp', { name: title })}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === order.length - 1} onClick={() => moveDown(index)} aria-label={t('dashboard.moveWidgetDown', { name: title })}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeFromOrder(widgetId)} aria-label={t('dashboard.removeWidget', { name: title })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {order.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{t('dashboard.noWidgets')}</p>
          )}
        </div>

        <SheetFooter className="mt-4 shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto gap-1.5" onClick={handleOpenCatalog}>
            <Plus className="h-4 w-4" />
            {t('dashboard.addWidgets')}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleCancel}>{t('dashboard.cancel')}</Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSave}>{t('dashboard.save')}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
