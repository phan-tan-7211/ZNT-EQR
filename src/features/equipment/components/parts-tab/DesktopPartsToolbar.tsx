import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, RefreshCw } from 'lucide-react';
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

interface DesktopPartsToolbarProps {
  filters: PartsFiltersState;
  hasActiveFilters: boolean;
  onSearchChange: (search: string) => void;
  onStockFilterChange: (filter: StockFilter) => void;
  onHasAlternatesChange: (value: boolean) => void;
  onSortChange: (field: PartsSortField, order: PartsSortOrder) => void;
  onClearFilters: () => void;
}

export const DesktopPartsToolbar: React.FC<DesktopPartsToolbarProps> = ({
  filters,
  hasActiveFilters,
  onSearchChange,
  onStockFilterChange,
  onHasAlternatesChange,
  onSortChange,
  onClearFilters,
}) => {
  const { t } = useI18n();
  const currentSortValue = partsToolbarSortValue(filters.sortField, filters.sortOrder);
  const handleSortChange = createPartsSortChangeHandler(onSortChange);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('equipmentParts.searchParts')}
          value={filters.search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={currentSortValue} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('equipmentParts.sortBy')} />
        </SelectTrigger>
        <PartsSelectContent options={SORT_OPTIONS} />
      </Select>

      <Select
        value={filters.stockFilter}
        onValueChange={(value) => onStockFilterChange(value as StockFilter)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('equipmentParts.stockStatus')} />
        </SelectTrigger>
        <PartsSelectContent options={STOCK_FILTER_OPTIONS} />
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="alternates-toggle"
          checked={filters.hasAlternatesOnly}
          onCheckedChange={onHasAlternatesChange}
        />
        <Label
          htmlFor="alternates-toggle"
          className="text-sm cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('equipmentParts.alternatesOnly')}
        </Label>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          {t('equipmentParts.clear')}
        </Button>
      )}
    </div>
  );
};
