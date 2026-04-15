import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@direct-frontend/components';
import { IconGridAdd } from '@direct-frontend/components/icons/colorless/Layout/GridAdd';
import './WidgetCanvas.css';

export interface WidgetRow {
  id: string;
  widgetIds: string[];
  type: 'regular' | 'mini';
}

export interface WidgetCanvasProps {
  rows: WidgetRow[];
  widgetMap: Record<string, ReactNode>;
  widgetTypes: Record<string, 'regular' | 'mini'>;
  onChange: (rows: WidgetRow[]) => void;
  onAdd?: () => void;
}

// ─── DraggableWidget ───────────────────────────────────────────────────────
function DraggableWidget({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  // Inject drag handle props into the child Widget via cloneElement
  const child = React.Children.only(children) as React.ReactElement<{
    dragHandleListeners?: Record<string, unknown>;
    dragHandleAttributes?: Record<string, unknown>;
  }>;
  const childWithHandle = React.cloneElement(child, {
    dragHandleListeners: listeners as Record<string, unknown>,
    dragHandleAttributes: attributes as Record<string, unknown>,
  });

  return (
    <div
      ref={setNodeRef}
      className="widget-canvas__widget"
      style={{
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {childWithHandle}
    </div>
  );
}

// ─── WidgetDropHalf ────────────────────────────────────────────────────────
// Covers left or right half of a widget — drop target for inserting before/after.
// Each half has a unique ID to avoid dnd-kit collisions.
function WidgetDropHalf({
  rowId,
  widgetIndex,
  side,
}: {
  rowId: string;
  widgetIndex: number;
  side: 'left' | 'right';
}) {
  const id = `widget-${side}:${rowId}:${widgetIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={[
        'widget-canvas__drop-half',
        `widget-canvas__drop-half--${side}`,
        isOver ? 'widget-canvas__drop-half--over' : '',
      ].join(' ')}
    />
  );
}

// ─── BetweenRowsZone ───────────────────────────────────────────────────────
function BetweenRowsZone({
  index,
  active,
  onAdd,
}: {
  index: number;
  active: boolean;
  onAdd?: () => void;
}) {
  const id = `new-row:${index}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isHovered, setIsHovered] = useState(false);
  const [buttonX, setButtonX] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      containerRef.current = node;
    },
    [setNodeRef]
  );

  // Глобальный трекинг — кнопка перекрывает зону, поэтому onMouseMove на div не работает
  useEffect(() => {
    if (!isHovered) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setButtonX(Math.max(64, Math.min(x, rect.width - 64)));
    };
    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [isHovered]);

  const showAdd = isHovered && !active;

  return (
    <div
      ref={mergedRef}
      className={[
        'widget-canvas__between-zone',
        active ? 'widget-canvas__between-zone--active' : '',
        isOver ? 'widget-canvas__between-zone--over' : '',
        showAdd ? 'widget-canvas__between-zone--hovering' : '',
      ].join(' ')}
      onMouseEnter={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setButtonX(Math.max(64, Math.min(e.clientX - rect.left, rect.width - 64)));
        }
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showAdd && (
        <>
          <div className="widget-canvas__add-line" />
          <div className="widget-canvas__add-btn-wrap" style={{ left: buttonX }}>
            <Button
              color="contour"
              size="2xs"
              iconLeft={IconGridAdd}
              className="widget-canvas__add-btn"
              onClick={onAdd}
            >
              Добавить
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── RowComponent ──────────────────────────────────────────────────────────
function RowComponent({
  row,
  widgetMap,
  draggingId,
  draggingSourceRowId,
  draggingType,
}: {
  row: WidgetRow;
  widgetMap: Record<string, ReactNode>;
  draggingId: string | null;
  draggingSourceRowId: string | null;
  draggingType: 'regular' | 'mini' | null;
}) {
  const isDragging = draggingId !== null;
  const maxPerRow = row.type === 'mini' ? 6 : 3;

  const widgetsAfterRemoval =
    draggingSourceRowId === row.id
      ? row.widgetIds.filter(id => id !== draggingId)
      : row.widgetIds;

  // Accept only if: same widget type, row not full
  const canAcceptSlot =
    isDragging &&
    draggingType === row.type &&
    widgetsAfterRemoval.length < maxPerRow;

  return (
    <div className={`widget-canvas__row${row.type === 'mini' ? ' widget-canvas__row--mini' : ''}`}>
      {row.widgetIds.map((wid, i) => (
        <div key={wid} className="widget-canvas__widget-wrapper">
          {/* Left half → insert before this widget */}
          {canAcceptSlot && (
            <WidgetDropHalf rowId={row.id} widgetIndex={i} side="left" />
          )}
          {/* Right half → insert after this widget */}
          {canAcceptSlot && (
            <WidgetDropHalf rowId={row.id} widgetIndex={i} side="right" />
          )}
          <DraggableWidget id={wid}>{widgetMap[wid]}</DraggableWidget>
        </div>
      ))}
    </div>
  );
}

// ─── WidgetCanvas ──────────────────────────────────────────────────────────
export function WidgetCanvas({ rows, widgetMap, widgetTypes, onChange, onAdd }: WidgetCanvasProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingSourceRowId, setDraggingSourceRowId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findRowByWidgetId = (id: string) => rows.find(r => r.widgetIds.includes(id));

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    setDraggingId(id);
    setDraggingSourceRowId(findRowByWidgetId(id)?.id ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    setDraggingSourceRowId(null);
    if (!over) return;

    const widgetId = String(active.id);
    const overId = String(over.id);
    const sourceRow = findRowByWidgetId(widgetId);
    if (!sourceRow) return;

    let newRows = rows.map(r => ({ ...r, widgetIds: [...r.widgetIds] }));

    const srcIdx = newRows.findIndex(r => r.id === sourceRow.id);
    newRows[srcIdx].widgetIds = newRows[srcIdx].widgetIds.filter(id => id !== widgetId);

    if (overId.startsWith('new-row:')) {
      let pos = parseInt(overId.split(':')[1], 10);
      if (srcIdx < pos) pos = Math.max(0, pos - 1);
      const newRow: WidgetRow = {
        id: `row-${Date.now()}`,
        widgetIds: [widgetId],
        type: widgetTypes[widgetId] ?? 'regular',
      };
      newRows.splice(pos, 0, newRow);
    } else if (overId.startsWith('widget-left:') || overId.startsWith('widget-right:')) {
      // widget-left:rowId:widgetIndex  → insert before widgetIndex
      // widget-right:rowId:widgetIndex → insert after widgetIndex (= before widgetIndex+1)
      const parts = overId.split(':');
      const side = parts[0] === 'widget-left' ? 'left' : 'right';
      const targetRowId = parts[1];
      const widgetIdx = parseInt(parts[2], 10);
      const slotIndex = side === 'left' ? widgetIdx : widgetIdx + 1;

      const targetIdx = newRows.findIndex(r => r.id === targetRowId);
      if (targetIdx !== -1) {
        newRows[targetIdx].widgetIds.splice(slotIndex, 0, widgetId);
      }
    }

    newRows = newRows.filter(r => r.widgetIds.length > 0);
    onChange(newRows);
  };

  const isDragging = draggingId !== null;
  const draggingType = draggingId ? (widgetTypes[draggingId] ?? 'regular') : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="widget-canvas">
        <BetweenRowsZone index={0} active={isDragging} onAdd={onAdd} />

        {rows.map((row, rowIndex) => (
          <React.Fragment key={row.id}>
            <RowComponent
              row={row}
              widgetMap={widgetMap}
              draggingId={draggingId}
              draggingSourceRowId={draggingSourceRowId}
              draggingType={draggingType}
            />
            <BetweenRowsZone index={rowIndex + 1} active={isDragging} onAdd={onAdd} />
          </React.Fragment>
        ))}
      </div>

      <DragOverlay>
        {draggingId && (
          <div className="widget-canvas__drag-overlay">
            {widgetMap[draggingId]}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
