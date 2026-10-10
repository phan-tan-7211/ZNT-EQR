import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Columns3, EyeOff, Filter, Forklift, MoreVertical, Pin, PinOff, QrCode, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableEmptyState, ResizableFixedDataTable } from '@/components/common/dataTableShared';
import { applyAutoFitColumnWidth, createResizableSortableColumnBase, getDataTableAlignClass, getResizableTableWidth, usePersistedColumnOrder, usePersistedColumnSizing } from '@/components/common/dataTableSharedUtils';
import { DotStatus } from '@/components/ui/dot-status';
import { DEFAULT_VISIBLE_COLUMNS, EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY, EQUIPMENT_TABLE_COLUMN_META, EQUIPMENT_TABLE_COLUMN_ORDER, getDefaultEquipmentColumnSizing, getEquipmentTableColumnMeta, type EquipmentTableColumnKey, type EquipmentTableSortField } from '@/features/equipment/components/equipmentTableColumns';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { safeFormatDate } from '@/features/equipment/utils/equipmentHelpers';
import { getEquipmentTableCellDisplayValue, type EquipmentTableRow } from '@/features/equipment/utils/equipmentTableRows';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useEquipmentCardTransition } from '@/features/equipment/transitions/useEquipmentCardTransition';
import { getEquipmentViewTransitionStyle } from '@/features/equipment/transitions/equipmentViewTransitionNames';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { getEquipmentDisplayImageUrl } from '@/services/imageUploadService';
import { getEquipmentStatusRailClass } from '@/lib/status-colors';
import { EquipmentImageHoverPreview } from '@/features/equipment/components/EquipmentImageHoverPreview';
import {
  IMAGE_HOVER_MEDIA_QUERY,
  IMAGE_HOVER_TRANSITION_MS,
  getImageHoverPosition,
  type EquipmentImageHover,
} from '@/features/equipment/utils/equipmentImageHover';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { EquipmentColumnFilterKey, EquipmentColumnFilters } from '@/features/equipment/services/EquipmentService';
import type { EquipmentColumnFilterOption, EquipmentColumnFilterOptions } from '@/features/equipment/hooks/useEquipmentFiltering';

const STATUS_COLUMN_KEY: EquipmentTableColumnKey = 'status';
const COLUMN_SIZING_STORAGE_KEY = 'equipqr:equipment-table-column-sizing:v3';
const COLUMN_ORDER_STORAGE_KEY = 'equipqr:equipment-table-column-order:v1';
const PINNED_COLUMNS_STORAGE_PREFIX = 'equipqr:equipment-table-pinned-columns:';
const COLUMN_KEYS: Record<EquipmentTableColumnKey, string> = { status:'equipment.status', name:'equipment.name', manufacturer:'equipment.manufacturer', model:'equipment.model', serial_number:'equipment.serialNumber', working_hours:'equipment.hours', location:'equipment.location', team_name:'equipment.team', last_maintenance:'equipment.lastMaintenanceFull', management_responsible_primary:'equipment.managementResponsiblePrimary', management_responsible_secondary:'equipment.managementResponsibleSecondary' };
const DEFAULT_EQUIPMENT_COLUMN_SIZING = getDefaultEquipmentColumnSizing();
const COLUMN_DRAG_THRESHOLD_PX = 6;
export interface EquipmentTableProps { equipment: EquipmentTableRow[]; onShowQRCode: (id:string)=>void; pmStatuses?:Map<string,EquipmentPMStatus>; sortConfig?:SortConfig; onSortChange?:(field:string,direction?:'asc'|'desc')=>void; visibleColumns?:Record<string,boolean>; onToggleColumn?:(key:string)=>void; organizationId?:string; columnFilterOptions?:EquipmentColumnFilterOptions; columnFilters?:EquipmentColumnFilters; onColumnFilterChange?:(key:EquipmentColumnFilterKey,values:string[])=>void; }

function readPinnedColumns(storageKey: string): EquipmentTableColumnKey[] {
  const defaultPinned: EquipmentTableColumnKey[] = [STATUS_COLUMN_KEY];
  try {
    const raw = getPreferenceLocalStorage(storageKey);
    if (!raw) return defaultPinned;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPinned;
    return parsed.filter((key): key is EquipmentTableColumnKey => EQUIPMENT_TABLE_COLUMN_ORDER.includes(key));
  } catch {
    return defaultPinned;
  }
}

function EquipmentColumnHeaderMenu({
  columnKey,
  visibleColumns,
  pinned,
  onToggleColumn,
  onTogglePin,
  onHideColumn,
  filterOptions,
  selectedFilterValues,
  onColumnFilterChange,
}: {
  columnKey: EquipmentTableColumnKey;
  visibleColumns: Record<string, boolean>;
  pinned: boolean;
  onToggleColumn: (key: EquipmentTableColumnKey) => void;
  onTogglePin: (key: EquipmentTableColumnKey) => void;
  onHideColumn: (key: EquipmentTableColumnKey) => void;
  filterOptions?: EquipmentColumnFilterOption[];
  selectedFilterValues: string[];
  onColumnFilterChange?: (key: EquipmentColumnFilterKey, values: string[]) => void;
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const meta = getEquipmentTableColumnMeta(columnKey);
  if (!meta) return null;
  const label = t(COLUMN_KEYS[columnKey]);
  const canHide = meta.canHide;

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (!open) setFilterOpen(false);
      }}
    >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 z-20 h-6 w-6 -translate-y-1/2 rounded-md bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={t('equipment.columnOptions', { column: label })}
            data-table-column-options
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={filterOpen ? 'w-64 p-0' : 'w-52'}>
          {filterOpen && filterOptions?.length && onColumnFilterChange ? (
            <EquipmentColumnFilterPanel
              columnKey={columnKey as EquipmentColumnFilterKey}
              label={label}
              options={filterOptions}
              selectedValues={selectedFilterValues}
              onChange={onColumnFilterChange}
              onClose={() => setFilterOpen(false)}
            />
          ) : (
            <>
              {filterOptions?.length && onColumnFilterChange ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    // Keep this menu mounted and swap its contents in place.
                    // A second portal would create a pointer gap and close
                    // before the user can reach the checkboxes.
                    event.preventDefault();
                    setFilterOpen(true);
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>{t('equipment.filterColumn', { column: label })}</span>
                  {selectedFilterValues.length > 0 ? (
                    <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">
                      {selectedFilterValues.length > 9 ? '9+' : selectedFilterValues.length}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Columns3 className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>{t('equipment.showColumns')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                  {EQUIPMENT_TABLE_COLUMN_META.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleColumns[column.key] ?? column.defaultVisible}
                      disabled={!column.canHide}
                      onCheckedChange={() => onToggleColumn(column.key)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {t(COLUMN_KEYS[column.key])}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => onTogglePin(columnKey)}>
                {pinned ? <PinOff className="mr-2 h-4 w-4" aria-hidden="true" /> : <Pin className="mr-2 h-4 w-4" aria-hidden="true" />}
                {pinned ? t('equipment.unpinColumn') : t('equipment.pinColumn')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canHide} onSelect={() => onHideColumn(columnKey)}>
                <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('equipment.hideColumn')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}

function EquipmentColumnFilterPanel({
  columnKey,
  label,
  options,
  selectedValues,
  onChange,
  onClose,
}: {
  columnKey: EquipmentColumnFilterKey;
  label: string;
  options: EquipmentColumnFilterOption[];
  selectedValues: string[];
  onChange: (key: EquipmentColumnFilterKey, values: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const selected = useMemo(() => new Set(selectedValues), [selectedValues]);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return options;
    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedSearch));
  }, [options, search]);

  const toggleValue = useCallback((value: string) => {
    const next = selected.has(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onChange(columnKey, next);
  }, [columnKey, onChange, selected, selectedValues]);

  if (!options.length) return null;

  return (
    <div className="w-64" onPointerDown={(event) => event.stopPropagation()}>
      <div className="border-b p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-sm font-medium">{label}</div>
          <div className="flex shrink-0 items-center gap-1">
            {selectedValues.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onChange(columnKey, [])}
              >
                <X className="mr-1 h-3 w-3" aria-hidden="true" />
                {t('equipment.clearColumnFilter')}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Close ${label} filter`} onClick={onClose}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('equipment.searchColumnValues')}
            aria-label={t('equipment.searchColumnValues')}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {selectedValues.length > 0
            ? t('equipment.columnFilterSelected', { count: selectedValues.length })
            : t('equipment.columnFilterAllValues', { count: options.length })}
        </span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => onChange(columnKey, options.map((option) => option.value))}
        >
          {t('equipment.selectAllColumnValues')}
        </Button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {filteredOptions.length ? filteredOptions.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={selected.has(option.value)}
              onCheckedChange={() => toggleValue(option.value)}
              aria-label={option.label}
            />
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        )) : (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            {t('equipment.noColumnValues')}
          </div>
        )}
      </div>
    </div>
  );
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipment, onShowQRCode, sortConfig, onSortChange, visibleColumns, onToggleColumn, organizationId, columnFilterOptions, columnFilters, onColumnFilterChange }) => {
  const { t } = useI18n();
  const { beginTransition, activeEquipmentId } = useEquipmentCardTransition();
  const { settings } = useUserSettings();
  const [imageHover, setImageHover] = useState<EquipmentImageHover | null>(null);
  const [imageHoverVisible, setImageHoverVisible] = useState(false);
  const imageHoverCloseTimer = useRef<number | null>(null);
  const imageHoverRef = useRef<EquipmentImageHover | null>(null);
  const imageHoverFrame = useRef<number | null>(null);
  const columnInteractionRef = useRef(false);
  const [columnSizing, setColumnSizing] = usePersistedColumnSizing(COLUMN_SIZING_STORAGE_KEY, DEFAULT_EQUIPMENT_COLUMN_SIZING);
  const [columnOrder, setColumnOrder] = usePersistedColumnOrder(COLUMN_ORDER_STORAGE_KEY, [...EQUIPMENT_TABLE_COLUMN_ORDER]);
  const [internalVisibleColumns, setInternalVisibleColumns] = useState<Record<string, boolean>>(() => ({ ...DEFAULT_VISIBLE_COLUMNS }));
  const effectiveVisibleColumns = visibleColumns ?? internalVisibleColumns;
  const pinnedStorageKey = `${PINNED_COLUMNS_STORAGE_PREFIX}${organizationId ?? 'default'}`;
  const [pinnedColumns, setPinnedColumns] = useState<EquipmentTableColumnKey[]>(() => readPinnedColumns(pinnedStorageKey));
  const [draggedColumnId, setDraggedColumnId] = useState<EquipmentTableColumnKey | null>(null);
  const [activeDndColumnId, setActiveDndColumnId] = useState<EquipmentTableColumnKey | null>(null);
  const columnFiltersRef = useRef(columnFilters ?? {});
  columnFiltersRef.current = columnFilters ?? {};
  const getColumnFilterValues = useCallback(
    (key: EquipmentColumnFilterKey) => columnFiltersRef.current[key] ?? [],
    [],
  );

  useEffect(() => {
    setPinnedColumns(readPinnedColumns(pinnedStorageKey));
  }, [pinnedStorageKey]);

  useEffect(() => {
    setPreferenceLocalStorage(pinnedStorageKey, JSON.stringify(pinnedColumns));
  }, [pinnedColumns, pinnedStorageKey]);

  const clearImageHoverCloseTimer = useCallback(() => {
    if (imageHoverCloseTimer.current === null) return;
    window.clearTimeout(imageHoverCloseTimer.current);
    imageHoverCloseTimer.current = null;
  }, []);

  const closeImageHover = useCallback(() => {
    if (!imageHoverRef.current) return;
    setImageHoverVisible(false);
    if (imageHoverCloseTimer.current !== null) return;
    imageHoverCloseTimer.current = window.setTimeout(() => {
      imageHoverRef.current = null;
      setImageHover(null);
      imageHoverCloseTimer.current = null;
    }, IMAGE_HOVER_TRANSITION_MS);
  }, []);

  const openImageHover = useCallback((thumbnail: HTMLElement, clientX: number, clientY: number) => {
    const src = thumbnail.dataset.equipmentImageSrc;
    if (!src || !window.matchMedia(IMAGE_HOVER_MEDIA_QUERY).matches) {
      closeImageHover();
      return;
    }
    clearImageHoverCloseTimer();
    const nextHover = {
      src,
      alt: thumbnail.dataset.equipmentImageAlt ?? 'Equipment image',
      ...getImageHoverPosition(clientX, clientY),
    };
    const previousHover = imageHoverRef.current;
    imageHoverRef.current = nextHover;
    setImageHoverVisible(true);
    // Render a new image immediately, but coalesce position-only updates to one
    // animation frame instead of re-rendering on every pointer event.
    if (!previousHover || previousHover.src !== nextHover.src) {
      setImageHover(nextHover);
      return;
    }
    if (imageHoverFrame.current !== null) return;
    imageHoverFrame.current = window.requestAnimationFrame(() => {
      imageHoverFrame.current = null;
      if (imageHoverRef.current) setImageHover({ ...imageHoverRef.current });
    });
  }, [clearImageHoverCloseTimer, closeImageHover]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (event.buttons !== 0 || columnInteractionRef.current) return;
      const target = event.target;
      const thumbnail = target instanceof Element
        ? target.closest<HTMLElement>('[data-equipment-thumbnail]')
        : null;
      if (!thumbnail) {
        closeImageHover();
        return;
      }
      openImageHover(thumbnail, event.clientX, event.clientY);
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('mouseleave', closeImageHover, true);
    window.addEventListener('blur', closeImageHover);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('mouseleave', closeImageHover, true);
      window.removeEventListener('blur', closeImageHover);
    };
  }, [closeImageHover, openImageHover]);

  useEffect(() => () => {
    clearImageHoverCloseTimer();
    if (imageHoverFrame.current !== null) {
      window.cancelAnimationFrame(imageHoverFrame.current);
      imageHoverFrame.current = null;
    }
    imageHoverRef.current = null;
  }, [clearImageHoverCloseTimer]);
  const isColumnVisible = useCallback((key:EquipmentTableColumnKey)=>{ const meta=getEquipmentTableColumnMeta(key); if(meta&&!meta.canHide)return true; return effectiveVisibleColumns[key]??true; },[effectiveVisibleColumns]);
  const visibleColumnKeys=useMemo(()=>EQUIPMENT_TABLE_COLUMN_ORDER.filter((key)=>isColumnVisible(key)),[isColumnVisible]);
  const orderedColumnKeys=useMemo(()=>{ const visible=new Set(visibleColumnKeys); const saved=columnOrder.filter((key): key is EquipmentTableColumnKey=>visible.has(key as EquipmentTableColumnKey)); const missing=visibleColumnKeys.filter((key)=>!saved.includes(key)); return [...saved,...missing]; },[columnOrder,visibleColumnKeys]);
  const orderedVisibleColumnKeys=useMemo(()=>{ const pinned=pinnedColumns.filter((key)=>orderedColumnKeys.includes(key)); return [...pinned,...orderedColumnKeys.filter((key)=>!pinned.includes(key))]; },[orderedColumnKeys,pinnedColumns]);
  const pinnedLeftOffsets=useMemo(()=>{ const offsets=new Map<EquipmentTableColumnKey,number>(); let left=0; for(const key of orderedVisibleColumnKeys){ if(!pinnedColumns.includes(key)) continue; offsets.set(key,left); const meta=getEquipmentTableColumnMeta(key); left+=columnSizing[key]??meta?.defaultWidth??0; } return offsets; },[columnSizing,orderedVisibleColumnKeys,pinnedColumns]);
  const handleToggleColumn=useCallback((key:EquipmentTableColumnKey)=>{ const meta=getEquipmentTableColumnMeta(key); if(!meta||!meta.canHide)return; if(onToggleColumn){ onToggleColumn(key); return; } setInternalVisibleColumns((current)=>({...current,[key]:!(current[key]??meta.defaultVisible)})); },[onToggleColumn]);
  const handleTogglePin=useCallback((key:EquipmentTableColumnKey)=>{ setPinnedColumns((current)=>current.includes(key)?current.filter((column)=>column!==key):[...current,key]); },[]);
  const handleHideColumn=useCallback((key:EquipmentTableColumnKey)=>{ const meta=getEquipmentTableColumnMeta(key); if(meta?.canHide&&isColumnVisible(key))handleToggleColumn(key); },[handleToggleColumn,isColumnVisible]);
  const commitColumnReorder=useCallback((sourceColumnId:EquipmentTableColumnKey,targetColumnId:EquipmentTableColumnKey)=>{ if(sourceColumnId===targetColumnId)return; const nextVisibleOrder=[...orderedVisibleColumnKeys]; const sourceIndex=nextVisibleOrder.indexOf(sourceColumnId); const targetIndex=nextVisibleOrder.indexOf(targetColumnId); if(sourceIndex===-1||targetIndex===-1)return; nextVisibleOrder.splice(sourceIndex,1); nextVisibleOrder.splice(targetIndex,0,sourceColumnId); const pinned=nextVisibleOrder.filter((key)=>pinnedColumns.includes(key)); const unpinned=nextVisibleOrder.filter((key)=>!pinnedColumns.includes(key)); const nextVisible=[...pinned,...unpinned]; setColumnOrder((current)=>[...nextVisible,...current.filter((key)=>!nextVisible.includes(key as EquipmentTableColumnKey))]); },[orderedVisibleColumnKeys,pinnedColumns,setColumnOrder]);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: COLUMN_DRAG_THRESHOLD_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const columnId = event.active.id as EquipmentTableColumnKey;
    if (!orderedVisibleColumnKeys.includes(columnId)) return;
    columnInteractionRef.current = true;
    closeImageHover();
    setActiveDndColumnId(columnId);
    setDraggedColumnId(columnId);
  }, [closeImageHover, orderedVisibleColumnKeys]);
  const clearDndDrag = useCallback(() => {
    columnInteractionRef.current = false;
    setActiveDndColumnId(null);
    setDraggedColumnId(null);
  }, []);
  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    const sourceColumnId = event.active.id as EquipmentTableColumnKey;
    const targetColumnId = event.over?.id as EquipmentTableColumnKey | undefined;
    if (targetColumnId && sourceColumnId !== targetColumnId && orderedVisibleColumnKeys.includes(targetColumnId)) {
      commitColumnReorder(sourceColumnId, targetColumnId);
    }
    clearDndDrag();
  }, [clearDndDrag, commitColumnReorder, orderedVisibleColumnKeys]);
  const handleSortClick=useCallback((field:EquipmentTableSortField)=>{ if(!onSortChange)return; const next=sortConfig?.field===field?(sortConfig.direction==='asc'?'desc':'asc'):'asc'; onSortChange(field,next); },[onSortChange,sortConfig]);
  const handleAutoFitColumn=useCallback((columnKey:EquipmentTableColumnKey)=>{ const meta=getEquipmentTableColumnMeta(columnKey); if(!meta)return; applyAutoFitColumnWidth(setColumnSizing,columnKey,equipment.map((row)=>getEquipmentTableCellDisplayValue(row,columnKey,settings)),meta); },[equipment,settings,setColumnSizing]);
  const columns=useMemo<ColumnDef<EquipmentTableRow>[]>(()=>{
    const dataColumns=orderedVisibleColumnKeys.map((columnKey)=>{ const rawMeta=getEquipmentTableColumnMeta(columnKey); if(!rawMeta)throw new Error(`Missing equipment table column meta for ${columnKey}`); const meta={...rawMeta,title:t(COLUMN_KEYS[columnKey])}; const base=createResizableSortableColumnBase(columnKey,DEFAULT_EQUIPMENT_COLUMN_SIZING,meta,{active:sortConfig?.field===meta.sortField,sortOrder:sortConfig?.field===meta.sortField?sortConfig.direction:undefined,onSort:()=>handleSortClick(meta.sortField),hideVisibleTitle:columnKey===STATUS_COLUMN_KEY}); return { ...base, header:()=> <div className="min-w-0">{base.header()}</div>, cell:({row})=>{ const item=row.original; switch(columnKey){
      case 'name': { const active=activeEquipmentId===item.id; return <div className="min-w-0"><button type="button" className="block w-full truncate text-left font-medium hover:text-primary" data-equipment-id={item.id} {...(active?{'data-equipment-transition-active':''}:{})} style={getEquipmentViewTransitionStyle('name',active)} onClick={()=>{void beginTransition({equipmentId:item.id,to:`/dashboard/equipment/${item.id}`});}}>{item.name}</button>{item.management_code ? <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{item.management_code}</span> : null}</div>; }
      case 'status': {
        const imageSrc = getEquipmentDisplayImageUrl(item.image_url, 'thumb');
        const imageHoverSrc =
          getEquipmentDisplayImageUrl(item.image_url, 'preview') ?? imageSrc;
        const statusRailClass = getEquipmentStatusRailClass(item.status);
        return (
          <div
            className={cn('relative flex min-h-16 h-full w-full items-center justify-center overflow-hidden bg-muted/30', imageSrc && 'cursor-zoom-in')}
            data-equipment-thumbnail
            data-equipment-image-src={imageHoverSrc || undefined}
            data-equipment-image-alt={imageSrc ? item.name : undefined}
            title={getEquipmentTableCellDisplayValue(item, 'status', settings)}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={`${item.name} equipment`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = '/images/ui/placeholder.svg';
                }}
              />
            ) : (
              <Forklift className="h-7 w-7 text-muted-foreground/55" aria-hidden="true" />
            )}
            {statusRailClass ? (
              <span
                className={cn('pointer-events-none absolute inset-y-0 left-0 z-0 w-1', statusRailClass)}
                aria-hidden="true"
              />
            ) : null}
            <DotStatus status={item.status} className="sr-only" />
          </div>
        );
      }
      case 'manufacturer': return <span className="block truncate">{item.manufacturer||'—'}</span>;
      case 'model': return <span className="block truncate">{item.model||'—'}</span>;
      case 'serial_number': return <span className="block truncate font-mono text-sm">{item.serial_number||'—'}</span>;
      case 'working_hours': return <span className="block truncate text-right tabular-nums">{item.working_hours!=null?item.working_hours.toLocaleString():'—'}</span>;
      case 'location': return <span className="block truncate">{item.location||'—'}</span>;
      case 'team_name': return item.team_id&&item.team_name?<Link to={`/dashboard/teams/${item.team_id}`} className="block truncate hover:text-primary" onClick={(e)=>e.stopPropagation()}>{item.team_name}</Link>:<span className="block truncate text-muted-foreground">—</span>;
      case 'last_maintenance': return <span className="block truncate text-right tabular-nums">{!item.last_maintenance?'—':(safeFormatDate(item.last_maintenance,settings)??'—')}</span>;
      case 'management_responsible_primary': return <span className="block truncate">{item.management_responsible_primary || '—'}</span>;
      case 'management_responsible_secondary': return <span className="block truncate">{item.management_responsible_secondary || '—'}</span>;
      default: { const exhaustive:never=columnKey; return exhaustive; }
    }}} as ColumnDef<EquipmentTableRow>; });
    const actionsColumn:ColumnDef<EquipmentTableRow>={id:EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY,size:56,minSize:56,maxSize:56,enableResizing:false,header:()=>null,cell:({row})=><div className="flex justify-end"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={()=>onShowQRCode(row.original.id)} aria-label={t('equipment.showQrFor',{name:row.original.name})}><QrCode className="h-4 w-4" aria-hidden="true" /></Button></div>};
    return [...dataColumns,actionsColumn];
  },[activeEquipmentId,beginTransition,handleSortClick,onShowQRCode,orderedVisibleColumnKeys,settings,sortConfig?.direction,sortConfig?.field,t]);
  const table=useReactTable({data:equipment,columns,state:{columnSizing},onColumnSizingChange:setColumnSizing,columnResizeMode:'onChange',enableColumnResizing:true,getCoreRowModel:getCoreRowModel()});
  const tableWidth=getResizableTableWidth(table.getTotalSize());
  if(equipment.length===0)return <DataTableEmptyState message={t('equipment.noTableMatches')} />;
  return <DndContext
    sensors={dndSensors}
    collisionDetection={closestCenter}
    onDragStart={handleDndDragStart}
    onDragEnd={handleDndDragEnd}
    onDragCancel={clearDndDrag}
  >
    <ResizableFixedDataTable table={table} tableWidth={tableWidth} columnDndItems={orderedVisibleColumnKeys} withTooltipProvider stickyHeader scrollClassName="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]" cardClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" contentClassName="flex min-h-0 min-w-0 flex-1 flex-col p-0" getHeaderProps={(header)=>{ const columnId=header.column.id; const isStatusColumn=columnId===STATUS_COLUMN_KEY; const isActionsColumn=columnId===EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY; const meta=isActionsColumn?undefined:getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey); const pinnedOffset=pinnedLeftOffsets.get(columnId as EquipmentTableColumnKey); const isPinned=pinnedOffset!==undefined; const isDragged=draggedColumnId===columnId; const reorderable=!isActionsColumn; return {className:cn(getDataTableAlignClass(meta?.align),meta?.mono&&'font-mono tabular-nums',isActionsColumn&&'w-14 px-2','relative select-none',reorderable&&'cursor-grab active:cursor-grabbing',isDragged&&'opacity-50',isPinned&&'sticky z-40 isolate bg-card',isPinned&&pinnedOffset===0&&'left-0',isStatusColumn&&'px-2'),style:isPinned?{left:pinnedOffset}:undefined,draggable:false,dataColumnKey:reorderable?columnId:undefined,ariaSort:meta?.sortable&&sortConfig?.field===meta.sortField?(sortConfig.direction==='asc'?'ascending':'descending'):'none',onAutoFit:isActionsColumn?undefined:()=>handleAutoFitColumn(columnId as EquipmentTableColumnKey)};}} getCellClassName={(cell)=>{ const columnId=cell.column.id; const isActionsColumn=columnId===EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY; const meta=isActionsColumn?undefined:getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey); const isPinned=pinnedLeftOffsets.has(columnId as EquipmentTableColumnKey); return cn(getDataTableAlignClass(meta?.align),meta?.mono&&'font-mono tabular-nums',isPinned&&'sticky z-30 isolate bg-card',isPinned&&pinnedLeftOffsets.get(columnId as EquipmentTableColumnKey)===0&&'left-0',isActionsColumn&&'w-14 px-2','overflow-hidden');}} getCellStyle={(cell)=>{ const pinnedOffset=pinnedLeftOffsets.get(cell.column.id as EquipmentTableColumnKey); return pinnedOffset===undefined?undefined:{left:pinnedOffset}; }} renderHeaderActions={(header)=>{ const rawColumnId=header.column.id; if(rawColumnId===EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY)return null; const columnId=rawColumnId as EquipmentTableColumnKey; return <EquipmentColumnHeaderMenu columnKey={columnId} visibleColumns={effectiveVisibleColumns} pinned={pinnedLeftOffsets.has(columnId)} onToggleColumn={handleToggleColumn} onTogglePin={handleTogglePin} onHideColumn={handleHideColumn} filterOptions={columnFilterOptions?.[columnId]} selectedFilterValues={getColumnFilterValues(columnId as EquipmentColumnFilterKey)} onColumnFilterChange={onColumnFilterChange} />;}} />
    <EquipmentImageHoverPreview hover={imageHover} visible={imageHoverVisible} />
    <DragOverlay dropAnimation={null}>
      {activeDndColumnId ? (
        <div className="min-w-36 max-w-64 rounded-lg border border-primary/40 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-2xl">
          {t(COLUMN_KEYS[activeDndColumnId])}
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>;
};
export default EquipmentTable;
