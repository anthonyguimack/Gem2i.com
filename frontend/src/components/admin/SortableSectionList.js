import React from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Switch } from '../ui/switch';

/**
 * HOUSE RULE (2026-10-19, Anthony): every "order these blocks" control in the
 * CMS uses this component — the Page Builder (/admin/section-order) pattern:
 * drag handle (mouse or keyboard), label + key, eye icon + switch to show/hide.
 * No up/down arrows, no other ordering widgets.
 *
 * items:     [{ key, visible }]           (order = array order)
 * defs:      { [key]: { label, hint } }   (hint shown under the label)
 * onChange:  (nextItems) => void
 * renderExtra(item) → optional per-row editor (shown under the row)
 */
function Row({ item, def, onToggle, extra }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-3 border rounded-sm p-4 mb-2 bg-white ${isDragging ? 'shadow-lg relative z-10 border-slate-300' : 'border-slate-100'}`}
      data-testid={`sortable-item-${item.key}`}>
      <div className="flex items-center gap-3">
        <button type="button" {...attributes} {...listeners} aria-label={`Drag to reorder ${def?.label || item.key}`}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${item.visible ? 'text-[#1a2332]' : 'text-slate-400'}`}>{def?.label || item.key}</p>
          <p className="text-xs text-slate-400">{def?.hint || <span className="font-mono">{item.key}</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          {item.visible ? <Eye className="w-4 h-4 text-[#0D9488]" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
          <Switch checked={!!item.visible} onCheckedChange={onToggle} data-testid={`sortable-toggle-${item.key}`} />
        </div>
      </div>
      {extra && <div className="pl-8">{extra}</div>}
    </div>
  );
}

export default function SortableSectionList({ items, defs = {}, onChange, renderExtra }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(i => i.key === active.id);
    const to = items.findIndex(i => i.key === over.id);
    onChange(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(i => i.key)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <Row key={item.key} item={item} def={defs[item.key]}
            onToggle={() => onChange(items.map(i => (i.key === item.key ? { ...i, visible: !i.visible } : i)))}
            extra={renderExtra ? renderExtra(item) : null} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
