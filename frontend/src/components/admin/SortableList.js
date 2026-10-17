/**
 * Lista genérica arrastrable del CMS — PRIMITIVO COMPARTIDO ("ORDENAR").
 *
 * El estándar de la casa para reordenar es dnd-kit con una manija GripVertical
 * (extraído verbatim de EnrollmentFieldsManager / SortableFieldRow). Aquellas
 * listas cuyas filas NO son "campos" (slugs, categorías, quick links, opciones…)
 * antes reinventaban con botones de flecha ▲▼, saliéndose del estándar. Este
 * primitivo cierra ese hueco: cualquier "ordenar" nuevo se resuelve importándolo.
 *
 * Uso:
 *   <SortableList
 *     items={rows}                         // array en el orden actual
 *     getId={(r) => r.slug}                // id ESTABLE y único por fila
 *     onReorder={(next) => setRows(next)}  // recibe el array ya reordenado
 *     renderItem={(r, i) => <…fila…/>}      // solo el CONTENIDO (la manija la pone el primitivo)
 *     testPrefix="kms-cats"
 *   />
 *
 * Mantén la misma manija/lógica que enrollment — NO uses flechas ▲▼ para ordenar.
 */
import React from 'react';
import { GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ id, testId, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2" data-testid={testId}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 flex-shrink-0 touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-slate-300" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function SortableList({ items, getId, onReorder, renderItem, testPrefix = 'sortable' }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = (items || []).map(getId);
  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {(items || []).map((item, i) => (
          <SortableRow key={getId(item)} id={getId(item)} testId={`${testPrefix}-row-${getId(item)}`}>
            {renderItem(item, i)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
