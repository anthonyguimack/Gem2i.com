import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Type, Image, Video, Briefcase, Images, User, MousePointerClick, Minus, Code, Quote, Newspaper, BookOpen, Map } from 'lucide-react';
import { BLOCK_TYPES } from '../../lib/layoutDefinitions';

export const BLOCK_ICONS = {
  rich_text: Type, image: Image, video: Video, service_list: Briefcase,
  gallery: Images, gallery_albums: Images, blog_posts: Newspaper, reading_list: BookOpen,
  profile_card: User, button: MousePointerClick, separator: Minus, custom_html: Code,
  legends_testimonials: Quote, map_global: Map, map_conferences: Map, map_recommended: Map,
};

export function SortableBlock({ block, zoneId, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const BlockIcon = BLOCK_ICONS[block.type] || Type;
  const typeDef = BLOCK_TYPES[block.type];

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-2 bg-white border rounded px-3 py-2.5 group transition-colors ${isDragging ? 'border-[#0D9488] shadow-lg z-10' : 'border-slate-200 hover:border-[#0D9488]/30'}`}
      data-testid={`block-${block.id}`}
    >
      <button className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 hover:text-slate-500 touch-none" {...attributes} {...listeners} data-testid={`drag-handle-${block.id}`}>
        <GripVertical className="w-4 h-4" />
      </button>
      <BlockIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-700">{typeDef?.label || block.type}</span>
        {block.type === 'rich_text' && block.config?.content && (
          <p className="text-xs text-slate-400 truncate">{block.config.content.replace(/<[^>]*>/g, '').substring(0, 60)}</p>
        )}
        {block.type === 'image' && block.config?.alt && (
          <p className="text-xs text-slate-400 truncate">{block.config.alt}</p>
        )}
        {block.type === 'button' && (
          <p className="text-xs text-slate-400 truncate">{block.config?.text || 'Button'}</p>
        )}
        {block.type === 'profile_card' && block.config?.name && (
          <p className="text-xs text-slate-400 truncate">{block.config.name}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!['service_list', 'gallery', 'gallery_albums', 'blog_posts', 'reading_list', 'legends_testimonials', 'map_global', 'map_conferences', 'map_recommended'].includes(block.type) && (
          <button onClick={() => onEdit(block)} className="p-1 text-slate-300 hover:text-[#0D9488]" data-testid={`edit-block-${block.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
        )}
        <button onClick={() => onDelete(block.id)} className="p-1 text-slate-300 hover:text-red-500" data-testid={`delete-block-${block.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
