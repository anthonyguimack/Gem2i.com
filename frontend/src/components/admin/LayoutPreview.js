import React from 'react';
import { FileText, Layout, Square, Columns2, LayoutGrid, Layers, List, SlidersHorizontal, PanelRight, User, CreditCard, Image, Sidebar, Rocket } from 'lucide-react';
import { LAYOUTS } from '../../lib/layoutDefinitions';

export const LAYOUT_ICONS = {
  '': FileText, full_width: Layout, boxed: Square, split_screen: Columns2,
  about_bio: User,
  grid: LayoutGrid, masonry: Layers, list: List, carousel: SlidersHorizontal,
  two_column: PanelRight, three_column: Columns2, profile: User,
  card_based: CreditCard, hero_banner: Image, sidebar_layout: Sidebar, landing: Rocket,
  // Legacy (kept for backward compat in table display)
  layout_1: User, layout_2: LayoutGrid, layout_3: Image, layout_5: FileText,
};

// Legacy metadata kept only for backward compat labels in existing pages
export const LEGACY_LAYOUT_META = {
  layout_1: { label: 'About / Bio (Legacy)', desc: 'Image + text + social links' },
  layout_2: { label: 'Services Grid (Legacy)', desc: 'Auto-displays service cards' },
  layout_3: { label: 'Gallery Albums (Legacy)', desc: 'Auto-displays album grid' },
  layout_5: { label: 'Full Content (Legacy)', desc: 'Centered text column' },
};

export function getLayoutLabel(layout) {
  if (!layout) return 'Default';
  if (LAYOUTS[layout]) return LAYOUTS[layout].label;
  if (LEGACY_LAYOUT_META[layout]) return LEGACY_LAYOUT_META[layout].label;
  return layout;
}

export function LayoutPreview({ layoutKey }) {
  const z1 = "bg-[#0D9488]/25", z2 = "bg-blue-200/60", z3 = "bg-amber-200/60", z4 = "bg-purple-200/60";
  const previews = {
    '': <div className="w-full h-full flex flex-col gap-[2px] p-1"><div className={`h-1.5 w-3/4 ${z1} rounded-[1px]`}/><div className={`flex-1 ${z1} rounded-[1px]`}/></div>,
    full_width: <div className={`w-full h-full ${z1} rounded-[1px]`}/>,
    boxed: <div className="w-full h-full flex justify-center items-center"><div className={`w-3/4 h-4/5 ${z1} rounded-[1px]`}/></div>,
    split_screen: <div className="w-full h-full flex gap-[2px]"><div className={`w-1/2 ${z1} rounded-[1px]`}/><div className={`w-1/2 ${z2} rounded-[1px]`}/></div>,
    about_bio: <div className="w-full h-full flex gap-[2px]"><div className={`w-2/5 ${z2} rounded-[1px]`}/><div className={`w-3/5 ${z1} rounded-[1px]`}/></div>,
    grid: <div className="w-full h-full grid grid-cols-2 gap-[2px]"><div className={`${z1} rounded-[1px]`}/><div className={`${z2} rounded-[1px]`}/><div className={`${z3} rounded-[1px]`}/><div className={`${z4} rounded-[1px]`}/></div>,
    masonry: <div className="w-full h-full flex gap-[2px]"><div className="w-1/3 flex flex-col gap-[2px]"><div className={`h-3/5 ${z1} rounded-[1px]`}/><div className={`h-2/5 ${z2} rounded-[1px]`}/></div><div className="w-1/3 flex flex-col gap-[2px]"><div className={`h-2/5 ${z2} rounded-[1px]`}/><div className={`h-3/5 ${z1} rounded-[1px]`}/></div><div className="w-1/3 flex flex-col gap-[2px]"><div className={`h-1/2 ${z1} rounded-[1px]`}/><div className={`h-1/2 ${z2} rounded-[1px]`}/></div></div>,
    list: <div className="w-full h-full flex flex-col gap-[2px]"><div className={`h-1/3 ${z1} rounded-[1px]`}/><div className={`h-1/3 ${z1} rounded-[1px]`}/><div className={`h-1/3 ${z1} rounded-[1px]`}/></div>,
    carousel: <div className="w-full h-full flex items-center gap-[2px]"><div className={`w-1/3 h-4/5 ${z1} rounded-[1px]`}/><div className={`w-1/3 h-4/5 ${z1} rounded-[1px]`}/><div className={`w-1/3 h-4/5 ${z1} rounded-[1px]`}/></div>,
    two_column: <div className="w-full h-full flex gap-[2px]"><div className={`w-2/3 ${z1} rounded-[1px]`}/><div className={`w-1/3 ${z2} rounded-[1px]`}/></div>,
    three_column: <div className="w-full h-full flex gap-[2px]"><div className={`w-1/3 ${z1} rounded-[1px]`}/><div className={`w-1/3 ${z2} rounded-[1px]`}/><div className={`w-1/3 ${z3} rounded-[1px]`}/></div>,
    profile: <div className="w-full h-full flex gap-[2px]"><div className={`w-1/4 ${z2} rounded-[1px]`}/><div className={`w-3/4 ${z1} rounded-[1px]`}/></div>,
    card_based: <div className="w-full h-full grid grid-cols-3 gap-[2px]">{[1,2,3,4,5,6].map(i=><div key={i} className={`${z1} rounded-[1px]`}/>)}</div>,
    hero_banner: <div className="w-full h-full flex flex-col gap-[2px]"><div className={`h-2/5 ${z2} rounded-[1px]`}/><div className={`h-3/5 ${z1} rounded-[1px]`}/></div>,
    sidebar_layout: <div className="w-full h-full flex gap-[2px]"><div className={`w-1/4 ${z2} rounded-[1px]`}/><div className={`w-3/4 ${z1} rounded-[1px]`}/></div>,
    landing: <div className="w-full h-full flex flex-col gap-[2px]"><div className={`h-1/3 ${z2} rounded-[1px]`}/><div className={`h-1/3 ${z1} rounded-[1px]`}/><div className={`h-1/3 ${z3} rounded-[1px]`}/></div>,
    // Legacy previews (backward compat for existing pages)
    layout_1: <div className="w-full h-full flex gap-[2px]"><div className={`w-2/5 ${z2} rounded-[1px]`}/><div className={`w-3/5 ${z1} rounded-[1px]`}/></div>,
    layout_2: <div className="w-full h-full grid grid-cols-2 gap-[2px]">{[1,2,3,4].map(i=><div key={i} className={`${z1} rounded-[1px]`}/>)}</div>,
    layout_3: <div className="w-full h-full grid grid-cols-3 gap-[2px]">{[1,2,3].map(i=><div key={i} className={`${z1} rounded-[1px]`}/>)}</div>,
    layout_5: <div className="w-full h-full flex justify-center"><div className={`w-3/4 h-full ${z1} rounded-[1px]`}/></div>,
  };
  return <div className="w-full h-10 bg-slate-100 rounded overflow-hidden">{previews[layoutKey] || <div className={`w-full h-full ${z1}`}/>}</div>;
}
