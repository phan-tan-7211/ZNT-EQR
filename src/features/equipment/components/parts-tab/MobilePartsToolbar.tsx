import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import {
  PartsFiltersState,
  PartsSortField,
  PartsSortOrder,
  SORT_OPTIONS,
  StockFilter,
  STOCK_FILTER_OPTIONS,
} from './types';
import { createPartsSortChangeHandler, partsToolbarSortValue } from './partsSortHandlers';
import { PartsSelectContent } from './PartsSelectContent';
import { useI18n } from '@/i18n';

interface MobilePartsToolbarProps {
  filters: PartsFiltersState;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (search: string) => void;
  onStockFilterChange: (filter: StockFilter) => void;
  onHasAlternatesChange: (value: boolean) => void;
  onSortChange: (field: PartsSortField, order: PartsSortOrder) => void;
  onClearFilters: () => void;
}

export const MobilePartsToolbar: React.FC<MobilePartsToolbarProps> = ({
  filters,
  activeFilterCount,
  hasActiveFilters,
  onSearchChange,
  onStockFilterChange,
  onHasAlternatesChange,
  onSortChange,
  onClearFilters,
}) => {
  const { t } = useI18n();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const currentSortValue = partsToolbarSortValue(filters.sortField, filters.sortOrder);
  const handleSortChange = createPartsSortChangeHandler(onSortChange);

  const getStockFilterLabel = (value: StockFilter) => {
    const option = STOCK_FILTER_OPTIONS.find((item) => item.value === value);
    return option ? t(option.labelKey) : value;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('equipmentParts.searchParts')}
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[120px] h-10">
            <SelectValue placeholder={t('equipmentParts.sort')} />
          </SelectTrigger>
          <PartsSelectContent options={SORT_OPTIONS} />
        </Select>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10"
              aria-label={t('equipmentParts.openFilters')}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-[60dvh] p-0">
            <div className="p-6 pb-0">
              <SheetHeader className="pb-4">
                <SheetTitle>{t('equipmentParts.filterParts')}</SheetTitle>
                <SheetDescription>{t('equipmentParts.filterDescription')}</SheetDescription>
              </SheetHeader>
            </div>

            <ScrollArea className="h-[calc(60dvh-120px)] px-6">
              <div className="space-y-6 pb-6">
                <div>
                  <Label className="mb-2 block text-sm font-medium">
                    {t('equipmentParts.stockStatusTitle')}
                  </Label>
                  <Select
                    value={filters.stockFilter}
                    onValueChange={(value) => onStockFilterChange(value as StockFilter)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t('equipmentParts.stockAll')} />
                    </SelectTrigger>
                    <PartsSelectContent options={STOCK_FILTER_OPTIONS} />
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="mobile-alternates-toggle"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('equipmentParts.showOnlyAlternates')}
                  </Label>
                  <Switch
                    id="mobile-alternates-toggle"
                    checked={filters.hasAlternatesOnly}
                    onCheckedChange={onHasAlternatesChange}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    onClearFilters();
                    setIsSheetOpen(false);
                  }}
                  className="h-12 w-full"
                >
                  {t('equipmentParts.clearAllFilters')}
                </Button>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {t('equipmentParts.searchBadge', { query: filters.search })}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange('')} />
            </Badge>
          )}
          {filters.stockFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {getStockFilterLabel(filters.stockFilter)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onStockFilterChange('all')}
              />
            </Badge>
          )}
          {filters.hasAlternatesOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {t('equipmentParts.alternatesOnly')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onHasAlternatesChange(false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
