import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from 'lucide-react';
import { flexRender, type Cell, type Header, type Table as TanStackTable } from '@tanstack/react-table';
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type DragEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function DataTableSortableHeaderButton({
  title,
  align,
  active,
  sortOrder,
  onClick,
  hideVisibleTitle = false,
}: {
  title: string;
  align?: 'left' | 'right' | 'center';
  active: boolean;
  sortOrder?: 'asc' | 'desc';
  onClick: () => void;
  hideVisibleTitle?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-1 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
        !align || align === 'left' ? 'justify-start' : undefined,
      )}
      onClick={onClick}
      aria-label={`Sort by ${title}`}
    >
      {hideVisibleTitle ? <span className="sr-only">{title}</span> : <span>{title}</span>}
      <DataTableSortIcon active={active} sortOrder={sortOrder} />
    </button>
  );
}

export function DataTableStaticHeaderLabel({ title }: { title: string }) {
  return <span className="block w-full text-xs font-medium text-muted-foreground">{title}</span>;
}

/** Props that `ResizableFixedDataTable` forwards unchanged to `ResizableTableSurface`. */
type ResizableTableSharedProps<TData> = {
  table: TanStackTable<TData>;
  tableWidth: number;
  scrollClassName?: string;
  stickyHeader?: boolean;
  getHeaderProps: (header: Header<TData, unknown>) => {
    className: string;
    ariaSort?: 'ascending' | 'descending' | 'none';
    onAutoFit?: () => void;
    style?: CSSProperties;
    draggable?: boolean;
    onDragStart?: DragEventHandler<HTMLTableCellElement>;
    onDragOver?: DragEventHandler<HTMLTableCellElement>;
    onDrop?: DragEventHandler<HTMLTableCellElement>;
    onDragEnd?: DragEventHandler<HTMLTableCellElement>;
    onPointerDown?: PointerEventHandler<HTMLTableCellElement>;
    dataColumnKey?: string;
  };
  getCellClassName: (cell: Cell<TData, unknown>) => string;
  getCellStyle?: (cell: Cell<TData, unknown>) => CSSProperties | undefined;
  renderHeaderActions?: (header: Header<TData, unknown>) => ReactNode;
  columnDndItems?: string[];
};

type ResizableTableSurfaceProps<TData> = ResizableTableSharedProps<TData> & {
  getRowClassName?: (rowIndex: number) => string | undefined;
  emptyMessage?: string;
  emptyColSpan?: number;
  emptyCellClassName?: string;
};

function applyHeaderDragPreview(event: ReactDragEvent<HTMLElement>) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const source = event.currentTarget;
  const headerCell = source.closest('th');
  const sourceRect = source.getBoundingClientRect();
  const preview = source.cloneNode(true) as HTMLElement;
  const computed = window.getComputedStyle(headerCell ?? source);
  const previewWidth = Math.min(Math.max(sourceRect.width, 120), 360);
  const previewHeight = Math.max(sourceRect.height, 40);

  preview.querySelectorAll('[data-table-column-options], [data-slot="column-resize-handle"]').forEach((node) => node.remove());
  preview.removeAttribute('draggable');
  preview.setAttribute('aria-hidden', 'true');
  preview.setAttribute('data-table-column-drag-preview', '');
  preview.style.position = 'fixed';
  preview.style.left = '-10000px';
  preview.style.top = '-10000px';
  preview.style.width = `${previewWidth}px`;
  preview.style.height = `${previewHeight}px`;
  preview.style.boxSizing = 'border-box';
  preview.style.display = 'flex';
  preview.style.alignItems = 'center';
  preview.style.overflow = 'hidden';
  preview.style.whiteSpace = 'nowrap';
  preview.style.padding = '8px 12px';
  preview.style.backgroundColor = computed.backgroundColor;
  preview.style.color = computed.color;
  preview.style.fontFamily = computed.fontFamily;
  preview.style.fontSize = computed.fontSize;
  preview.style.fontWeight = computed.fontWeight;
  preview.style.border = '1px solid rgba(148, 163, 184, 0.35)';
  preview.style.borderRadius = '8px';
  preview.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.24)';
  preview.style.opacity = '0.96';
  preview.style.pointerEvents = 'none';
  preview.style.zIndex = '99999';

  document.body.appendChild(preview);

  const nativeEvent = event.nativeEvent;
  const requestedOffsetX = Number.isFinite(nativeEvent.offsetX) ? nativeEvent.offsetX : previewWidth / 2;
  const requestedOffsetY = Number.isFinite(nativeEvent.offsetY) ? nativeEvent.offsetY : previewHeight / 2;
  const offsetX = Math.max(12, Math.min(requestedOffsetX, previewWidth - 12));
  const offsetY = Math.max(8, Math.min(requestedOffsetY, previewHeight - 8));
  if (typeof event.dataTransfer.setDragImage === 'function') {
    event.dataTransfer.setDragImage(preview, offsetX, offsetY);
  }

  window.setTimeout(() => preview.remove(), 0);
}

export function ResizableTableSurface<TData>({
  table,
  tableWidth,
  scrollClassName = 'overflow-x-auto',
  stickyHeader = false,
  getHeaderProps,
  getCellClassName,
  getCellStyle,
  renderHeaderActions,
  columnDndItems,
  getRowClassName,
  emptyMessage,
  emptyColSpan,
  emptyCellClassName,
}: ResizableTableSurfaceProps<TData>) {
  const rows = table.getRowModel().rows;
  const [draggedHeaderId, setDraggedHeaderId] = useState<string | null>(null);
  const [dragOverHeaderId, setDragOverHeaderId] = useState<string | null>(null);

  return (
    <div className={scrollClassName}>
      <SortableContext items={columnDndItems ?? []} strategy={horizontalListSortingStrategy}>
      <Table
        withWrapper={false}
        className="table-fixed"
        style={{ width: tableWidth, minWidth: '100%' }}
      >
        <colgroup>
          {table.getHeaderGroups()[0]?.headers.map((header) => (
            <col key={header.id} style={{ width: header.getSize() }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const {
                  className,
                  ariaSort,
                  onAutoFit,
                  style,
                  draggable,
                  onDragStart,
                  onDragOver,
                  onDrop,
                  onDragEnd,
                  onPointerDown,
                  dataColumnKey,
                } = getHeaderProps(header);
                const hasPinnedOffset = stickyHeader && style?.left !== undefined;
                const resolvedHeaderStyle = stickyHeader
                  ? { ...style, zIndex: hasPinnedOffset ? 50 : 40 }
                  : style;
                const resolvedDraggable = Boolean(onDragStart || draggable);
                const dndEnabled = Boolean(dataColumnKey && columnDndItems?.includes(dataColumnKey));
                const resolvedPointerDown: PointerEventHandler<HTMLTableCellElement> | undefined = onPointerDown;
                const isDragSource = draggedHeaderId === header.id;
                const isDropTarget = dragOverHeaderId === header.id && draggedHeaderId !== header.id;

                const startDragFromCell: DragEventHandler<HTMLTableCellElement> | undefined = onDragStart
                  ? (event) => {
                      applyHeaderDragPreview(event);
                      setDraggedHeaderId(header.id);
                      setDragOverHeaderId(null);
                      onDragStart(event);
                    }
                  : undefined;

                const endDragFromCell: DragEventHandler<HTMLTableCellElement> | undefined = resolvedDraggable
                  ? (event) => {
                      setDraggedHeaderId(null);
                      setDragOverHeaderId(null);
                      onDragEnd?.(event);
                    }
                  : undefined;

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      stickyHeader ? cn(className, 'sticky top-0 bg-card') : className,
                      resolvedDraggable && 'transition-[opacity,box-shadow] duration-150',
                      isDragSource && 'opacity-55',
                      isDropTarget && 'ring-2 ring-inset ring-primary/70',
                    )}
                    aria-sort={ariaSort ?? 'none'}
                    style={resolvedHeaderStyle}
                    // Reordering is pointer-driven so it works when the sortable title
                    // button is inside the header. The menu stops propagation at its trigger.
                    draggable={false}
                    onDragStart={dndEnabled ? undefined : startDragFromCell}
                    onDragOver={dndEnabled ? undefined : (
                      onDragOver
                        ? (event) => {
                            setDragOverHeaderId(header.id);
                            onDragOver(event);
                          }
                        : undefined
                    )}
                    onDrop={dndEnabled ? undefined : (
                      onDrop
                        ? (event) => {
                            setDraggedHeaderId(null);
                            setDragOverHeaderId(null);
                            onDrop(event);
                          }
                        : undefined
                    )}
                    onDragEnd={dndEnabled ? undefined : endDragFromCell}
                    onPointerDown={dndEnabled ? undefined : resolvedPointerDown}
                    {...(dataColumnKey ? { 'data-table-column-key': dataColumnKey } : {})}
                  >
                    <div className="group relative min-h-8 min-w-0 pr-6">
                      {dndEnabled ? (
                        <DataTableDndHeaderSurface id={dataColumnKey!}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </DataTableDndHeaderSurface>
                      ) : (
                        <div
                          className={cn(
                            'min-h-8 min-w-0',
                            resolvedDraggable && 'cursor-grab active:cursor-grabbing touch-none',
                          )}
                          draggable={false}
                          {...(dataColumnKey ? { 'data-table-column-drag-surface': dataColumnKey } : {})}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      )}
                      {renderHeaderActions?.(header)}
                    </div>
                    <DataTableColumnResizeHandle header={header} onAutoFit={onAutoFit} />
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {emptyMessage && rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={emptyColSpan ?? table.getAllColumns().length}
                className={emptyCellClassName}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={row.id} className={getRowClassName?.(rowIndex)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={getCellClassName(cell)} style={getCellStyle?.(cell)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </SortableContext>
    </div>
  );
}

function DataTableDndHeaderSurface({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative min-h-8 min-w-0',
        isDragging && 'opacity-45',
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-table-column-drag-surface={id}
    >
      {children}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="absolute right-6 top-1/2 z-10 flex h-6 w-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-sm text-muted-foreground/70 hover:bg-accent hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${id} column`}
        data-table-column-drag-handle={id}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

type ResizableFixedDataTableProps<TData> = ResizableTableSharedProps<TData> & {
  withTooltipProvider?: boolean;
  cardClassName?: string;
  contentClassName?: string;
};

export function ResizableFixedDataTable<TData>({
  table,
  tableWidth,
  withTooltipProvider = false,
  scrollClassName = 'overflow-x-auto',
  cardClassName = 'overflow-hidden',
  contentClassName = 'p-0',
  stickyHeader = false,
  getHeaderProps,
  getCellClassName,
  getCellStyle,
  renderHeaderActions,
  columnDndItems,
}: ResizableFixedDataTableProps<TData>) {
  const content = (
    <Card className={cardClassName}>
      <CardContent className={contentClassName}>
        <ResizableTableSurface
          table={table}
          tableWidth={tableWidth}
          scrollClassName={scrollClassName}
          stickyHeader={stickyHeader}
          getHeaderProps={getHeaderProps}
          getCellClassName={getCellClassName}
          getCellStyle={getCellStyle}
          renderHeaderActions={renderHeaderActions}
          columnDndItems={columnDndItems}
        />
      </CardContent>
    </Card>
  );

  if (withTooltipProvider) {
    return <TooltipProvider>{content}</TooltipProvider>;
  }

  return content;
}

export function DataTableSortIcon({
  active,
  sortOrder,
}: {
  active: boolean;
  sortOrder?: 'asc' | 'desc';
}) {
  if (!active) {
    return <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />;
  }

  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
  );
}

type DataTableColumnResizeHandleProps<THeader> = {
  header: Header<THeader, unknown>;
  onAutoFit?: () => void;
  className?: string;
};

export function DataTableColumnResizeHandle<THeader>({
  header,
  onAutoFit,
  className,
}: DataTableColumnResizeHandleProps<THeader>) {
  if (!header.column.getCanResize()) {
    return null;
  }

  return (
    <div
      data-slot="column-resize-handle"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        header.getResizeHandler()(event);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onTouchStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
        header.getResizeHandler()(event);
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={
        onAutoFit
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              onAutoFit();
            }
          : undefined
      }
      className={cn(
        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none',
        onAutoFit ? 'bg-border/45 hover:bg-border/80' : 'w-1 hover:bg-border/80',
        header.column.getIsResizing() && 'bg-primary',
        className,
      )}
      aria-hidden
    />
  );
}

export function DataTableEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
