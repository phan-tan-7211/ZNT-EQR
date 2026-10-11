import React, { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  COST_RESTRICTED_WIDGET_IDS,
  getAllWidgets,
} from '@/features/dashboard/registry/widgetRegistry';
import { useCanViewWorkOrderCosts } from '@/features/work-orders/hooks/useCanViewWorkOrderCosts';
import type { WidgetCategory, WidgetDefinition } from '@/features/dashboard/types/dashboard';
import { useI18n } from '@/i18n';

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onAddWidget: (widgetId: string) => void;
  onRemoveWidget: (widgetId: string) => void;
}

const CATEGORY_KEYS: Record<WidgetCategory, string> = {
  overview: 'dashboard.categories.overview',
  'work-orders': 'dashboard.categories.workOrders',
  equipment: 'dashboard.categories.equipment',
  team: 'dashboard.categories.team',
  inventory: 'dashboard.categories.inventory',
};

const WIDGET_KEYS: Record<string, { title: string; description: string }> = {
  'stats-grid': { title: 'dashboard.widgets.statsGridTitle', description: 'dashboard.widgets.statsGridDescription' },
  'fleet-efficiency': { title: 'dashboard.widgets.fleetEfficiencyTitle', description: 'dashboard.widgets.fleetEfficiencyDescription' },
  'recent-equipment': { title: 'dashboard.widgets.recentEquipmentTitle', description: 'dashboard.widgets.recentEquipmentDescription' },
  'recent-work-orders': { title: 'dashboard.widgets.recentWorkOrdersTitle', description: 'dashboard.widgets.recentWorkOrdersDescription' },
  'high-priority-wo': { title: 'dashboard.widgets.highPriorityWoTitle', description: 'dashboard.widgets.highPriorityWoDescription' },
  'pm-compliance': { title: 'dashboard.widgets.pmComplianceTitle', description: 'dashboard.widgets.pmComplianceDescription' },
  'equipment-by-status': { title: 'dashboard.widgets.equipmentByStatusTitle', description: 'dashboard.widgets.equipmentByStatusDescription' },
  'cost-trend': { title: 'dashboard.widgets.costTrendTitle', description: 'dashboard.widgets.costTrendDescription' },
  'quick-actions': { title: 'dashboard.widgets.quickActionsTitle', description: 'dashboard.widgets.quickActionsDescription' },
  'tooling-attention': { title: 'dashboard.widgets.toolingAttentionTitle', description: 'dashboard.widgets.toolingAttentionDescription' },
};

const CATEGORY_ORDER: WidgetCategory[] = ['overview', 'equipment', 'work-orders', 'team', 'inventory'];

export const WidgetCatalog: React.FC<WidgetCatalogProps> = ({
  open,
  onOpenChange,
  activeWidgetIds,
  onAddWidget,
  onRemoveWidget,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const canViewWorkOrderCosts = useCanViewWorkOrderCosts();
  const allWidgets = useMemo(
    () =>
      getAllWidgets().filter(
        (w) => canViewWorkOrderCosts || !COST_RESTRICTED_WIDGET_IDS.includes(w.id)
      ),
    [canViewWorkOrderCosts]
  );

  const localizedWidgets = useMemo(
    () => allWidgets.map((widget) => {
      const keys = WIDGET_KEYS[widget.id];
      return {
        widget,
        title: keys ? t(keys.title) : widget.title,
        description: keys ? t(keys.description) : widget.description,
      };
    }),
    [allWidgets, t]
  );

  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) return localizedWidgets;
    const q = searchQuery.toLowerCase();
    return localizedWidgets.filter(
      ({ title, description }) => title.toLowerCase().includes(q) || description.toLowerCase().includes(q)
    );
  }, [localizedWidgets, searchQuery]);

  const groupedWidgets = useMemo(() => {
    const groups = new Map<WidgetCategory, Array<{ widget: WidgetDefinition; title: string; description: string }>>();
    for (const item of filteredWidgets) {
      const group = groups.get(item.widget.category);
      if (group) group.push(item);
      else groups.set(item.widget.category, [item]);
    }
    return groups;
  }, [filteredWidgets]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('dashboard.widgetCatalog')}</SheetTitle>
          <SheetDescription>{t('dashboard.widgetCatalogDescription')}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchWidgets')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {CATEGORY_ORDER.map((category) => {
            const widgets = groupedWidgets.get(category);
            if (!widgets || widgets.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t(CATEGORY_KEYS[category])}
                </h3>
                <div className="space-y-2">
                  {widgets.map(({ widget, title, description }) => {
                    const isActive = activeWidgetIds.includes(widget.id);
                    const Icon = widget.icon;

                    return (
                      <div
                        key={widget.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                          isActive ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                            isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{title}</p>
                            {isActive && (
                              <Badge variant="secondary" className="text-xs shrink-0">{t('dashboard.active')}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
                        </div>
                        <Button
                          variant={isActive ? 'outline' : 'default'}
                          size="sm"
                          className="shrink-0"
                          onClick={() => isActive ? onRemoveWidget(widget.id) : onAddWidget(widget.id)}
                          aria-label={isActive ? t('dashboard.removeWidget', { name: title }) : t('dashboard.addWidget', { name: title })}
                        >
                          {isActive ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredWidgets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{t('dashboard.noWidgetMatches')}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
