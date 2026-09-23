/**
 * Fila arrastrable de un editor de campos del CMS — COMPARTIDA.
 *
 * Extraída VERBATIM de EnrollmentFieldsManager (el estándar aprobado) para que
 * Membership Enrollment y Mentoring System usen exactamente el mismo componente
 * y la misma lógica de drag & drop, en vez de dos filas casi iguales que se
 * desincronizan. El `testPrefix` deja que cada módulo conserve sus data-testid.
 */
import React from 'react';
import { Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableFieldRow({ field: f, onEdit, onDelete, onToggleVisibility, testPrefix = 'ef' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors bg-white" data-testid={`${testPrefix}-row-${f.field_key}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 flex-shrink-0 touch-none" data-testid={`${testPrefix}-drag-${f.field_key}`}>
        <GripVertical className="w-4 h-4 text-slate-300" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: f.visible ? 'var(--ad-heading, #1a2332)' : '#9ca3af' }}>{f.label}</p>
        <p className="text-xs text-slate-400">{f.field_key} &middot; {f.field_type}{f.required ? ' · required' : ''}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onToggleVisibility(f)} className={`p-1.5 rounded hover:bg-slate-100 ${f.visible ? 'text-slate-500' : 'text-slate-300'}`} title={f.visible ? 'Hide' : 'Show'} data-testid={`${testPrefix}-vis-${f.field_key}`}>
          {f.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => onEdit(f)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Edit" data-testid={`${testPrefix}-edit-${f.field_key}`}>
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(f)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete" data-testid={`${testPrefix}-del-${f.field_key}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
